import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';

export type Intent={tokenHash:string;type:'signup'|'recovery'|'email_change';locale:'ar'|'fr'|'en';expires:number};
function key(){const raw=process.env.AUTH_COOKIE_SECRET;if(!raw)throw new Error('Auth cookie secret unavailable');return createHash('sha256').update(raw).digest();}
export function sealData(value:object){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');
}
export function openData<T extends {expires:number}>(value:string|undefined):T|null{
 try{if(!value)return null;const raw=Buffer.from(value,'base64url');if(raw.length<29)return null;const decipher=createDecipheriv('aes-256-gcm',key(),raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));const result=JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString()) as T;if(result.expires<Date.now())return null;return result;}catch{return null;}
}
export const sealIntent=(value:Intent)=>sealData(value);
export function openIntent(value:string|undefined):Intent|null{const result=openData<Intent>(value);return result&&['signup','recovery','email_change'].includes(result.type)&&['ar','fr','en'].includes(result.locale)&&result.tokenHash?result:null;}
export function constantEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
