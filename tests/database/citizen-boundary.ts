import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';

import postgres from 'postgres';
import {localDatabaseUrl,runtimeDatabaseUrl} from './target';

async function main(){
 const admin=postgres(localDatabaseUrl(),{max:1,onnotice:()=>{}});
 const runtimeUrl=runtimeDatabaseUrl();
 assert.ok(runtimeUrl,'runtime URL exists');
 const web=postgres(runtimeUrl,{max:1,onnotice:()=>{}});let passed=0;
 const check=(value:unknown,label:string)=>{assert.ok(value,label);passed++;console.log(`PASS ${label}`);};
 const rejects=async(fn:()=>Promise<unknown>,code:string,label:string)=>{await assert.rejects(fn,e=>(e as {code?:string}).code===code,label);passed++;console.log(`PASS ${label}`);};
 try{
  for(const table of ['application_sessions','legal_acknowledgements']){
   await rejects(()=>web.unsafe(`select * from app.${table}`),'42501',`runtime cannot enumerate ${table}`);
   await rejects(()=>web.unsafe(`delete from app.${table}`),'42501',`runtime cannot delete ${table}`);
  }
  for(const role of ['public','anon','authenticated','service_role','app_reader']) for(const table of ['application_sessions','legal_acknowledgements']){
   check(!(await admin`select has_table_privilege(${role},${'app.'+table},'SELECT') allowed`)[0].allowed,`${role} cannot read ${table}`);
  }
  await admin.begin(async tx=>{
   const first=randomUUID(),second=randomUUID();
   await tx`insert into auth.users(id,email,email_confirmed_at) values(${first},'first@example.invalid',now()),(${second},'second@example.invalid',now())`;
   await tx`grant app_web to postgres`;
   await tx`set local role app_web`;
   const [legal]=await tx`select * from app.read_signup_legal('ar')`;
   check(Boolean(legal?.terms_version_id&&legal?.privacy_version_id),'current localized legal versions are readable only through projection');
   const [created]=await tx`select * from app.provision_citizen(${first},'مواطن تجريبي','+212600000001','ar',${legal.terms_version_id},${legal.privacy_version_id})`;
   check(created.created&&created.complete,'Citizen provisioning creates a complete profile');
   const [again]=await tx`select * from app.provision_citizen(${first},'Ignored duplicate',null,'fr',${legal.terms_version_id},${legal.privacy_version_id})`;
   check(!again.created&&again.profile_id===created.profile_id,'provisioning is idempotent');
   await tx`reset role`;
   check((await tx`select count(*)::int n from app.legal_acknowledgements where citizen_id=${created.profile_id}`)[0].n===2,'exact Terms and Privacy evidence recorded');
   check((await tx`select count(*)::int n from app.audit_events where actor_id=${created.profile_id} and action in ('PROFILE_UPDATED','LEGAL_ACKNOWLEDGED')`)[0].n===2,'signup profile and legal audit recorded');
   await rejects(()=>tx.savepoint(t=>t`update app.legal_acknowledgements set language='fr' where citizen_id=${created.profile_id}`),'23514','legal evidence is immutable');
   await rejects(()=>web`update app.application_profiles set role='ADMIN'`,'42501','runtime cannot escalate role');
   await rejects(()=>web`update app.application_profiles set access_status='ACTIVE'`,'42501','runtime cannot reactivate profile');
   await rejects(()=>web`update app.application_profiles set security_epoch=99`,'42501','runtime cannot change security epoch');

   await tx`set local role app_web`;
   const providerOne=randomUUID(),secretOne=createHash('sha256').update(randomBytes(32)).digest();
   const [session]=await tx`select * from app.create_citizen_session(${first},${providerOne},${secretOne})`;
   check(Boolean(session?.session_id)&&new Date(session.absolute_expires_at).getTime()>Date.now(),'verified Citizen command creates bounded application session');
   const [valid]=await tx`select * from app.resolve_citizen_session(${first},${providerOne},${secretOne},false)`;
   check(valid?.state==='VALID'&&valid.profile_id===created.profile_id,'matching identity, provider session, and secret resolve');
   check((await tx`select * from app.resolve_citizen_session(${second},${providerOne},${secretOne},false)`).length===0,'cross-user session request fails closed');
   check((await tx`select * from app.resolve_citizen_session(${first},${randomUUID()},${secretOne},false)`).length===0,'submitted provider-session mismatch fails closed');
   check((await tx`select * from app.resolve_citizen_session(${first},${providerOne},${randomBytes(32)},false)`).length===0,'session-secret replay with wrong digest fails closed');
   await rejects(()=>tx.savepoint(t=>t`select * from app.create_citizen_session(${first},${providerOne},${randomBytes(32)})`),'23505','provider session identifier is unique');
   await rejects(()=>tx.savepoint(t=>t`select * from app.create_citizen_session(${first},${randomUUID()},${secretOne})`),'23505','application session digest is unique');

   await tx`reset role`;
   const [profile]=await tx`select revision from app.application_profiles where id=${created.profile_id}`;
   await tx`set local role app_web`;
   const [updated]=await tx`select * from app.update_citizen_profile(${first},${providerOne},${secretOne},${profile.revision},'اسم محدّث',null,'en')`;
   check(updated.full_name==='اسم محدّث'&&updated.preferred_language==='en'&&updated.contact_phone===null,'profile, optional phone, and language update together');
   await rejects(()=>tx.savepoint(t=>t`select * from app.update_citizen_profile(${first},${providerOne},${secretOne},${profile.revision},'Stale',null,'en')`),'40001','optimistic revision rejects stale update');

   const providerTwo=randomUUID(),secretTwo=createHash('sha256').update(randomBytes(32)).digest();
   await tx`select * from app.create_citizen_session(${first},${providerTwo},${secretTwo})`;
   const rebound=createHash('sha256').update(randomBytes(32)).digest();
   const [epoch]=await tx`select app.secure_citizen_sessions(${first},'PASSWORD_CHANGE',${providerOne},${secretOne},${rebound}) value`;
   check(Number(epoch.value)===2,'security action increments security epoch');
   check((await tx`select * from app.resolve_citizen_session(${first},${providerTwo},${secretTwo},false)`)[0]?.state==='REVOKED','other application sessions are revoked');
   check((await tx`select * from app.resolve_citizen_session(${first},${providerOne},${rebound},false)`)[0]?.state==='VALID','current session securely rebinds to new epoch and digest');
   check((await tx`select * from app.resolve_citizen_session(${first},${providerOne},${secretOne},false)`).length===0,'old application secret cannot replay after rebinding');
   check((await tx`select app.revoke_current_citizen_session(${first},${providerOne},${rebound}) value`)[0].value,'current-session logout revokes only matching session');
   check((await tx`select * from app.resolve_citizen_session(${first},${providerOne},${rebound},false)`)[0]?.state==='REVOKED','revoked session cannot regain access');

   const [secondCreated]=await tx`select * from app.provision_citizen(${second},'Second citizen',null,'ar',${legal.terms_version_id},${legal.privacy_version_id})`;
   const expiredDigest=createHash('sha256').update(randomBytes(32)).digest(),started=new Date(Date.now()-31*86400_000);
   await tx`reset role`;
   await tx`insert into app.application_sessions(profile_id,provider_session_id,secret_digest,security_epoch,started_at,last_user_activity_at,idle_timeout_seconds,absolute_expires_at)
    values(${secondCreated.profile_id},${randomUUID()},${expiredDigest},1,${started},${started},604800,${new Date(started.getTime()+30*86400_000)})`;
   const [expiredRow]=await tx`select provider_session_id from app.application_sessions where secret_digest=${expiredDigest}`;
   await tx`set local role app_web`;
   check((await tx`select * from app.resolve_citizen_session(${second},${expiredRow.provider_session_id},${expiredDigest},false)`)[0]?.state==='EXPIRED','absolute expiry is enforced and permanently revoked');
   await tx`reset role`;
   check((await tx`select revocation_reason from app.application_sessions where secret_digest=${expiredDigest}`)[0].revocation_reason==='EXPIRED','expiry stores permanent revocation reason');
   throw new Error('ROLLBACK_TEST_DATA');
  }).catch(error=>{if((error as Error).message!=='ROLLBACK_TEST_DATA')throw error;});
  console.log(`Citizen database boundary: ${passed} checks passed; test data rolled back.`);
 }finally{await web.end();await admin.end();}
}
main().catch(error=>{console.error((error as Error).message);process.exitCode=1;});
