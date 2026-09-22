import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
import {localDatabaseUrl} from '../../scripts/local-target';
import {developmentPages} from '../../fixtures/public-content';
async function main(){
 const sql=postgres(localDatabaseUrl(),{max:1,onnotice:()=>{}});
 const runtimeUrl=readFileSync('.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)![1];
 const runtime=new URL(runtimeUrl);assert.equal(runtime.hostname,'127.0.0.1');assert.equal(runtime.username,'app_web');
 const web=postgres(runtimeUrl,{max:1,onnotice:()=>{}});let checks=0;
 const check=(v:unknown,label:string)=>{assert.ok(v,label);checks++;console.log(`PASS ${label}`);};
 const reject=async(fn:()=>Promise<unknown>,code:string,label:string)=>{await assert.rejects(fn,e=>(e as {code:string}).code===code,label);checks++;console.log(`PASS ${label}`);};
 try{
  check((await sql`select count(*)::int n from information_schema.tables where table_schema='app' and table_type='BASE TABLE'`)[0].n===9,'exactly nine DEV-01 and DEV-02 application entities');
  check((await sql`select count(*)::int n from app.public_pages`)[0].n===9,'exactly nine page identities');
  check((await sql`select count(*)::int n from app.application_profiles`)[0].n===0,'no provisioned profiles');
  for(const key of Object.keys(developmentPages)) for(const locale of ['ar','fr','en']){
   const [page]=await web`select * from app.read_public_page(${key},${locale})`;
   check(page && Object.keys(page).sort().join(',')==='body,title',`${key}/${locale} safe projection`);
  }
  for(const table of ['application_profiles','audit_events','public_pages','public_page_versions','public_page_translations','commune_settings','commune_settings_translations']){
   await reject(()=>web.unsafe(`select * from app.${table}`),'42501',`runtime cannot read raw ${table}`);
   await reject(()=>web.unsafe(`delete from app.${table}`),'42501',`runtime cannot delete ${table}`);
  }
  await reject(()=>web`update app.public_pages set current_version=1`,'42501','runtime cannot change publication pointer');
  await reject(()=>web`update app.commune_settings set contact_email='bad@example.invalid'`,'42501','runtime cannot mutate settings');
  await reject(()=>web`select app.publish_development_page('HOME',1,'{}')`,'42501','runtime cannot publish');
  await reject(()=>web`select app.configure_development_settings(0,null,null,'https://chikaya.ma/','{}')`,'42501','runtime cannot invoke settings writer');
  await reject(()=>web`set role app_writer`,'42501','runtime cannot assume writer');
  await reject(()=>web`set role app_reader`,'42501','runtime cannot assume reader');
  await reject(()=>web`create table app.unapproved(id int)`,'42501','runtime cannot create arbitrary entities');
  check((await web`select * from app.read_public_page('ADMIN','en')`).length===0,'unknown page cannot bypass fixed keys');
  check((await web`select * from app.read_public_page('HOME','es')`).length===0,'missing language never falls back');
  const [settings]=await web`select * from app.read_public_settings('en')`;
  check(Object.keys(settings).sort().join(',')==='chikaya_url,commune_name,contact_email,contact_phone,opening_hours,public_address','settings exposes only public fields');
  for(const role of ['anon','authenticated','service_role']){
   check(!(await sql`select has_schema_privilege(${role},'app','USAGE') allowed`)[0].allowed,`${role} has no application schema access`);
  }
  await reject(()=>sql.begin(async tx=>{
   const [p]=await tx`select * from app.public_pages where page_key='HOME' for update`;
   const [audit]=await tx`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values('SYSTEM','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',${p.id},'{"source":"LOCAL_DEVELOPMENT_FIXTURE"}') returning id`;
   const [v]=await tx`insert into app.public_page_versions(page_id,version_number,audit_event_id) values(${p.id},${p.current_version+1},${audit.id}) returning id`;
   await tx`insert into app.public_page_translations(version_id,language,title,body) values(${v.id},'ar','Test','Test'),(${v.id},'en','Test','Test')`;
   await tx`update app.public_pages set current_version=current_version+1,revision=revision+1 where id=${p.id}`;
  }),'23514','deferred constraint rejects incomplete committed bundle');
  await reject(()=>sql.begin(async tx=>{
   await tx`update app.public_pages set current_version=current_version+1,revision=revision+1 where page_key='HOME'`;
  }),'23503','current pointer requires same-page version');
  await reject(()=>sql.begin(async tx=>{
   await tx`update app.commune_settings set revision=revision+1`;
  }),'23514','settings mutation without same-transaction audit rejected');
  const [version]=await sql`select * from app.public_page_versions limit 1`;
  await reject(()=>sql`insert into app.public_page_versions(page_id,version_number,audit_event_id) values(${version.page_id},99,${version.audit_event_id})`,'23505','audit event cannot be reused by another publication');
  await sql.begin(async tx=>{
   await tx`grant app_web to postgres`;
   const [home]=await tx`select * from app.public_pages where page_key='HOME' for update`;
   await reject(()=>tx.savepoint(t=>t`select app.publish_development_page('HOME',${home.revision},'{}')`),'23514','incomplete publication rejected');
   await reject(()=>tx.savepoint(t=>t`select app.publish_development_page('HOME',0,${t.json(developmentPages.HOME)})`),'40001','stale publication rejected');
   await reject(()=>tx.savepoint(t=>t`update app.public_pages set current_version=null,revision=revision+1 where id=${home.id}`),'23514','cannot clear published pointer');
   await reject(()=>tx.savepoint(t=>t`update app.public_page_translations set body='changed'`),'23514','published translations immutable');
   await reject(()=>tx.savepoint(t=>t`update app.public_page_versions set published_at=now()`),'23514','published version immutable');
   await reject(()=>tx.savepoint(t=>t`insert into app.public_pages(page_key) values('ARBITRARY')`),'23514','arbitrary page identity rejected');
   await reject(()=>tx.savepoint(t=>t`insert into app.commune_settings(chikaya_url) values('https://chikaya.ma/')`),'23505','settings singleton enforced');
   for(const url of ['http://chikaya.ma/','javascript:alert(1)','/https://chikaya.ma/','https://user@chikaya.ma/','https://chikaya.ma.evil.test/']){
    await reject(()=>tx.savepoint(t=>t`update app.commune_settings set chikaya_url=${url},revision=revision+1`),'23514',`invalid guidance configuration rejected: ${url}`);
   }
   const bundle=structuredClone(developmentPages.HOME);bundle.en.title='New test publication';
   await tx`select app.publish_development_page('HOME',${home.revision},${tx.json(bundle)})`;
   await tx`set constraints all immediate`;
   await tx`set local role app_web`;
   check((await tx`select * from app.read_public_page('HOME','en')`)[0].title==='New test publication','projection follows new current version');
   await tx`reset role`;
   await tx`set local role app_reader`;
   check((await tx`select count(*)::int n from app.public_page_versions where page_id=${home.id}`)[0].n===1,'RLS hides historical versions from projection owner');
   await tx`reset role`;
   throw new Error('ROLLBACK_TEST_DATA');
  }).catch(e=>{if(e.message!=='ROLLBACK_TEST_DATA')throw e;});
  // Temporarily remove a fixed identity within a rolled-back transaction to test unpublished isolation.
  await sql.begin(async tx=>{
   await tx`grant app_web to postgres`;
   await tx`set constraints all deferred`;
   await tx`alter table app.public_pages disable trigger page_transition`;
   await tx`update app.public_pages set current_version=null where page_key='HOME'`;
   await tx`set local role app_web`;
   check((await tx`select * from app.read_public_page('HOME','en')`).length===0,'unpublished page has no public projection');
   await tx`reset role`;throw new Error('ROLLBACK_TEST_DATA');
  }).catch(e=>{if(e.message!=='ROLLBACK_TEST_DATA')throw e;});
  console.log(`Public database boundary: ${checks} checks passed; mutations rolled back.`);
 }finally{await web.end();await sql.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
