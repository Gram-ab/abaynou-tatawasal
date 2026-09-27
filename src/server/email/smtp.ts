import nodemailer from 'nodemailer';
export type OutgoingMail={to:string;from:string;subject:string;text:string;html:string;messageId:string};
export interface MailTransport{send(message:OutgoingMail):Promise<void>;close?():void;}
export function smtpTransport(input:{host:string;port:number;secure:boolean}):MailTransport{
 const transport=nodemailer.createTransport({host:input.host,port:input.port,secure:input.secure,pool:true,maxConnections:2,maxMessages:50});
 return {async send(message){await transport.sendMail(message);},close(){transport.close();}};
}
export function deliveryFailure(error:unknown){
 const value=error as {responseCode?:number;code?:string;command?:string};
 const permanent=typeof value.responseCode==='number'&&value.responseCode>=500;
 const network=['ETIMEDOUT','ECONNECTION','ECONNRESET','ESOCKET'].includes(value.code??'');
 return {retryable:!permanent,uncertain:network||value.command==='DATA'};
}
