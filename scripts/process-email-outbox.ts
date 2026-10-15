import {createEmailOutboxDrainer,drainEmailOutbox,type DrainResult} from '../src/server/email/outbox';
import {outboxPollDelay} from '../src/server/email/poll-delay';
if(process.env.APP_ENV!=='e2e')process.loadEnvFile('.env.local');
const watch=process.argv.includes('--watch');
function report(result:DrainResult){console.log(`Outbox drain: ${result.claimed} claimed, ${result.sent} sent, ${result.retried} retry, ${result.held} held, ${result.stale} stale.`);}
async function main(){
 if(!watch){report(await drainEmailOutbox());return;}
 const worker=createEmailOutboxDrainer(),maximum=process.env.APP_ENV==='e2e'?5000:60000;
 let stopping=false,delay=2500,wake:(()=>void)|undefined;
 const stop=()=>{stopping=true;wake?.();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{
  while(!stopping){
   const result=await worker.drain();if(result.claimed)report(result);
   delay=outboxPollDelay(delay,result.claimed,maximum);
   if(!stopping)await new Promise<void>(resolve=>{const timer=setTimeout(resolve,delay);wake=()=>{clearTimeout(timer);resolve();};});
  }
 }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);await worker.close();}
}
main().catch(()=>{console.error('Outbox worker failed without exposing message or recipient data.');process.exitCode=1;});
