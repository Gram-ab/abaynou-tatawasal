import {checkWithRetry,type ProbeResult,type HealthResult} from './database';
import {localAlertEmail,observeHealth,recordNoticeAccepted,type HealthNotice} from './alerts';
import type {MailTransport} from '../email/smtp';
import type {MonitorStore} from './store';

export type MonitorRun={check:HealthResult;alerts:'disabled'|'accepted'|'not-needed'|'failed';accepted:HealthNotice['kind'][]};
export async function runLocalMonitor(input:{store:MonitorStore;probe:()=>Promise<ProbeResult>;transport?:MailTransport;wait?:(milliseconds:number)=>Promise<void>;now?:()=>Date}):Promise<MonitorRun>{
 const previous=await input.store.read(),check=await checkWithRetry(input.probe,input.wait),accepted:HealthNotice['kind'][]=[];
 let state=observeHealth(previous,check);await input.store.write(state);
 let alerts:MonitorRun['alerts']=input.transport?'not-needed':'disabled';
 if(input.transport){
  while(state.pending.length){
   const item=state.pending[0];
   try{await input.transport.send(localAlertEmail(item));}
   catch{alerts='failed';break;}
   // If state storage fails after SMTP acceptance, stop instead of hiding the problem.
   // The persisted message ID is reused on retry; SMTP cannot guarantee exactly-once delivery.
   state=recordNoticeAccepted(state,item.id,(input.now?.()??new Date()).toISOString());await input.store.write(state);
   accepted.push(item.kind);alerts='accepted';
  }
 }
 await input.store.append({check,alerts,accepted:accepted.length});
 return {check,alerts,accepted};
}
