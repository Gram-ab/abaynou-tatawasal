import {drainEmailOutbox} from '../src/server/email/outbox';
process.loadEnvFile('.env.local');
const watch=process.argv.includes('--watch');
async function run(){
 const result=await drainEmailOutbox();
 console.log(`Outbox drain: ${result.claimed} claimed, ${result.sent} sent, ${result.retried} retry, ${result.held} held, ${result.stale} stale.`);
}
async function main(){
 if(!watch){await run();return;}
 let stopping=false;process.once('SIGINT',()=>{stopping=true;});process.once('SIGTERM',()=>{stopping=true;});
 while(!stopping){await run();await new Promise(resolve=>setTimeout(resolve,5000));}
}
main().catch(()=>{console.error('Outbox worker failed without exposing message or recipient data.');process.exitCode=1;});
