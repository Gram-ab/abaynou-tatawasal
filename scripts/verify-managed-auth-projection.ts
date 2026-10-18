import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import postgres from 'postgres';
import {localDatabaseUrl} from './local-target';
import {runtimeDatabaseUrl} from '../tests/database/target';
import {developmentPages} from '../fixtures/public-content';
import {canonicalCategories,canonicalLocations} from '../fixtures/canonical-catalogue';
import {seedCatalogues} from './seed-catalogues';

// Local-only, disposable reconstruction. No hosted URL, owner account, password
// fixture, email delivery, database reset or global role modification is used.
const migrationName='20261018000100_managed_auth_projection.sql';
let stage='local target verification';
async function main(){
 const source=localDatabaseUrl(),runtime=runtimeDatabaseUrl(),name=`auth_projection_verify_${randomUUID().replaceAll('-','')}`;
 assert.match(name,/^auth_projection_verify_[a-f0-9]{32}$/u);
 const localOwner=new URL(source);localOwner.username='supabase_admin';
 const root=postgres(localOwner.href,{max:1,onnotice:()=>{}});let db:ReturnType<typeof postgres>|undefined,web:ReturnType<typeof postgres>|undefined,created=false,passed=0;
 const check=(value:unknown,label:string)=>{stage=label;assert.ok(value,label);passed++;console.log(`PASS ${label}`);};
 const denied=async(run:()=>Promise<unknown>,label:string)=>{stage=label;await assert.rejects(run,error=>(error as {code?:string}).code==='42501');passed++;console.log(`PASS ${label}`);};
 try{
  stage='existing local role verification';
  assert.equal((await root`select count(*)::int n from pg_roles where rolname in ('app_web','app_reader','app_writer','app_mailer','app_mail_worker')`)[0].n,5,'All existing local roles are required; the verifier must not create cluster roles');
  stage='isolated reconstruction';await root.unsafe(`create database "${name}"`);created=true;
  const adminUrl=new URL(localOwner.href),webUrl=new URL(runtime);adminUrl.pathname='/'+name;webUrl.pathname='/'+name;
  db=postgres(adminUrl.href,{max:1,onnotice:()=>{}});web=postgres(webUrl.href,{max:1,onnotice:()=>{}});
  const owner=db,app=web;
  // Existing local socket client can assign the mail-worker owner without
  // granting any cluster-wide role memberships to the postgres login.
  const localOwnerSql=(sql:string)=>execFileSync(join(process.env.LOCALAPPDATA??'','Programs','Podman','podman.exe'),['exec','-i','supabase_db_Abaynou_Tatawasal','psql','-X','-q','-t','-A','-U','supabase_admin','-d',name,'-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
  await owner.unsafe("create schema extensions;create extension pgcrypto with schema extensions;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb,encrypted_password text);alter table auth.users enable row level security");
  const prior=readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')&&file<migrationName).sort();
  check(prior.length===26,'26 unchanged prior migrations selected');
  for(const file of prior){
   const sql=readFileSync(`supabase/migrations/${file}`,'utf8').replace(/^create role app_(web|reader|writer) .*;\r?$/gm,'').replace(/^grant app_mail_worker to postgres;\r?$/gm,'');
   stage='reconstructing '+file;await owner.unsafe(sql);
  }
  check(true,'prior application schema reconstructed in a disposable database');
  for(const [key,bundle] of Object.entries(developmentPages))await owner`select app.publish_development_page(${key},1,${owner.json(bundle)})`;
  await seedCatalogues(owner);
  const [legal]=await app`select * from app.read_signup_legal('en')`;
  const make=async(role:'CITIZEN'|'AGENT'|'ADMIN')=>{
   const auth=randomUUID(),provider=randomUUID(),digest=randomBytes(32),email=`${randomUUID()}@example.invalid`;
   await owner`insert into auth.users(id,email,email_confirmed_at) values(${auth},${email},now())`;
   const [profile]=role==='CITIZEN'?await app`select * from app.provision_citizen(${auth},'Synthetic projection citizen',null,'en',${legal.terms_version_id},${legal.privacy_version_id})`:await owner`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values(${auth},'Synthetic projection staff',${role},'ACTIVE') returning id as profile_id`;
   await app`select * from app.create_application_session(${auth},${provider},${digest},${role==='CITIZEN'?'CITIZEN':'COMMUNE'})`;
   return {auth,provider,digest,email,id:profile.profile_id};
  };
  const citizen=await make('CITIZEN'),other=await make('CITIZEN'),manager=await make('ADMIN'),agent=await make('AGENT'),key=randomUUID();
  const list=()=>app`select * from app.list_own_complaints(${citizen.auth},${citizen.provider},${citizen.digest},null,null,null,null,5)`;
  const recover=()=>app`select * from app.recover_complaint_command(${citizen.auth},${citizen.provider},${citizen.digest},${key})`;
  await owner.unsafe('revoke usage on schema auth from app_writer');
  check(!(await owner`select has_schema_privilege('app_writer','auth','USAGE') allowed`)[0].allowed,'managed hosted condition reproduced: no Auth namespace usage');
  check((await app`select * from app.resolve_application_session(${citizen.auth},${citizen.provider},${citizen.digest},false)`)[0].state==='VALID','account session still resolves before the fix');
  await denied(list,'complaint list fails with 42501 before the fix');
  await denied(recover,'new-complaint command recovery fails with 42501 before the fix');
  const before=await owner`select p.oid,p.prosrc,p.proowner,p.proacl::text as acl,p.prosecdef,p.proconfig::text as config from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app'`;
  // Match hosted postgres: non-superuser migration executor with namespace access
  // and existing column grants, but no EXECUTE on three owner-revoked functions.
  await owner.unsafe('grant usage on schema auth to postgres;grant usage,create on schema app to postgres;grant select(id,email,email_confirmed_at,last_sign_in_at,raw_user_meta_data) on auth.users to postgres');
  stage='new migration';localOwnerSql('set role postgres;\n'+readFileSync(`supabase/migrations/${migrationName}`,'utf8'));
  const after=await owner`select p.oid,p.prosrc,p.proowner,p.proacl::text as acl,p.prosecdef,p.proconfig::text as config from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app'`;
  const changed=before.filter(row=>row.prosrc.includes('auth.users'));
  check(changed.length===12,'twelve expected internal provider-read functions identified');
  check(before.every(row=>{const next=after.find(item=>item.oid===row.oid);return next&&next.prosrc===row.prosrc.replaceAll('auth.users','app.provider_auth_users')&&next.proowner===row.proowner&&next.acl===row.acl&&next.prosecdef===row.prosecdef&&next.config===row.config;}),'function bodies differ only by relation name; owners, ACLs and search paths preserved');
  check(!(await owner`select has_schema_privilege('app_writer','auth','USAGE') allowed`)[0].allowed,'fix does not grant Auth namespace access');
  check((await list()).length===0,'Citizen dashboard and complaint list can load empty state');
  check((await recover()).length===0,'new complaint command recovery can load');
  check((await app`select * from app.read_submission_catalogues()`).length===13,'wizard has seven categories and six locations');
  const [submitted]=await app`select * from app.submit_complaint(${citizen.auth},${citizen.provider},${citizen.digest},${key},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},'Synthetic projection complaint','A synthetic complaint description for isolated permission verification.',null,true)`;
  check((await list())[0].reference===submitted.reference,'Citizen tracking reads a persisted complaint');
  check((await recover())[0].reference===submitted.reference,'idempotent submission recovery finds its owned receipt');
  check((await app`select * from app.read_own_complaint(${other.auth},${other.provider},${other.digest},${submitted.reference})`).length===0,'another Citizen cannot read the complaint');
  await denied(()=>app`select * from app.list_own_complaints(${citizen.auth},${citizen.provider},${randomBytes(32)},null,null,null,null,5)`,'invalid session proof stays denied');
  await denied(()=>app`select id from auth.users`,'web runtime direct Auth access stays denied');
  await denied(()=>app`select * from app.provider_auth_users`,'web runtime cannot read the internal view');
  for(const role of ['anon','authenticated','service_role','app_reader','app_mailer','app_mail_worker'])check(!(await owner`select has_table_privilege(${role},'app.provider_auth_users','SELECT') allowed`)[0].allowed,`${role} cannot read the internal view`);
  const [view]=await owner`select reloptions from pg_class where oid='app.provider_auth_users'::regclass`;
  check(view.reloptions.includes('security_invoker=true')&&view.reloptions.includes('security_barrier=true'),'view retains invoker permissions and security barrier');
  check(!(await owner`select has_table_privilege('app_writer','app.provider_auth_users','INSERT,UPDATE,DELETE') allowed`)[0].allowed,'internal view has no write grants');
  await owner.begin(async tx=>{
   await tx.unsafe('set local role app_writer');
   await tx`select set_config('app.staff_admin_provider_read','',true),set_config('app.complaint_auth_identity','',true)`;
   check((await tx`select id from app.provider_auth_users`).length===0,'Auth RLS hides every identity without an approved scope');
   await tx`select set_config('app.complaint_auth_identity',${citizen.auth},true)`;
   const visible=await tx`select id from app.provider_auth_users`;
   check(visible.length===1&&visible[0].id===citizen.auth,'Auth RLS exposes only the scoped identity through the view');
  });
  const cols=await owner`select column_name from information_schema.columns where table_schema='app' and table_name='provider_auth_users' order by ordinal_position`;
  check(cols.map(row=>row.column_name).join(',')==='id,email,email_confirmed_at,last_sign_in_at,raw_user_meta_data','only the five already granted columns are projected');
  check((await app`select * from app.list_staff_accounts(${manager.auth},${manager.provider},${manager.digest},null,null,null,1,20)`).length===2,'Admin staff directory provider read succeeds');
  check((await app`select * from app.list_citizen_accounts(${manager.auth},${manager.provider},${manager.digest},null,null,1)`).length===2,'Admin Citizen directory provider read succeeds');
  await denied(()=>app`select * from app.list_staff_accounts(${agent.auth},${agent.provider},${agent.digest},null,null,null,1,20)`,'Agent remains denied Admin directory access');
  check((await app`select * from app.find_auth_user_for_staff_admin(${manager.auth},${manager.provider},${manager.digest},${agent.email})`)[0].auth_user_id===agent.auth,'targeted Admin identity lookup succeeds');
  check((await app`select * from app.read_staff_activation_states(${manager.auth},${manager.provider},${manager.digest},array[${agent.id}::uuid])`)[0].activation_pending===false,'staff activation metadata projection succeeds');
  check((await app`select app.citizen_recovery_allowed(${citizen.email}) allowed`)[0].allowed===true,'verified Citizen password recovery eligibility succeeds');
  check(localOwnerSql(`begin;set local role app_mail_worker;select app.resolve_mail_recipient('${citizen.auth}'::uuid)='${citizen.email}';rollback;`)==='t','worker verified-recipient revalidation succeeds');
  console.log(`Managed Auth projection: ${passed} checks passed.`);
 }finally{
  await web?.end();await db?.end();
  if(created)await root.unsafe(`drop database "${name}" with (force)`);
  await root.end();
 }
}
main().catch(error=>{console.error(`Managed Auth projection check failed at ${stage}; code=${String((error as {code?:string}).code??'assertion')}. No credentials or query parameters logged.`);if(stage.startsWith('reconstructing ')||stage==='new migration')console.error(String((error as {message?:string}).message??''));process.exitCode=1;});
