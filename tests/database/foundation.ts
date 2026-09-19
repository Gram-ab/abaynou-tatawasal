import assert from 'node:assert/strict';
import postgres from 'postgres';
import {localDatabaseUrl} from '../../scripts/local-target';

async function main() {
 const sql = postgres(localDatabaseUrl(), {max: 1, onnotice: () => {}});
 let passed = 0;
 const check = (value: unknown, name: string) => {assert.ok(value, name); passed++; console.log(`PASS ${name}`);};
 const rejects = async (query: () => Promise<unknown>, code: string, name: string) => {
   await assert.rejects(query, (e: unknown) => (e as {code: string}).code === code, name);
   passed++; console.log(`PASS ${name}`);
 };
 try {
  check((await sql`select count(*)::int n from information_schema.columns where table_schema='app' and table_name='application_profiles'`)[0].n === 11, 'profile has eleven frozen fields');
  check((await sql`select count(*)::int n from information_schema.columns where table_schema='app' and table_name='audit_events'`)[0].n === 11, 'audit has eleven frozen fields');
  await rejects(() => sql`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values (gen_random_uuid(),'Test','CITIZEN','ACTIVE')`, '23503','provider Auth FK enforced');
  await rejects(() => sql`insert into app.audit_events(actor_type,action,resource_type,resource_id) values ('USER','PROFILE_UPDATED','APPLICATION_PROFILE',gen_random_uuid())`, '23514','USER requires actor and role');
  await rejects(() => sql`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values ('SYSTEM','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',gen_random_uuid(),'{"source":"UNAPPROVED"}')`, '23514','SYSTEM source constrained');
  await rejects(() => sql`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values ('SYSTEM','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',gen_random_uuid(),'{}')`, '23514','SYSTEM source required');
  await rejects(() => sql`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values ('SYSTEM','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',gen_random_uuid(),'{"source":"LOCAL_DEVELOPMENT_FIXTURE","secret":"x"}')`, '23514','SYSTEM extra metadata rejected');
  for (const role of ['anon','authenticated','app_web','app_reader']) {
   for (const table of ['application_profiles','audit_events']) {
    check(!(await sql`select has_table_privilege(${role},${'app.'+table},'SELECT') allowed`)[0].allowed,`${role} cannot enumerate ${table}`);
   }
  }
  const roles = await sql`select rolname,rolsuper,rolbypassrls from pg_roles where rolname in ('app_web','app_reader','app_writer')`;
  check(roles.length === 3 && roles.every(r=> !r.rolsuper && !r.rolbypassrls),'application roles are not superuser/BYPASSRLS');
  const tables=await sql`select relrowsecurity,relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r'`;
  check(tables.every(t=>t.relrowsecurity && t.relforcerowsecurity),'RLS enabled and forced');
  await sql.begin(async tx => {
   const user = crypto.randomUUID();
   await tx`insert into auth.users(id) values (${user})`;
   const [profile]=await tx`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values (${user},'Local database test','CITIZEN','ACTIVE') returning *`;
   check(profile.preferred_language==='ar' && String(profile.security_epoch)==='1' && String(profile.revision)==='1','profile defaults');
   for (const [field,value] of [['role','OWNER'],['access_status','UNKNOWN'],['preferred_language','es'],['full_name',''],['contact_phone','javascript:bad']]) {
    await rejects(()=>tx.savepoint(t=>t`update app.application_profiles set ${t({[field]:value})} where id=${profile.id}`),'23514',`invalid ${field} rejected`);
   }
   await rejects(()=>tx.savepoint(t=>t`update app.application_profiles set security_epoch=0 where id=${profile.id}`),'23514','zero epoch rejected');
   await rejects(()=>tx.savepoint(t=>t`delete from auth.users where id=${user}`),'23503','Auth deletion restricted');
   await rejects(()=>tx.savepoint(t=>t`delete from app.application_profiles where id=${profile.id}`),'23514','profile hard deletion blocked');
   const [audit]=await tx`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values ('SYSTEM','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',gen_random_uuid(),'{"source":"LOCAL_DEVELOPMENT_FIXTURE"}') returning *`;
   check(audit.actor_id===null && audit.actor_role===null,'valid SYSTEM attribution');
   await rejects(()=>tx.savepoint(t=>t`update app.audit_events set reason='changed' where id=${audit.id}`),'23514','audit updates blocked');
   await rejects(()=>tx.savepoint(t=>t`delete from app.audit_events where id=${audit.id}`),'23514','audit deletion blocked');
   await rejects(()=>tx.savepoint(t=>t`truncate app.audit_events cascade`),'23514','audit truncate blocked');
   throw new Error('ROLLBACK_TEST_DATA');
  }).catch(e=>{if(e.message!=='ROLLBACK_TEST_DATA')throw e;});
  console.log(`Migration 1: ${passed} checks passed; test data rolled back.`);
 } finally {await sql.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
