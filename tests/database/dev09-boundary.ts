import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
import {developmentPages} from '../../fixtures/public-content';
import {seedPublicContent} from '../../scripts/seed-public-content';
import {localDatabaseUrl,runtimeDatabaseUrl} from './target';

export async function verifyDev09(adminUrl=localDatabaseUrl()){
 const env=readFileSync('.env.local','utf8'),runtime=new URL(env.match(/^DATABASE_URL=(.+)$/m)?.[1]??runtimeDatabaseUrl());runtime.pathname=new URL(adminUrl).pathname;
 const admin=postgres(adminUrl,{max:4,onnotice:()=>{}}),web=postgres(runtime.href,{max:6,onnotice:()=>{}});let passed=0;
 const check=(value:unknown,label:string)=>{assert.ok(value,label);passed++;console.log(`PASS ${label}`);};
 const rejects=async(fn:()=>Promise<unknown>,code:string,label:string)=>{await assert.rejects(fn,error=>(error as {code?:string}).code===code,label);check(true,label);};
 try{
  const make=async(role:'ADMIN'|'AGENT'|'CITIZEN')=>{const auth=randomUUID(),provider=randomUUID(),digest=randomBytes(32);await admin`insert into auth.users(id,email,email_confirmed_at) values(${auth},${`${auth}@example.invalid`},now())`;let profile;if(role==='CITIZEN'){const [legal]=await web`select * from app.read_signup_legal('en')`;[profile]=await web`select * from app.provision_citizen(${auth},'DEV09 Citizen',null,'en',${legal.terms_version_id},${legal.privacy_version_id})`;}else [profile]=await admin`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values(${auth},${`DEV09 ${role}`},${role},'ACTIVE') returning *`;await web`select * from app.create_application_session(${auth},${provider},${digest},${role==='CITIZEN'?'CITIZEN':'COMMUNE'})`;return {auth,provider,digest,profile};};
  const owner=await make('ADMIN'),agent=await make('AGENT'),citizen=await make('CITIZEN');
  check((await web`select * from app.list_admin_public_pages(${owner.auth},${owner.provider},${owner.digest},'en')`).length===9,'Admin lists exactly nine fixed pages');
  await rejects(()=>web`select * from app.list_admin_public_pages(${agent.auth},${agent.provider},${agent.digest},'en')`,'42501','Agent cannot access content administration');
  await rejects(()=>web`select * from app.read_admin_commune_settings(${citizen.auth},${citizen.provider},${citizen.digest})`,'42501','Citizen cannot access settings administration');
  await rejects(()=>web`select * from app.list_admin_public_pages(${randomUUID()},${randomUUID()},${randomBytes(32)},'en')`,'42501','Anonymous caller cannot access administration');
  await rejects(()=>web`select * from app.public_page_versions`,'42501','Runtime cannot read raw publication history');
  await rejects(()=>web`update app.commune_settings set contact_email='blocked@example.invalid'`,'42501','Runtime cannot mutate raw settings');
  const [terms]=await web`select * from app.read_admin_public_page(${owner.auth},${owner.provider},${owner.digest},'TERMS')`;
  const acknowledgements=await admin`select page_version_id,language,acknowledged_at from app.legal_acknowledgements where citizen_id=${citizen.profile.profile_id} order by page_version_id`;
  const bundle=structuredClone(developmentPages.TERMS);bundle.en.title=`DEV09 Terms ${randomUUID()}`;
  const key=randomUUID(),fingerprint=randomBytes(32),publish=()=>web`select * from app.publish_public_page(${owner.auth},${owner.provider},${owner.digest},'TERMS',${terms.revision},${key},${fingerprint},${web.json(bundle)})`;
  const [published]=await publish(),[replay]=await publish();check(Number(published.version_number)===Number(terms.current_version)+1&&Number(published.revision)===Number(terms.revision)+1&&replay.replayed,'Publication is sequential, revisioned, and idempotent');
  check((await web`select * from app.read_public_page('TERMS','en')`)[0].title===bundle.en.title,'Public projection switches to the new current version');
  const history=await web`select * from app.read_admin_public_page_history(${owner.auth},${owner.provider},${owner.digest},'TERMS',30)`;check(history.length>=2&&history[0].is_current&&!history[1].is_current,'Admin history preserves current and previous versions');
  await rejects(()=>web`select * from app.publish_public_page(${owner.auth},${owner.provider},${owner.digest},'TERMS',${terms.revision},${randomUUID()},${randomBytes(32)},${web.json(bundle)})`,'P0812','Stale publication is rejected');
  const incomplete={ar:bundle.ar,fr:bundle.fr};await rejects(()=>web`select * from app.publish_public_page(${owner.auth},${owner.provider},${owner.digest},'HOME',2,${randomUUID()},${randomBytes(32)},${web.json(incomplete)})`,'23514','Incomplete locale bundle is rejected');
  const unsafe=structuredClone(developmentPages.HOME);unsafe.en.body='<script>alert(1)</script>';await rejects(()=>web`select * from app.publish_public_page(${owner.auth},${owner.provider},${owner.digest},'HOME',2,${randomUUID()},${randomBytes(32)},${web.json(unsafe)})`,'23514','Executable markup is rejected');
  await rejects(()=>admin`update app.public_page_translations set body='changed' where version_id=${history[1].version_id}`,'23514','Previous publication remains immutable');
  const afterAcknowledgements=await admin`select page_version_id,language,acknowledged_at from app.legal_acknowledgements where citizen_id=${citizen.profile.profile_id} order by page_version_id`;check(JSON.stringify(afterAcknowledgements)===JSON.stringify(acknowledgements),'New legal publication never rewrites acknowledgement evidence');
  const [session]=await web`select * from app.resolve_application_session(${citizen.auth},${citizen.provider},${citizen.digest},false)`;check(session.state==='VALID','Existing Citizen remains valid with historical legal evidence');
  const [settings]=await web`select * from app.read_admin_commune_settings(${owner.auth},${owner.provider},${owner.digest})`,settingsBundle=settings.translations;settingsBundle.en.opening_hours='DEV09 verified hours';
  const settingsKey=randomUUID(),settingsFingerprint=randomBytes(32),save=()=>web`select * from app.update_commune_settings(${owner.auth},${owner.provider},${owner.digest},${settings.revision},${settingsKey},${settingsFingerprint},'+212 500 000 000','public@example.invalid','https://www.chikaya.ma/',${web.json(settingsBundle)})`;
  const [saved]=await save(),[savedReplay]=await save();check(Number(saved.revision)===Number(settings.revision)+1&&savedReplay.replayed,'Settings update is revisioned and idempotent');
  const [publicSettings]=await web`select * from app.read_public_settings('en')`;check(publicSettings.opening_hours==='DEV09 verified hours'&&publicSettings.chikaya_url==='https://www.chikaya.ma/','Settings public projection updates immediately');
  await rejects(()=>web`select * from app.update_commune_settings(${owner.auth},${owner.provider},${owner.digest},${settings.revision},${randomUUID()},${randomBytes(32)},'+212 500 000 001','other@example.invalid','https://chikaya.ma/',${web.json(settingsBundle)})`,'P0812','Stale settings update is rejected');
  await rejects(()=>web`select * from app.update_commune_settings(${owner.auth},${owner.provider},${owner.digest},${saved.revision},${randomUUID()},${randomBytes(32)},'+212 500 000 001','other@example.invalid','https://chikaya.ma.evil.test/',${web.json(settingsBundle)})`,'23514','Chikaya lookalike URL is rejected');
  check((await admin`select count(*)::int n from app.audit_events where actor_id=${owner.profile.id} and action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED')`)[0].n===2,'Admin publication and settings audit evidence is recorded');
  const beforeSeed=await admin`select page_key,current_version,revision from app.public_pages order by page_key`,beforeSettings=(await admin`select contact_phone,contact_email,chikaya_url,revision from app.commune_settings`)[0];const seeded=await seedPublicContent(admin);const afterSeed=await admin`select page_key,current_version,revision from app.public_pages order by page_key`,afterSettings=(await admin`select contact_phone,contact_email,chikaya_url,revision from app.commune_settings`)[0];check(seeded.publications===0&&!seeded.settingsCreated&&JSON.stringify(afterSeed)===JSON.stringify(beforeSeed)&&JSON.stringify(afterSettings)===JSON.stringify(beforeSettings),'Bootstrap rerun preserves Admin publications and settings');
  await admin`alter table app.public_pages disable trigger page_transition`;await admin`alter table app.public_pages drop constraint public_pages_page_key_check`;await admin`update app.public_pages set page_key='BROKEN' where page_key='HOME'`;await assert.rejects(()=>seedPublicContent(admin),/identity conflict/);check(true,'Bootstrap fails closed on fixed-page identity corruption');
  console.log(`DEV-09 database: ${passed} checks passed.`);
 }finally{await web.end();await admin.end();}
}
