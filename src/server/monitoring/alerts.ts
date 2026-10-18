import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {healthCategories,type HealthResult} from './database';
import type {OutgoingMail} from '../email/smtp';

const timestamp=z.iso.datetime(),category=z.enum(healthCategories);
const observation=z.strictObject({status:z.enum(['PASS','FAIL']),category,checkedAt:timestamp,durationMs:z.number().int().nonnegative(),attempts:z.union([z.literal(1),z.literal(2)])});
const notice=z.strictObject({id:z.uuid(),incidentId:z.uuid(),kind:z.enum(['FAILURE','REMINDER','RECOVERY']),failedAt:timestamp,observedAt:timestamp,category});
export const monitorStateSchema=z.strictObject({version:z.literal(1),lastCheck:observation.nullable(),
 incident:z.strictObject({id:z.uuid(),failedAt:timestamp,category,failureSentAt:timestamp.nullable(),lastNoticeAt:timestamp.nullable()}).nullable(),pending:z.array(notice).max(16)});
export type MonitorState=z.infer<typeof monitorStateSchema>;
export type HealthNotice=z.infer<typeof notice>;
export const initialMonitorState=():MonitorState=>({version:1,lastCheck:null,incident:null,pending:[]});
const day=24*60*60_000;
export function observeHealth(previous:MonitorState,result:HealthResult):MonitorState{
 const state=structuredClone(previous);state.lastCheck=result;
 if(result.status==='FAIL'){
  if(!state.incident){
   const id=randomUUID();state.incident={id,failedAt:result.checkedAt,category:result.category,failureSentAt:null,lastNoticeAt:null};
   state.pending.push({id:randomUUID(),incidentId:id,kind:'FAILURE',failedAt:result.checkedAt,observedAt:result.checkedAt,category:result.category});
  }else if(state.incident.lastNoticeAt&&Date.parse(result.checkedAt)-Date.parse(state.incident.lastNoticeAt)>=day&&!state.pending.some(item=>item.incidentId===state.incident!.id)){
   state.pending.push({id:randomUUID(),incidentId:state.incident.id,kind:'REMINDER',failedAt:state.incident.failedAt,observedAt:result.checkedAt,category:result.category});
  }
 }else if(state.incident){
  const incident=state.incident;
  // Never send an obsolete failure/reminder after the database has recovered.
  state.pending=state.pending.filter(item=>item.incidentId!==incident.id);
  if(incident.failureSentAt)state.pending.push({id:randomUUID(),incidentId:incident.id,kind:'RECOVERY',failedAt:incident.failedAt,observedAt:result.checkedAt,category:'AVAILABLE'});
  state.incident=null;
 }
 return monitorStateSchema.parse(state);
}
export function recordNoticeAccepted(previous:MonitorState,id:string,acceptedAt:string):MonitorState{
 const state=structuredClone(previous),item=state.pending[0];
 if(!item||item.id!==id)throw new Error('MONITOR_STATE_INVALID');
 state.pending.shift();
 if(state.incident?.id===item.incidentId&&item.kind!=='RECOVERY'){
  state.incident.failureSentAt??=acceptedAt;state.incident.lastNoticeAt=acceptedAt;
 }
 return monitorStateSchema.parse(state);
}
export function localAlertEmail(item:HealthNotice):OutgoingMail{
 const descriptions={FAILURE:'Database unavailable',REMINDER:'Database remains unavailable',RECOVERY:'Database connection restored'};
 const text=[`LOCAL TEST — ${descriptions[item.kind]}`,`Observed at: ${item.observedAt}`,`Incident began: ${item.failedAt}`,`Result: ${item.category}`,
  'Review the private local health-check history and the local Podman service.','This alert contains no database contents. SMTP acceptance does not prove inbox delivery.'].join('\n');
 return {from:'Abaynou local monitor <health@abaynou.test>',to:'operator@abaynou.test',subject:`[LOCAL] ${descriptions[item.kind]} — Abaynou Tatawasal`,text,
  html:`<p>${text.replaceAll('\n','<br>')}</p>`,messageId:`<health-${item.id}@abaynou.test>`};
}
