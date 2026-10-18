import nodemailer from 'nodemailer';
import {restrictedDatabaseOptions} from '../../shared/db/options';
import type {MailTransport} from '../email/smtp';

export function assertLocalHealthConfiguration(env:{APP_ENV?:string;DATABASE_URL?:string},config:string,linked:boolean):string{
 try{
  if(env.APP_ENV!=='local'||linked||!/^project_id = "Abaynou_Tatawasal"$/m.test(config))throw new Error();
  const section=(name:string)=>config.split(`[${name}]`)[1]?.split('\n[')[0]??'';
  if(!/^port\s*=\s*54322\s*$/m.test(section('db'))||!/^smtp_port\s*=\s*54325\s*$/m.test(section('local_smtp')))throw new Error();
  const value=env.DATABASE_URL;if(!value)throw new Error();const url=new URL(value);
  restrictedDatabaseOptions(value,'app_web',{APP_ENV:'local'});
  if(url.pathname!=='/postgres'||url.search||url.hash)throw new Error();
  return value;
 }catch{throw new Error('LOCAL_HEALTH_CONFIGURATION_INVALID');}
}
export function localHealthAlertTransport():MailTransport{
 // Never consume SMTP_HOST/credentials: this command can send only to local Mailpit.
 const transport=nodemailer.createTransport({host:'127.0.0.1',port:54325,secure:false,pool:false,
  connectionTimeout:3000,greetingTimeout:3000,socketTimeout:5000});
 return {async send(message){await transport.sendMail(message);},close(){transport.close();}};
}
