import postgres from 'postgres';
import {restrictedDatabaseOptions} from '../../shared/db/options';

export const healthCategories=['AVAILABLE','NOT_READY','TIMEOUT','UNREACHABLE','AUTHORIZATION','CHECK_FAILED'] as const;
export type HealthCategory=typeof healthCategories[number];
export type ProbeResult={status:'PASS'|'FAIL';category:HealthCategory;checkedAt:string;durationMs:number};
export type HealthResult=ProbeResult&{attempts:1|2};
export function failureCategory(error:unknown):HealthCategory{
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
 if(['57014','CONNECT_TIMEOUT','ETIMEDOUT'].includes(code))return 'TIMEOUT';
 if(['ECONNREFUSED','ECONNRESET','ENOTFOUND','EHOSTUNREACH','ENETUNREACH','CONNECTION_CLOSED','CONNECTION_DESTROYED','57P03'].includes(code))return 'UNREACHABLE';
 if(['28P01','28000','42501'].includes(code))return 'AUTHORIZATION';
 return 'CHECK_FAILED';
}
export async function probeLocalDatabase(databaseUrl:string):Promise<ProbeResult>{
 const started=performance.now();
 const sql=postgres(databaseUrl,{...restrictedDatabaseOptions(databaseUrl,'app_web',{APP_ENV:'local'}),max:1,connect_timeout:3,idle_timeout:1,max_lifetime:15,
  connection:{application_name:'abaynou_local_health',statement_timeout:2000,default_transaction_read_only:true}});
 let category:HealthCategory='CHECK_FAILED';
 // A hard client deadline also covers a connection that stalls after startup.
 let expired=false;const deadline=setTimeout(()=>{expired=true;void sql.end({timeout:0}).catch(()=>{});},6000);
 try{
  const [row]=await sql`select current_setting('transaction_read_only')='on' and exists(select 1 from app.read_public_settings('ar')) as ready`;
  category=row?.ready===true?'AVAILABLE':'NOT_READY';
 }catch(error){category=expired?'TIMEOUT':failureCategory(error);}
 finally{clearTimeout(deadline);await sql.end({timeout:1}).catch(()=>{});}
 return {status:category==='AVAILABLE'?'PASS':'FAIL',category,checkedAt:new Date().toISOString(),durationMs:Math.round(performance.now()-started)};
}
export async function checkWithRetry(probe:()=>Promise<ProbeResult>,wait:(milliseconds:number)=>Promise<void>=ms=>new Promise(done=>setTimeout(done,ms))):Promise<HealthResult>{
 const started=performance.now(),first=await probe();
 if(first.status==='PASS')return {...first,attempts:1};
 await wait(1000);
 const second=await probe();return {...second,attempts:2,durationMs:Math.round(performance.now()-started)};
}
