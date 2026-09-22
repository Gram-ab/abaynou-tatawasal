import 'server-only';
import {cookies} from 'next/headers';
import {openData,sealData} from './sealed-intent';

const COOKIE='abaynou_pending_signup';
type PendingSignup={email:string;expires:number};

export async function storePendingSignup(email:string){
 const store=await cookies();
 store.set(COOKIE,sealData({email,expires:Date.now()+24*60*60_000}),{httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:86400});
}
export async function readPendingSignup(){return openData<PendingSignup>((await cookies()).get(COOKIE)?.value);}
export async function clearPendingSignup(){(await cookies()).delete(COOKIE);}
export function maskEmail(email:string){
 const [local,domain]=email.split('@');
 if(!local||!domain)return '••••';
 return `${local.slice(0,1)}${'•'.repeat(Math.min(Math.max(local.length-1,4),8))}@${domain}`;
}
