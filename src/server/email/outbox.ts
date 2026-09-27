import postgres from 'postgres';
import {receiptEmail,type ReceiptLocale} from './templates';
import {deliveryFailure,smtpTransport,type MailTransport} from './smtp';
type Job={id:string;event_type:'RECEIPT';language:ReceiptLocale;target_email:string;reference:string;lease_token:string};
export type DrainResult={claimed:number;sent:number;retried:number;held:number;stale:number};
function configuration(){
 const database=process.env.MAILER_DATABASE_URL,origin=process.env.APP_ORIGIN,host=process.env.SMTP_HOST,from=process.env.MAIL_FROM;
 const port=Number(process.env.SMTP_PORT),secure=process.env.SMTP_SECURE==='true';
 if(!database||!origin||!host||!from||!Number.isInteger(port)||port<1||port>65535)throw new Error('Mail worker configuration unavailable');
 const url=new URL(database);if(url.username!=='app_mailer')throw new Error('Restricted mailer identity required');
 if(process.env.APP_ENV==='local'&&!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Local mailer database must use loopback');
 return {database,origin:new URL(origin).origin,host,port,secure,from};
}
export async function drainEmailOutbox(options:{transport?:MailTransport}={}):Promise<DrainResult>{
 const config=configuration(),sql=postgres(config.database,{max:1,connect_timeout:5,idle_timeout:5,onnotice:()=>{},connection:{statement_timeout:5000}});
 const transport=options.transport??smtpTransport(config),result:DrainResult={claimed:0,sent:0,retried:0,held:0,stale:0};
 try{
  const jobs=await sql<Job[]>`select * from app.claim_email_outbox(20,120)`;result.claimed=jobs.length;
  for(const job of jobs){
   try{
    if(job.event_type!=='RECEIPT')throw Object.assign(new Error('Unsupported mail category'),{responseCode:550});
    const email=receiptEmail({language:job.language,reference:job.reference,origin:config.origin});
    await transport.send({to:job.target_email,from:config.from,subject:email.subject,text:email.text,html:email.html,messageId:`<${job.id}@abaynou.test>`});
    const [done]=await sql`select app.complete_email_outbox(${job.id},${job.lease_token}) completed`;
    if(done?.completed)result.sent++;else result.stale++;
   }catch(error){
    const failure=deliveryFailure(error);const [row]=await sql`select app.fail_email_outbox(${job.id},${job.lease_token},${failure.retryable},${failure.uncertain}) status`;
    if(row?.status==='RETRY')result.retried++;else if(row?.status==='HELD')result.held++;else result.stale++;
   }
  }
  return result;
 }finally{transport.close?.();await sql.end();}
}
