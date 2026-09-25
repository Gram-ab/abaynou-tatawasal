import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {localDatabaseUrl} from '../../scripts/local-target';
async function main(){const db=postgres(localDatabaseUrl(),{max:1,onnotice:()=>{}});let passed=0;
 const check=(v:unknown,label:string)=>{assert.ok(v,label);passed++;console.log(`PASS ${label}`);};
 try{await db.begin(async tx=>{
  await tx`grant app_web to postgres`;
  const ids={AGENT:randomUUID(),ADMIN:randomUUID(),CITIZEN:randomUUID()};
  for(const [role,id] of Object.entries(ids)){await tx`insert into auth.users(id,email,email_confirmed_at) values(${id},${`${id}@example.test`},now())`;await tx`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values(${id},${role},${role},'ACTIVE')`;}
  for(const role of ['AGENT','ADMIN'] as const){const id=ids[role],provider=randomUUID(),secret=randomBytes(32),otherProvider=randomUUID(),otherSecret=randomBytes(32);
   await tx`set local role app_web`;
   const [s]=await tx`select * from app.create_application_session(${id},${provider},${secret},'COMMUNE')`;check(!!s,`${role} session issued`);
   check((await tx`select * from app.resolve_application_session(${id},${provider},${secret},false)`)[0]?.role===role,`${role} resolves actual database role`);
   check((await tx`select * from app.create_citizen_session(${id},${randomUUID()},${randomBytes(32)})`).length===0,`${role} cannot issue Citizen session`);
   check((await tx`select * from app.resolve_citizen_session(${id},${provider},${secret},true)`).length===0,`${role} denied Citizen resolver`);
   check((await tx`select * from app.resolve_application_session(${ids.CITIZEN},${provider},${secret},false)`).length===0,`${role} cross-profile binding enforced`);
   check((await tx`select * from app.resolve_application_session(${id},${provider},${randomBytes(32)},false)`).length===0,`${role} invalid secret denied`);
   await tx`select * from app.create_application_session(${id},${otherProvider},${otherSecret},'COMMUNE')`;
   await tx`select app.update_staff_language(${id},${provider},${secret},1,'fr')`;
   await tx`reset role`;
   const [row]=await tx`select * from app.application_sessions where id=${s.session_id}`;
   check(row.idle_timeout_seconds===3600,`${role} idle lifetime is one hour`);check(new Date(row.absolute_expires_at).getTime()-new Date(row.started_at).getTime()===8*3600_000,`${role} absolute lifetime is eight hours`);
   check((await tx`select preferred_language from app.application_profiles where auth_user_id=${id}`)[0].preferred_language==='fr',`${role} updates own language`);
   check((await tx`select actor_role from app.audit_events where resource_id=${s.session_id}`)[0].actor_role===role,`${role} issuance audit attribution`);
   await tx`set local role app_web`;
   await tx`select app.revoke_application_session(${id},${provider},${secret})`;
   check((await tx`select * from app.resolve_application_session(${id},${provider},${secret},true)`)[0].state==='REVOKED',`${role} logout cannot revive`);
   check((await tx`select * from app.resolve_application_session(${id},${otherProvider},${otherSecret},false)`)[0].state==='VALID',`${role} logout preserves independent session`);
   const fresh=randomBytes(32);await tx`select app.secure_application_sessions(${id},'PASSWORD_CHANGE',${otherProvider},${otherSecret},${fresh},'COMMUNE')`;
   check((await tx`select * from app.resolve_application_session(${id},${otherProvider},${fresh},false)`)[0].state==='VALID',`${role} password change retains reauthenticated session`);
   check((await tx`select * from app.resolve_application_session(${id},${otherProvider},${otherSecret},false)`).length===0,`${role} password change rotates secret`);
   await tx`select app.secure_application_sessions(${id},'PASSWORD_RESET',null,null,null,'COMMUNE')`;
   check((await tx`select * from app.resolve_application_session(${id},${otherProvider},${fresh},false)`)[0].state==='REVOKED',`${role} recovery revokes all sessions`);
   await tx`reset role`;
   check((await tx`select count(*)::int n from app.audit_events where actor_id=${s.profile_id} and actor_role<>${role}`)[0].n===0,`${role} all security events use actual role`);
   const [profile]=await tx`select * from app.application_profiles where auth_user_id=${id}`;
   for(const scenario of ['IDLE','ABSOLUTE','STALE','DISABLED']){const pid=randomUUID(),digest=randomBytes(32);const age=scenario==='ABSOLUTE'?9*3600_000:scenario==='IDLE'?2*3600_000:0;const started=new Date(Date.now()-age);
    await tx`insert into app.application_sessions(profile_id,provider_session_id,secret_digest,security_epoch,started_at,last_user_activity_at,idle_timeout_seconds,absolute_expires_at) values(${profile.id},${pid},${digest},${scenario==='STALE'?1:profile.security_epoch},${started},${started},3600,${new Date(started.getTime()+8*3600_000)})`;
    if(scenario==='DISABLED')await tx`update app.application_profiles set access_status='DISABLED' where id=${profile.id}`;
    await tx`set local role app_web`;
    const [resolved]=await tx`select * from app.resolve_application_session(${id},${pid},${digest},true)`;check(resolved.state===(scenario==='IDLE'||scenario==='ABSOLUTE'?'EXPIRED':scenario),`${role} ${scenario.toLowerCase()} denied`);
    await tx`reset role`;
   }
  }
  await tx`set local role app_web`;
  check((await tx`select * from app.create_application_session(${ids.CITIZEN},${randomUUID()},${randomBytes(32)},'COMMUNE')`).length===0,'Citizen cannot issue Commune session');
  await tx`reset role`;
  for(const role of ['app_web','app_writer','app_reader']){const [r]=await tx`select rolsuper,rolbypassrls from pg_roles where rolname=${role}`;check(!r.rolsuper&&!r.rolbypassrls,`${role} has no superuser/RLS bypass`);}
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])check(!(await tx`select has_table_privilege('app_web','app.application_profiles',${privilege}) value`)[0].value,`runtime lacks profile ${privilege}`);
  for(const role of ['anon','authenticated','service_role','app_reader'])check(!(await tx`select has_function_privilege(${role},'app.create_application_session(uuid,uuid,bytea,text)','EXECUTE') value`)[0].value,`${role} cannot issue application sessions`);
  throw new Error('ROLLBACK_TEST_DATA');
 }).catch(e=>{if(e.message!=='ROLLBACK_TEST_DATA')throw e;});console.log(`Commune database boundary: ${passed} checks passed; test data rolled back.`);}finally{await db.end();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
