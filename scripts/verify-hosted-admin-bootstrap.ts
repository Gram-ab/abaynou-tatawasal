import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import postgres from 'postgres';

let stage='local target guard';
async function main(){
 // This SQL-only verifier needs the database container, not the Auth/API stack.
 assert.ok(!existsSync('supabase/.temp/project-ref'));
 const config=readFileSync('supabase/config.toml','utf8');
 assert.match(config,/^project_id = "Abaynou_Tatawasal"$/m);
 assert.match(config.split('[db]')[1]?.split('\n[')[0]??'',/^port\s*=\s*54322$/m);
 const status=JSON.parse(execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const target=new URL(status.DB_URL);
 assert.ok(['127.0.0.1','localhost'].includes(target.hostname)&&target.protocol==='postgresql:'&&target.port==='54322'&&target.pathname==='/postgres');
 target.username='supabase_admin';
 const root=postgres(target.href,{max:1,onnotice:()=>{}}),name=`initial_admin_verify_${randomUUID().replaceAll('-','')}`;
 assert.match(name,/^initial_admin_verify_[a-f0-9]{32}$/u);
 let db:ReturnType<typeof postgres>|undefined,created=false,passed=0;
 const check=(ok:unknown,label:string)=>{stage=label;assert.ok(ok,label);passed++;console.log(`PASS ${label}`);};
 try{
  stage='scratch reconstruction';await root.unsafe(`create database "${name}"`);created=true;target.pathname='/'+name;
  db=postgres(target.href,{max:3,onnotice:()=>{}});const owner=db;
  await owner.unsafe("create schema extensions;create extension pgcrypto with schema extensions;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb,raw_app_meta_data jsonb default '{}'::jsonb);alter table auth.users enable row level security");
  const migrations=readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort();
  assert.equal(migrations.length,28);
  const ddl=await owner.reserve();try{for(const file of migrations){stage=`reconstructing ${file}`;await ddl.unsafe(readFileSync(`supabase/migrations/${file}`,'utf8').replace(/^create role app_(web|reader|writer) .*;\r?$/gm,'').replace(/^grant app_mail_worker to postgres;\r?$/gm,''));}}finally{ddl.release();}
  await owner.unsafe('grant usage on schema auth,app to postgres;grant select on auth.users to postgres;grant select,insert on app.application_profiles,app.audit_events to postgres');
  check(true,'28 migrations reconstruct without modifying frozen sources');
  const identity=async()=>{const id=randomUUID(),operation=randomUUID(),email=`${randomUUID()}@example.invalid`;await owner`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values(${id},${email},now(),${owner.json({hosted_initial_admin_bootstrap:operation})})`;return {id,operation,email};};
  const first=await identity(),second=await identity();
  const sql=readFileSync('deployment/supabase/08-initial-admin.sql','utf8');
  const bootstrap=(input:Awaited<ReturnType<typeof identity>>,role='postgres')=>owner.begin(async tx=>{
   assert.ok(['postgres','app_web'].includes(role));await tx.unsafe(`set local role ${role}`);
   await tx`select set_config('bootstrap.auth_id',${input.id},true),set_config('bootstrap.email',${input.email},true),set_config('bootstrap.full_name','Synthetic initial Admin',true),set_config('bootstrap.language','ar',true),set_config('bootstrap.operation',${input.operation},true)`;
   await tx.unsafe(sql);
  });
  const denied=async(run:()=>Promise<unknown>,code:string,label:string)=>{stage=label;await assert.rejects(run,e=>(e as {code?:string}).code===code);passed++;console.log(`PASS ${label}`);};
  await denied(()=>bootstrap({...first,operation:randomUUID()}),'42501','unmarked or mismatched Auth identity cannot become Admin');
  await denied(()=>bootstrap(first,'app_web'),'42501','runtime role cannot invoke the owner-only initializer');
  const citizen=await identity();await owner`insert into app.application_profiles(auth_user_id,full_name,role,access_status) values(${citizen.id},'Synthetic citizen','CITIZEN','ACTIVE')`;
  await denied(()=>bootstrap(citizen),'23514','existing Citizen identity cannot be converted');
  check((await owner`select count(*)::int n from app.application_profiles where role='ADMIN'`)[0].n===0,'rejected attempts leave no Admin profile');
  const results=await Promise.allSettled([bootstrap(first),bootstrap(second)]);
  check(results.filter(r=>r.status==='fulfilled').length===1&&results.filter(r=>r.status==='rejected'&&(r.reason as {code?:string}).code==='23514').length===1,'concurrent initializers create exactly one Admin');
  const [state]=await owner`select (select count(*)::int from app.application_profiles where role='ADMIN' and access_status='ACTIVE' and preferred_language='ar') admins,(select count(*)::int from app.audit_events where actor_type='SYSTEM' and action='STAFF_CREATED' and change_summary=jsonb_build_object('source','HOSTED_INITIAL_ADMIN_BOOTSTRAP','role','ADMIN')) audit,(select count(*)::int from app.application_sessions) sessions`;
  check(state.admins===1&&state.audit===1&&state.sessions===0,'Admin language/status, one bootstrap audit and no sessions verified');
  await denied(()=>bootstrap(first),'23514','repeat bootstrap cannot create or replace another Admin');
  await denied(()=>owner.begin(async tx=>{await tx.unsafe('set local role app_writer');await tx`insert into app.audit_events(actor_type,action,resource_type,resource_id,reason,change_summary) values('SYSTEM','STAFF_CREATED','APPLICATION_PROFILE',${randomUUID()},'Synthetic owner setup',${tx.json({source:'HOSTED_INITIAL_ADMIN_BOOTSTRAP',role:'ADMIN'})})`;}),'42501','new audit provenance does not grant runtime insertion permission');
  await denied(()=>owner`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values('SYSTEM','STAFF_CREATED','APPLICATION_PROFILE',${randomUUID()},${owner.json({source:'HOSTED_INITIAL_ADMIN_BOOTSTRAP',role:'ADMIN'})})`,'23514','hosted bootstrap audit requires a reason');
  console.log(`Initial Admin bootstrap: ${passed} checks passed.`);
 }finally{await db?.end();if(created)await root.unsafe(`drop database "${name}" with (force)`);await root.end();}
}
main().catch(error=>{console.error(`Initial Admin verification failed at ${stage}; no credentials or query values printed.`);if(stage.startsWith('reconstructing '))console.error(String((error as {message?:string}).message??''));process.exitCode=1;});
