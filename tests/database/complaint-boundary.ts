import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import postgres from 'postgres';
import {canonicalCategories,canonicalLocations} from '../../fixtures/canonical-catalogue';

export async function verifyComplaints(url:string){
 const db=postgres(url,{max:4,onnotice:()=>{}});let passed=0;
 const runtime=readFileSync('.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)?.[1];
 assert.ok(runtime,'local runtime configuration exists');
 const target=new URL(runtime);target.pathname=new URL(url).pathname;
 const web=postgres(target.href,{max:4,onnotice:()=>{}});
 const check=(value:unknown,label:string)=>{assert.ok(value,label);passed++;console.log(`PASS ${label}`);};
 try{
  check((await db`select count(*)::int n from information_schema.tables where table_schema='app' and table_type='BASE TABLE'`)[0].n===20,'twenty application entities through DEV-06');
  check((await db`select count(*)::int n from app.categories`)[0].n===7,'seven approved categories');
  check((await db`select count(*)::int n from app.location_translations where language<>'ar'`)[0].n===0,'no invented location translations');
  const auth=randomUUID(),provider=randomUUID(),digest=randomBytes(32);
  await db`insert into auth.users(id,email,email_confirmed_at) values(${auth},'complaint-test@example.invalid',now())`;
  const [legal]=await web`select * from app.read_signup_legal('en')`;
  const [profile]=await web`select * from app.provision_citizen(${auth},'Synthetic Citizen',null,'en',${legal.terms_version_id},${legal.privacy_version_id})`;
  await web`select * from app.create_citizen_session(${auth},${provider},${digest})`;
  const key=randomUUID(),fingerprint=randomBytes(32),subject='  Original <subject>  ',description='  Original description with enough meaningful content.\nSecond line.  ';
  const submit=()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${key},${fingerprint},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},'  ',true)`;
  const [first]=await submit();const [again]=await submit();
  check(/^AB-(?:[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-){2}[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/.test(first.reference),'approved reference format');
  check(again.reference===first.reference&&again.replayed,'same command replays');
  const [detail]=await web`select * from app.read_own_complaint(${auth},${provider},${digest},${first.reference})`;
  check(detail.subject===subject&&detail.description===description,'original text preserved');
  check(detail.location_clarification===null,'blank clarification becomes null');
  check(detail.status==='SUBMITTED','initial SUBMITTED');
  check((await db`select count(*)::int n from app.complaints where citizen_id=${profile.profile_id}`)[0].n===1,'one persisted complaint');
  check((await db`select count(*)::int n from app.complaint_events`)[0].n===1,'one initial event');
  check((await db`select count(*)::int n from app.command_receipts`)[0].n===1,'one command receipt');
  check((await db`select count(*)::int n from app.notifications n join app.complaints c on c.id=n.complaint_id where c.reference=${first.reference}`)[0].n===1,'one Citizen receipt notification');
  check((await db`select count(*)::int n from app.email_outbox o join app.complaints c on c.id=o.complaint_id where c.reference=${first.reference}`)[0].n===1,'one receipt email job');
  const rejects=async(fn:()=>Promise<unknown>,code:string,label:string)=>{await assert.rejects(fn,error=>(error as {code?:string}).code===code,label);check(true,label);};
  const concurrent=await Promise.all(Array.from({length:8},submit));
  check(concurrent.every(rows=>rows[0].reference===first.reference&&rows[0].replayed),'eight concurrent duplicate requests replay one result');
  const freshKey=randomUUID(),freshFingerprint=randomBytes(32);
  const concurrentFresh=await Promise.all(Array.from({length:4},()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${freshKey},${freshFingerprint},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`));
  check(new Set(concurrentFresh.map(rows=>rows[0].reference)).size===1&&concurrentFresh.filter(rows=>!rows[0].replayed).length===1,'concurrent first submissions create exactly one result');
  await rejects(()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${key},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},'Different subject',${description},null,true)`,'P0409','changed payload conflicts');
  const [recovery]=await web`select * from app.recover_complaint_command(${auth},${provider},${digest},${key})`;
  check(recovery.reference===first.reference,'lost response recovered by command key');
  for(const table of ['categories','category_translations','locations','location_translations','complaints','complaint_events','command_receipts','notification_state','notifications','email_outbox']){
   await rejects(()=>web.unsafe(`select * from app.${table}`),'42501',`runtime raw read denied: ${table}`);
   await rejects(()=>web.unsafe(`delete from app.${table}`),'42501',`runtime deletion denied: ${table}`);
  }
  await rejects(()=>web`select * from app.read_own_complaint(${auth},${randomUUID()},${digest},${first.reference})`,'42501','incorrect provider binding denied');
  await rejects(()=>web`select * from app.read_own_complaint(${auth},${provider},${randomBytes(32)},${first.reference})`,'42501','incorrect session proof denied');
  const otherAuth=randomUUID(),otherProvider=randomUUID(),otherDigest=randomBytes(32);
  await db`insert into auth.users(id,email,email_confirmed_at) values(${otherAuth},'other-complaint@example.invalid',now())`;
  await web`select * from app.provision_citizen(${otherAuth},'Other Synthetic Citizen',null,'fr',${legal.terms_version_id},${legal.privacy_version_id})`;
  await web`select * from app.create_citizen_session(${otherAuth},${otherProvider},${otherDigest})`;
  check((await web`select * from app.read_own_complaint(${otherAuth},${otherProvider},${otherDigest},${first.reference})`).length===0,'other Citizen cannot read guessed reference');
  check((await web`select * from app.recover_complaint_command(${otherAuth},${otherProvider},${otherDigest},${key})`).length===0,'other Citizen cannot recover guessed command');
  const before=(await db`select count(*)::int n from app.complaints`)[0].n;
  const invalidKey=randomUUID();
  await rejects(()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${invalidKey},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},'  ',${description},null,true)`,'23514','database rejects blank subject');
  check((await db`select count(*)::int n from app.complaints`)[0].n===before&&(await db`select count(*)::int n from app.command_receipts where idempotency_key=${invalidKey}`)[0].n===0,'failed validation leaves no complaint or receipt');
  await rejects(()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${'😀'.repeat(151)},${description},null,true)`,'23514','database counts Unicode subject maximum');
  await rejects(()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${' 😀 '.repeat(3)},null,true)`,'23514','database checks effective description minimum');
  await db`update app.categories set is_active=false,revision=revision+1 where id=${canonicalCategories[0].id}`;
  await rejects(()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`,'P0401','inactive category rejected');
  check((await submit())[0].reference===first.reference,'successful replay survives later category deactivation');
  const [historical]=await web`select * from app.read_own_complaint(${auth},${provider},${digest},${first.reference})`;
  check(historical.category_labels_snapshot?.ar===canonicalCategories[0].labels.ar||historical.category_labels?.ar===canonicalCategories[0].labels.ar,'historical snapshot survives deactivation');
  await db`update app.categories set is_active=true,revision=revision+1 where id=${canonicalCategories[0].id}`;
  await rejects(()=>db`update app.complaint_events set new_status='CLOSED'`,'23514','event evidence immutable');
  await rejects(()=>db`delete from app.command_receipts`,'23514','successful receipts cannot be removed');
  await db`update auth.users set email_confirmed_at=null where id=${auth}`;
  await rejects(()=>submit(),'42501','unconfirmed identity rejected inside command');
  await db`update auth.users set email_confirmed_at=now() where id=${auth}`;
  const counts=async()=> (await db`select (select count(*) from app.complaints)::int complaints,(select count(*) from app.audit_events)::int audits,(select count(*) from app.complaint_events)::int events,(select count(*) from app.command_receipts)::int receipts,(select count(*) from app.notifications)::int notifications,(select count(*) from app.email_outbox)::int emails`)[0];
  const beforeFailure=await counts();
  await db.unsafe("create function app.test_reject_receipt() returns trigger language plpgsql as $$ begin raise exception using errcode='23514',message='Synthetic receipt failure';end $$; create trigger test_receipt_failure before insert on app.command_receipts for each row execute function app.test_reject_receipt()");
  try{
   await rejects(()=>web`select * from app.submit_complaint(${auth},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`,'23514','late receipt failure aborts submission');
   check(JSON.stringify(await counts())===JSON.stringify(beforeFailure),'late failure rolls back complaint, audit, event, notification, email and receipt');
  }finally{await db.unsafe('drop trigger test_receipt_failure on app.command_receipts; drop function app.test_reject_receipt()');}
  const [definition]=await db`select pg_get_functiondef('app.new_complaint_reference()'::regprocedure) ddl`;
  await db.unsafe('create sequence app.test_reference_attempt; grant usage on sequence app.test_reference_attempt to app_writer');
  assert.match(first.reference,/^AB-[A-Z2-9-]+$/);
  await db.unsafe(`create or replace function app.new_complaint_reference() returns text language sql volatile set search_path='' as $$ select case when nextval('app.test_reference_attempt')=1 then '${first.reference}' else 'AB-ZZZZ-ZZZZ-ZZZZ' end $$`);
  try{
   const [collision]=await web`select * from app.submit_complaint(${auth},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`;
   check(collision.reference==='AB-ZZZZ-ZZZZ-ZZZZ','reference collision retries safely within command');
  }finally{await db.unsafe(definition.ddl);await db.unsafe('drop sequence app.test_reference_attempt');}
  for(const role of ['AGENT','ADMIN']){
   const staffAuth=randomUUID(),staffProvider=randomUUID(),staffDigest=randomBytes(32);
   await db`insert into auth.users(id,email,email_confirmed_at) values(${staffAuth},${`${staffAuth}@example.invalid`},now())`;
   await db`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values(${staffAuth},'Synthetic staff',${role},'ACTIVE')`;
   await web`select * from app.create_application_session(${staffAuth},${staffProvider},${staffDigest},'COMMUNE')`;
   await rejects(()=>web`select * from app.submit_complaint(${staffAuth},${staffProvider},${staffDigest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`,'42501',`${role} cannot submit`);
   await rejects(()=>web`select * from app.read_own_complaint(${staffAuth},${staffProvider},${staffDigest},${first.reference})`,'42501',`${role} has no complaint projection`);
  }
  // Hold a real catalogue update open while a separate runtime connection attempts submission.
  let release!:()=>void,ready!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;}),locked=new Promise<void>(resolve=>{ready=resolve;});
  const deactivation=db.begin(async tx=>{await tx`update app.locations set is_active=false,revision=revision+1 where id=${canonicalLocations[0].id}`;ready();await held;});
  await locked;
  const racing=web`select * from app.submit_complaint(${auth},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`.execute().then(()=>null,error=>error.code);
  release();await deactivation;
  check(await racing==='P0402','concurrent location deactivation prevents submission');
  await db`update app.locations set is_active=true,revision=revision+1 where id=${canonicalLocations[0].id}`;
  let releaseSession!:()=>void,sessionReady!:()=>void;
  const sessionHeld=new Promise<void>(resolve=>{releaseSession=resolve;}),sessionLocked=new Promise<void>(resolve=>{sessionReady=resolve;});
  const revocation=db.begin(async tx=>{await tx`update app.application_sessions set revoked_at=now(),revocation_reason='LOGOUT' where provider_session_id=${provider}`;sessionReady();await sessionHeld;});
  await sessionLocked;
  const racingSession=submit().execute().then(()=>null,error=>error.code);
  releaseSession();await revocation;
  check(await racingSession==='42501','concurrent revocation denies even successful receipt replay');
  const burstKey=randomUUID(),burstFingerprint=randomBytes(32);
  const burst=(key:string,fingerprint:Buffer)=>web`select * from app.submit_complaint(${otherAuth},${otherProvider},${otherDigest},${key},${fingerprint},${canonicalCategories[0].id},${canonicalLocations[0].id},${subject},${description},null,true)`;
  const [burstFirst]=await burst(burstKey,burstFingerprint);
  for(let i=1;i<10;i++)await burst(randomUUID(),randomBytes(32));
  await rejects(()=>burst(randomUUID(),randomBytes(32)),'P0429','shared burst protection rejects eleventh new submission within a minute');
  check((await burst(burstKey,burstFingerprint))[0].reference===burstFirst.reference,'burst protection never prevents successful replay');
  console.log(`Complaint database: ${passed} checks passed.`);
 }finally{await web.end();await db.end();}
}
