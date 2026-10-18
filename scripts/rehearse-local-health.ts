import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {probeLocalDatabase,type ProbeResult} from '../src/server/monitoring/database';
import {assertLocalHealthConfiguration,localHealthAlertTransport} from '../src/server/monitoring/local';
import {runLocalMonitor} from '../src/server/monitoring/run';
import {withLocalMonitorStore} from '../src/server/monitoring/store';
import type {OutgoingMail,MailTransport} from '../src/server/email/smtp';

const mailpit='http://127.0.0.1:54324';
async function mailpitJson(path:string):Promise<unknown>{
 const response=await fetch(new URL(path,mailpit),{signal:AbortSignal.timeout(5000),redirect:'error'});
 if(!response.ok)throw new Error('LOCAL_REHEARSAL_MAILPIT_UNAVAILABLE');
 return response.json();
}
async function captured(message:OutgoingMail){
 const id=message.messageId.replace(/^<|>$/g,''),query=new URLSearchParams({query:`message-id:${id}`});
 for(let attempt=0;attempt<10;attempt++){
  const data=await mailpitJson(`/api/v1/search?${query}`) as {messages?:Array<{ID:string;MessageID:string}>;messages_count?:number};
  if(data.messages_count){
   assert.equal(data.messages_count,1);const item=data.messages?.[0];assert.ok(item);assert.equal(item.MessageID,id);
   const detail=await mailpitJson(`/api/v1/message/${encodeURIComponent(item.ID)}`) as {From?:{Address:string};To?:Array<{Address:string}>;Subject?:string;Text?:string;HTML?:string};
   assert.equal(detail.From?.Address,'health@abaynou.test');assert.deepEqual(detail.To?.map(to=>to.Address),['operator@abaynou.test']);
   assert.equal(detail.Subject,message.subject);assert.equal(detail.Text?.replaceAll('\r\n','\n').trim(),message.text.trim());assert.equal(detail.HTML?.trim(),message.html.trim());
   return {messageId:id,mailpitId:item.ID,subject:message.subject};
  }
  await new Promise(done=>setTimeout(done,200));
 }
 throw new Error('LOCAL_REHEARSAL_MESSAGE_NOT_CAPTURED');
}
async function main(){
 if(process.argv.includes('--help')){console.log('pnpm health:rehearse — isolated simulated incidents, five test messages to local Mailpit, then one real read-only database check. No scheduler or database outage.');return;}
 if(process.argv.length>2)throw new Error('LOCAL_REHEARSAL_ARGUMENT_INVALID');
 if(existsSync('.env.local'))process.loadEnvFile('.env.local');
 const databaseUrl=assertLocalHealthConfiguration({APP_ENV:process.env.APP_ENV,DATABASE_URL:process.env.DATABASE_URL},readFileSync('supabase/config.toml','utf8'),existsSync('supabase/.temp/project-ref'));
 // Preflight a nonexistent synthetic message ID; never list unrelated local mail.
 await mailpitJson('/api/v1/search?query=message-id%3Ahealth-rehearsal-preflight%40abaynou.test');
 const root=resolve('.local/monitoring');await mkdir(root,{recursive:true});const directory=await mkdtemp(join(root,'rehearsal-'));
 const smtp=localHealthAlertTransport(),sent:OutgoingMail[]=[],checks:Array<{name:string;result:'PASS'}>=[];
 const transport:MailTransport={async send(message){await smtp.send(message);sent.push(message);}};
 const start=Date.now(),day=24*60*60_000;
 try{
  await withLocalMonitorStore(directory,async store=>{
   async function scenario(name:string,statuses:Array<'PASS'|'FAIL'>,offset:number,kinds:string[],delivery:MailTransport=transport){
    const when=new Date(start+offset);let calls=0;
    const result=await runLocalMonitor({store,transport:delivery,now:()=>when,wait:async()=>{},probe:async():Promise<ProbeResult>=>{
     const status=statuses[calls++];assert.ok(status);return {status,category:status==='PASS'?'AVAILABLE':'UNREACHABLE',checkedAt:when.toISOString(),durationMs:0};
    }});
    assert.equal(calls,statuses.length);assert.deepEqual(result.accepted,kinds);assert.equal(result.check.status,statuses.at(-1));
    assert.equal(result.alerts,kinds.length?'accepted':delivery===transport?'not-needed':'failed');
    checks.push({name,result:'PASS'});console.log(`PASS | ${name}`);return result;
   }
   await scenario('Healthy check stays quiet',['PASS'],0,[]);
   await scenario('Transient failure recovers on retry without email',['FAIL','PASS'],1000,[]);
   await scenario('Persistent failure sends one failure alert',['FAIL','FAIL'],2000,['FAILURE']);
   await scenario('Repeated failure suppresses duplicate alert',['FAIL','FAIL'],3000,[]);
   await scenario('No reminder before 24 hours',['FAIL','FAIL'],day+1999,[]);
   await scenario('One reminder becomes eligible after 24 hours',['FAIL','FAIL'],day+2000,['REMINDER']);
   await scenario('Repeated check suppresses duplicate reminder',['FAIL','FAIL'],day+3000,[]);
   await scenario('Recovery sends one recovery alert',['PASS'],day+4000,['RECOVERY']);
   await scenario('Further healthy check stays quiet',['PASS'],day+5000,[]);
   // Inject only the transport rejection. Do not stop Mailpit or change global SMTP settings.
   await scenario('SMTP rejection retains the pending alert',['FAIL','FAIL'],day+6000,[],{async send(){throw new Error('SIMULATED_LOCAL_SMTP_FAILURE');}});
   const pending=(await store.read()).pending[0];assert.ok(pending);const expectedId=`<health-${pending.id}@abaynou.test>`;
   await scenario('Next run delivers pending alert using the same Message-ID',['FAIL','FAIL'],day+7000,['FAILURE']);
   assert.equal(sent.at(-1)?.messageId,expectedId);
   await scenario('Recovery after SMTP retry sends one recovery alert',['PASS'],day+8000,['RECOVERY']);
   const final=await store.read();assert.equal(final.incident,null);assert.equal(final.pending.length,0);
  });
  assert.equal(sent.length,5);
  const messages=[];for(const message of sent)messages.push(await captured(message));
  checks.push({name:'Five exact messages captured once each with expected sender, recipient and text/HTML',result:'PASS'});
  const realDatabase=await probeLocalDatabase(databaseUrl);assert.equal(realDatabase.status,'PASS');
  checks.push({name:'Real local database remains available with read-only probe',result:'PASS'});
  const evidence={rehearsal:'LOCAL ONLY',completedAt:new Date().toISOString(),simulatedClock:true,realDatabase,smtpAccepted:sent.length,mailpitVerified:messages.length,checks,messages};
  await writeFile(join(directory,'result.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(`PASS | ${checks.length} checks; ${messages.length} messages verified in Mailpit; real database AVAILABLE.`);
  console.log(`Evidence: ${relative(process.cwd(),join(directory,'result.json'))}`);
  console.log(`Mailpit: ${mailpit} — search to:operator@abaynou.test. No schedule, external mail or database outage.`);
 }finally{smtp.close?.();}
}
main().catch(()=>{console.error('FAIL | LOCAL_HEALTH_REHEARSAL_FAILED. No credentials or raw errors logged. Review isolated rehearsal state and local Mailpit availability.');process.exitCode=1;});
