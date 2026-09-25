import 'server-only';
import {authEvent} from './telemetry';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {verifiedProviderIdentity} from './provider';
import {digestSessionSecret,readSessionSecret} from '@/server/sessions/cookie';
import {resolveUserSession} from '@/server/identity/repository';
import {isStaff} from '@/features/commune-auth/model';
export type ApplicationUser={state:string;role:'CITIZEN'|'AGENT'|'ADMIN';authUserId:string;email:string;providerSessionId:string;sessionId:string;profileId:string;fullName:string;phone:string|null;language:'ar'|'fr'|'en';revision:number;absoluteExpiresAt:string;secret:string;digest:Buffer};
export async function currentApplicationUser(activity=false):Promise<ApplicationUser|null>{
 const secret=await readSessionSecret();if(!secret)return null;
 const identity=await verifiedProviderIdentity();if(!identity)return null;
 const h=await headers();const meaningful=activity&&!h.has('next-router-prefetch')&&!['prefetch','prerender'].includes(h.get('purpose')??'')&&!h.get('sec-purpose')?.includes('prefetch');
 const digest=digestSessionSecret(secret),row=await resolveUserSession(identity.authUserId,identity.providerSessionId,digest,meaningful);if(!row)return null;
 return {state:row.state,role:row.role,authUserId:identity.authUserId,email:identity.email,providerSessionId:identity.providerSessionId,sessionId:row.session_id,profileId:row.profile_id,fullName:row.full_name,phone:row.contact_phone,language:row.preferred_language,revision:Number(row.profile_revision),absoluteExpiresAt:row.absolute_expires_at,secret,digest};
}
export async function requireAuthenticatedApplicationUser(locale:string,area:'citizen'|'commune',activity=false){
 const user=await currentApplicationUser(false);
 if(!user){if(area==='commune'&&await readSessionSecret())redirect(`/${locale}/commune/auth/end-session`);redirect(area==='commune'?`/${locale}/commune/login`:`/${locale}/login?reason=authentication-required`);}
 if(area==='commune'&&user.role==='CITIZEN'){authEvent('role_denied');redirect(`/${locale}/commune/access-denied`);}
 if(area==='citizen'&&isStaff(user.role))redirect(`/${locale}/commune`);
 if(user.state!=='VALID'){
  if(area==='commune'){authEvent(user.state==='DISABLED'?'staff_disabled':'staff_session_ended');redirect(`/${locale}/commune/auth/end-session`);}
  redirect(`/${locale}/${user.state==='DISABLED'?'account-disabled':user.state==='INCOMPLETE'?'complete-registration':'session-expired'}`);
 }
 if(activity){const renewed=await currentApplicationUser(true);if(!renewed||renewed.state!=='VALID'||renewed.role!==user.role)return requireAuthenticatedApplicationUser(locale,area,false);return renewed;}
 return user;
}
export const requireCitizen=(locale:string,activity=false)=>requireAuthenticatedApplicationUser(locale,'citizen',activity);
// Entry-page convenience only: protected pages/actions still authorize independently.
// Passive checks must neither renew activity nor recreate an expired application session.
export async function redirectAuthenticatedUser(locale:string){
 const user=await currentApplicationUser(false);
 if(user?.state==='VALID')redirect(`/${locale}/${user.role==='CITIZEN'?'citizen':'commune'}`);
}
export const requireCommuneStaff=(locale:string,activity=false)=>requireAuthenticatedApplicationUser(locale,'commune',activity);
export async function requireAdmin(locale:string){const user=await requireCommuneStaff(locale);if(user.role!=='ADMIN')redirect(`/${locale}/commune/access-denied`);return user;}
