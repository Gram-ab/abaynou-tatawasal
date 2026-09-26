import {execFileSync} from 'node:child_process';
import {readFileSync,appendFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import postgres from 'postgres';
import {localDatabaseUrl} from './local-target';
import {seedCatalogues} from './seed-catalogues';
import {ensureLocalComplaintAuthUsage} from './local-complaint-auth-grant';

// Additive local review upgrade only. No reset, Auth fixture creation or public publication.
process.env.DOCKER_HOST='npipe:////./pipe/podman-machine-default';
process.env.PATH=join(process.env.LOCALAPPDATA??'','Programs','Podman')+';'+process.env.PATH;
async function main(){
 const db=postgres(localDatabaseUrl(),{max:1,onnotice:()=>{}});
 try{
  const identities=await db`select id from auth.users order by id`;
  execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'migration','up','--local'],{stdio:'inherit'});
  if(process.argv.includes('--refresh-unfrozen-command')){
   // Explicit local DEV-04A refinement only; no frozen migration or persisted data is rewritten.
   const migration=readFileSync('supabase/migrations/20260926000300_complaint_commands.sql','utf8');
   const command=migration.match(/create function app\.submit_complaint\([\s\S]*?end \$\$;/)?.[0];
   if(!command)throw new Error('Submission command definition unavailable');
   await db.begin(async tx=>{await tx`grant create on schema app to app_writer`;await tx.unsafe(command.replace('create function','create or replace function'));await tx`revoke create on schema app from app_writer`;});
  }
  ensureLocalComplaintAuthUsage();
  if(!(await db`select has_schema_privilege('app_writer','auth','USAGE') allowed`)[0].allowed)throw new Error('Auth schema usage unavailable');
  await seedCatalogues(db);
  const after=await db`select id from auth.users order by id`;
  if(JSON.stringify(identities)!==JSON.stringify(after))throw new Error('Local identity preservation check failed');
  execFileSync('git',['check-ignore','--quiet','.env.local'],{stdio:'ignore'});
  const prior=readFileSync('.env.local','utf8');
  const existing=prior.match(/^COMMAND_FINGERPRINT_SECRET=(.+)$/m)?.[1];
  if(existing&&!/^[a-f0-9]{64}$/.test(existing))throw new Error('Invalid existing fingerprint configuration');
  if(!existing)appendFileSync('.env.local',`${prior.endsWith('\n')?'':'\n'}COMMAND_FINGERPRINT_SECRET=${randomBytes(32).toString('hex')}\n`);
  console.log('Local additive upgrade complete. Existing identities preserved; catalogue initialized; fingerprint configuration stored only in ignored local configuration.');
 }finally{await db.end();}
}
main().catch(()=>{console.error('Local additive upgrade failed; no reset was attempted.');process.exitCode=1;});
