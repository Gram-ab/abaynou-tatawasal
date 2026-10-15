import {execFileSync,spawn,type ChildProcess} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve,join} from 'node:path';
import postgres from 'postgres';
import './prepare-e2e-target';
import {e2eTarget,e2eWorkdir} from './e2e-target';
import {seedCatalogues} from './seed-catalogues';
import {seedPublicContent} from './seed-public-content';

const cli=resolve('node_modules/supabase/dist/supabase.js');
function run(command:string,args:string[],env=process.env){
 return execFileSync(command,args,{env,stdio:['ignore','pipe','pipe'],timeout:3_600_000,encoding:'utf8'});
}
function waitFor(url:string){return new Promise<void>(async(resolveWait,reject)=>{
 for(let i=0;i<120;i++){
  try{const response=await fetch(url);if(response.ok){resolveWait();return;}}catch{}
  await new Promise(done=>setTimeout(done,1000));
 }
 reject(new Error('Isolated application did not become ready'));
});}
async function main(){
 process.env.ABAYNOU_E2E_TARGET='disposable';
 console.log('Checking disposable Supabase project.');
 run(process.execPath,[cli,'start','--workdir',e2eWorkdir]);
 const target=e2eTarget();
 console.log('Resetting only the verified disposable database from frozen migrations.');
 run(process.execPath,[cli,'db','reset','--local','--workdir',e2eWorkdir,'--yes']);
 const podman=process.platform==='win32'?join(process.env.LOCALAPPDATA??'','Programs','Podman','podman.exe'):'podman';
 run(podman,['exec','supabase_db_Abaynou_Tatawasal_E2E','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c','GRANT USAGE ON SCHEMA auth TO app_writer;']);
 const db=postgres(target.adminDatabaseUrl,{max:1,onnotice:()=>{}});
 const webPassword=randomBytes(32).toString('hex'),mailerPassword=randomBytes(32).toString('hex');
 try{
  console.log('Seeding only the disposable database.');
  await seedCatalogues(db);await seedPublicContent(db);
  await db.unsafe(`alter role app_web password '${webPassword}'`);
  await db.unsafe(`alter role app_mailer password '${mailerPassword}'`);
 }finally{await db.end();}
 const webUrl=new URL(target.adminDatabaseUrl);webUrl.username='app_web';webUrl.password=webPassword;
 const mailerUrl=new URL(target.adminDatabaseUrl);mailerUrl.username='app_mailer';mailerUrl.password=mailerPassword;
 const env={...process.env,APP_ENV:'e2e',APP_ORIGIN:target.appOrigin,DATABASE_URL:webUrl.href,MAILER_DATABASE_URL:mailerUrl.href,SUPABASE_URL:target.apiUrl,SUPABASE_PUBLISHABLE_KEY:target.anonKey,SUPABASE_SERVICE_ROLE_KEY:target.serviceRoleKey,AUTH_COOKIE_SECRET:randomBytes(32).toString('base64url'),COMMAND_FINGERPRINT_SECRET:randomBytes(32).toString('hex'),SMTP_HOST:'127.0.0.1',SMTP_PORT:'55325',SMTP_SECURE:'false',MAIL_FROM:'Abaynou Tatawasal <no-reply@abaynou.test>',ABAYNOU_E2E_TARGET:'disposable',E2E_APP_ORIGIN:target.appOrigin,E2E_MAILPIT_ORIGIN:target.mailpitOrigin,E2E_APP_DATABASE_PASSWORD:webPassword};
 const children:ChildProcess[]=[];
 try{
  console.log('Building the application with disposable E2E endpoints.');
  run(process.execPath,[resolve('node_modules/next/dist/bin/next'),'build'],env);
  console.log('Starting isolated application and email worker.');
  children.push(spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','55300'],{env,stdio:'ignore'}));
  const worker=spawn(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),'scripts/process-email-outbox.ts','--watch'],{env,stdio:'ignore'});children.push(worker);
  await waitFor(target.appOrigin+'/en');
  if(worker.exitCode!==null)throw new Error('Isolated email worker exited before E2E');
  console.log('Isolated Auth, Postgres, Mailpit, application, and email worker are ready. Running targeted route checks.');
  console.log(run(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),'scripts/check-unavailable-e2e.ts'],env));
  console.log('Targeted unavailable-route browser checks passed. Running the full current suite once.');
  const args=process.argv.slice(2).filter(arg=>arg!=='--measure');
  console.log(run(process.execPath,[resolve('node_modules/@playwright/test/cli.js'),'test',...args],env));
  console.log('Isolated E2E suite passed.');
  if(process.argv.includes('--measure')){
   worker.kill();await new Promise<void>(resolveStop=>{if(worker.exitCode!==null)resolveStop();else worker.once('exit',()=>resolveStop());});
   console.log('Running query/capacity measurements only on disposable synthetic data.');
   console.log(run(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),'scripts/measure-quality.ts'],env));
  }
 }finally{for(const child of children)child.kill();}
}
main().catch(error=>{console.error(`Isolated E2E stopped: ${error instanceof Error?error.message:'unknown failure'}`);process.exitCode=1;});
