import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {localDatabaseUrl} from './local-target';
import {seedCatalogues} from './seed-catalogues';
import {developmentPages,developmentSettings} from '../fixtures/public-content';

// Isolated, schema-only reconstruction. Existing owner-review accounts are never copied or reset.
const podman=join(process.env.LOCALAPPDATA??'','Programs','Podman','podman.exe');
process.env.DOCKER_HOST='npipe:////./pipe/podman-machine-default';
process.env.PATH=join(process.env.LOCALAPPDATA??'','Programs','Podman')+';'+process.env.PATH;
async function main(){
 const notificationsOnly=process.argv.includes('--notifications-only');
 const dev05Only=process.argv.includes('--dev05-only');
 const dev06Only=process.argv.includes('--dev06-only');
 const source=localDatabaseUrl(),admin=postgres(source,{max:1,onnotice:()=>{}});
 const name=`dev04a_verify_${randomUUID().replaceAll('-','')}`;
 let scratch:ReturnType<typeof postgres>|undefined;
 try{
  const container='supabase_db_Abaynou_Tatawasal';
  const schema=execFileSync(podman,['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=auth','--no-owner','--no-privileges'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  await admin.unsafe(`create database "${name}"`);
  const target=new URL(source);target.pathname='/'+name;scratch=postgres(target.href,{max:1,onnotice:()=>{}});
  await scratch.unsafe('create schema extensions; create extension pgcrypto with schema extensions');
  // pg_dump 17+ client safety commands are psql-only, not SQL.
  await scratch.unsafe(schema.split('\n').filter(line=>!line.startsWith('\\')).join('\n').replace(/^CREATE POLICY (?:complaint_verified_identity|mail_worker_identity|staff_admin_provider_read)\b[\s\S]*?;\r?\n/gm,''));
  // pg_dump disables RLS for restoration; runtime security-definer functions require it enabled.
  await scratch.unsafe('set row_security = on');
  for(const file of readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')).sort()){
   let migration=readFileSync(join('supabase/migrations',file),'utf8');
   // Roles are cluster-wide and already provisioned by DEV-01. Do not recreate or change them.
   migration=migration.replace(/^create role app_(web|reader|writer) .*;\r?$/gm,'');
   await scratch.unsafe(migration);console.log(`PASS isolated migration ${file}`);
  }
  for(const [key,bundle] of Object.entries(developmentPages))await scratch`select app.publish_development_page(${key},1,${scratch.json(bundle)})`;
  await scratch`select app.configure_development_settings(0,'+00000000000','commune@example.invalid','https://chikaya.ma/',${scratch.json(developmentSettings)})`;
  await seedCatalogues(scratch);await seedCatalogues(scratch);
  console.log('PASS isolated canonical reconstruction and idempotent rerun');
  for(const test of notificationsOnly||dev05Only||dev06Only?[]:['foundation','public-boundary','citizen-boundary','commune-boundary']){
   console.log(`RUN isolated ${test}`);
   execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs',`tests/database/${test}.ts`],{stdio:'inherit',env:{...process.env,DEV04A_VERIFICATION_DATABASE:name}});
  }
  if(!notificationsOnly&&!dev05Only){console.log('RUN isolated complaint-boundary');const {verifyComplaints}=await import('../tests/database/complaint-boundary');await verifyComplaints(target.href);}
  if(!notificationsOnly&&!dev06Only){console.log('RUN isolated dev05-boundary');const {verifyDev05}=await import('../tests/database/dev05-boundary');await verifyDev05(target.href);}
  if(!notificationsOnly&&!dev05Only){console.log('RUN isolated dev06-boundary');const {verifyDev06}=await import('../tests/database/dev06-boundary');await verifyDev06(target.href);}
  if(!dev05Only){console.log('RUN isolated notification-boundary');const {verifyNotifications}=await import('../tests/database/notification-boundary');await verifyNotifications(target.href);}
  if(!notificationsOnly&&!dev05Only&&!dev06Only){console.log('RUN isolated dev07-boundary');const {verifyDev07}=await import('../tests/database/dev07-boundary');await verifyDev07(target.href);}
  console.log(`PASS complete isolated ${dev06Only?'DEV-06':dev05Only?'DEV-05':notificationsOnly?'DEV-04B':'complaint database'} verification`);
 }finally{
  await scratch?.end();
  await admin.unsafe(`drop database if exists "${name}" with (force)`);await admin.end();
 }
}
main().catch(error=>{console.error('Isolated complaint verification failed:',error.code??'',error.message);process.exitCode=1;});
