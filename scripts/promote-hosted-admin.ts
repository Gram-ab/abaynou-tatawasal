import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {parseArgs} from 'node:util';
import {PromotionError,promoteHostedStaff} from './hosted-staff-promotion';
import {hostedPromotionProject,promotionConfiguration,promotionProvider,promotionPublicKey,promotionStore} from './hosted-promotion-runtime';

class ToolCancelled extends Error {}
async function question(prompt:ReturnType<typeof createInterface>,label:string){
 const cancellation=new AbortController();
 const interrupt=()=>cancellation.abort();
 prompt.once('SIGINT',interrupt);
 try{return await prompt.question(label,{signal:cancellation.signal});}
 catch(error){if(cancellation.signal.aborted)throw new ToolCancelled();throw error;}
 finally{prompt.off('SIGINT',interrupt);}
}
async function hiddenInput(label:string){
 if(!stdin.isTTY)throw new Error('Interactive terminal required');
 stdout.write(label);stdin.setEncoding('utf8');stdin.setRawMode(true);stdin.resume();
 return new Promise<string>((resolve,reject)=>{
  let value='';
  const finish=()=>{stdin.off('data',input);stdin.setRawMode(false);stdin.pause();stdout.write('\n');};
  const input=(chunk:string)=>{for(const character of chunk){if(character==='\u0003'||character==='\u0004'){finish();reject(new ToolCancelled());return;}if(character==='\r'||character==='\n'){finish();resolve(value);return;}if(character==='\u007f'||character==='\b')value=Array.from(value).slice(0,-1).join('');else if(character>=' '){if(value.length>=4096){finish();reject(new Error('Input too long'));return;}value+=character;}}};
  stdin.on('data',input);
 });
}
const errors={
 invalid_input:'Check the two distinct email addresses, staff password policy and required reason (3–1000 characters).',
 authentication:'Fresh verified Admin authentication failed.',admin_required:'A currently active Administrator is required.',
 target_ineligible:'The target must be an active Agent who has accepted the invitation and completed password setup.',
 expired:'Confirmation took more than five minutes. Run again and authenticate afresh.',conflict:'The target changed. Review its current details before trying again.',
 unconfirmed_result:'The command result could not be confirmed. Check the staff account before retrying.',operation_failed:'The operation could not be confirmed. Check connectivity and the staff account before retrying.',
 cleanup_failed:'CLI session cleanup could not be confirmed. Check the account and sessions before retrying.',
 promoted_cleanup_failed:'Promotion committed, but CLI session cleanup could not be confirmed. Do not repeat the promotion; review the sessions.'
} as const;
async function main(){
 const {values}=parseArgs({options:{help:{type:'boolean'},check:{type:'boolean'}}});
 if(values.help){console.log('pnpm staff:promote:hosted [--check]\nPromotes one activated Agent through the existing audited authority command.\nRequires the pinned hosted workspace/CA, Supabase CLI login, an active Admin login and the restricted app_web database password.\nPasswords are entered only at hidden interactive prompts. --check performs offline configuration checks without signing in or changing an account.');return;}
 const config=promotionConfiguration();
 if(values.check){console.log(`PASS: pinned project ${hostedPromotionProject}; Ireland session pooler; restricted app_web identity; verified public CA. No network, authentication or account change performed.`);return;}
 if(!stdin.isTTY||!stdout.isTTY)throw new Error('Interactive terminal required');
 console.log(`Hosted project: ${hostedPromotionProject} (Ireland). Operation: promote an activated Agent to Admin.`);
 const questions=createInterface({input:stdin,output:stdout});
 let adminEmail:string,targetEmail:string,reason:string;
 try{adminEmail=await question(questions,'Your current Admin email: ');targetEmail=await question(questions,'Agent email to promote: ');reason=await question(questions,'Required reason: ');}finally{questions.close();}
 const key=promotionPublicKey();
 const password=await hiddenInput('Your current Admin password (hidden): ');
 const databasePassword=await hiddenInput('Restricted app_web database password saved during deployment (hidden): ');
 const {store,close}=promotionStore(config,databasePassword);
 try{
  const result=await promoteHostedStaff({adminEmail,targetEmail,reason,password},{store,provider:promotionProvider(key),confirm:async target=>{
   console.log(`Target: ${JSON.stringify(target.fullName)} <${target.email}>\nProfile: ${target.profileId}; revision: ${target.revision}\nRole: AGENT → ADMIN; status: ACTIVE\nReason: ${JSON.stringify(reason.trim())}\nThe target's application sessions will be revoked; they must sign in again.`);
   const prompt=createInterface({input:stdin,output:stdout});
   try{return (await question(prompt,`Type PROMOTE ${target.email} to confirm (anything else cancels): `)).trim()===`PROMOTE ${target.email}`;}catch(error){if(error instanceof ToolCancelled)return false;throw error;}finally{prompt.close();}
  }});
  console.log(result.status==='promoted'?'Promotion completed with audit evidence. The new Admin must sign in again.':'Cancelled. No role change was made.');
 }finally{await close();}
}
main().catch(error=>{if(error instanceof ToolCancelled){console.log('Cancelled before authentication.');return;}console.error(error instanceof PromotionError?errors[error.code]:'Promotion tool stopped safely. Check the pinned workspace, CLI login, verified certificate and interactive inputs. No credentials or private diagnostics were printed.');process.exitCode=1;});
