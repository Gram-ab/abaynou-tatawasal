import postgres from 'postgres';
import {restrictedDatabaseOptions} from '../../shared/db/options';
import {receiptEmail,lifecycleEmail,type ReceiptLocale} from './templates';
import {deliveryFailure,smtpTransport,type MailTransport} from './smtp';

type Job={id:string;event_type:'RECEIPT'|'RESPONSE'|'CLOSURE';language:ReceiptLocale;target_email:string;reference:string;lease_token:string};
export type DrainResult={claimed:number;sent:number;retried:number;held:number;stale:number};
function configuration(){
 const database=process.env.MAILER_DATABASE_URL,origin=process.env.APP_ORIGIN,host=process.env.SMTP_HOST,from=process.env.MAIL_FROM;
 const port=Number(process.env.SMTP_PORT),secure=process.env.SMTP_SECURE==='true';
 if(!database||!origin||!host||!from||!Number.isInteger(port)||port<1||port>65535)throw new Error('Mail worker configuration unavailable');
 return {database,origin:new URL(origin).origin,host,port,secure,from};
}
export function createEmailOutboxDrainer(options:{transport?:MailTransport}={}){
 const config=configuration(),sql=postgres(config.database,restrictedDatabaseOptions(config.database,'app_mailer'));
 const transport=options.transport??smtpTransport(config);
 return {
  async drain():Promise<DrainResult>{
   const result:DrainResult={claimed:0,sent:0,retried:0,held:0,stale:0};
   const jobs=await sql<Job[]>`select * from app.claim_email_outbox(20,120)`;result.claimed=jobs.length;
   for(const job of jobs){
    try{
     const email=job.event_type==='RECEIPT'?receiptEmail({language:job.language,reference:job.reference,origin:config.origin}):lifecycleEmail({language:job.language,reference:job.reference,origin:config.origin,eventType:job.event_type});
     await transport.send({to:job.target_email,from:config.from,subject:email.subject,text:email.text,html:email.html,messageId:`<${job.id}@abaynou.test>`});
     const [done]=await sql`select app.complete_email_outbox(${job.id},${job.lease_token}) completed`;
     if(done?.completed)result.sent++;else result.stale++;
    }catch(error){
     const failure=deliveryFailure(error);const [row]=await sql`select app.fail_email_outbox(${job.id},${job.lease_token},${failure.retryable},${failure.uncertain}) status`;
     if(row?.status==='RETRY')result.retried++;else if(row?.status==='HELD')result.held++;else result.stale++;
    }
   }
   return result;
  },
  async close(){try{transport.close?.();}finally{await sql.end();}}
 };
}
export async function drainEmailOutbox(options:{transport?:MailTransport}={}):Promise<DrainResult>{
 const worker=createEmailOutboxDrainer(options);
 try{return await worker.drain();}finally{await worker.close();}
}
