'use server';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/server/auth/application-user';
import {isolatedProviderClient} from '@/server/auth/provider';
import {promoteAgentAuthority} from '@/server/staff/promotion';
import {promotionSchema} from './promotion-model';
import type {StaffAdminState} from './model';

export async function promoteAgent(_:StaffAdminState,form:FormData):Promise<StaffAdminState>{
 const parsed=promotionSchema.safeParse(Object.fromEntries(form));
 if(!parsed.success)return {status:'error',code:'invalid'};
 const input=parsed.data,actor=await requireAdmin(input.locale);
 if(actor.profileId===input.profileId)return {status:'error',code:'ineligible'};
 // Reauthentication uses a separate provider session; it never replaces browser cookies.
 const client=isolatedProviderClient();
 let authenticated=false,verified=false,cleaned=true;
 try{
  const proof=await client.auth.signInWithPassword({email:actor.email,password:input.currentPassword});
  authenticated=Boolean(proof.data.session);
  verified=!proof.error&&authenticated&&proof.data.user?.id===actor.authUserId&&Boolean(proof.data.user.email_confirmed_at);
 }catch{verified=false;}
 finally{
  if(authenticated){try{cleaned=!(await client.auth.signOut({scope:'local'})).error;}catch{cleaned=false;}}
 }
 if(!verified)return {status:'error',code:'reauth'};
 if(!cleaned)return {status:'error',code:'failed'};
 // Re-read application authority after the password round-trip. The database also
 // authorizes the original cookie-bound session within the promotion transaction.
 const currentActor=await requireAdmin(input.locale);
 if(currentActor.authUserId!==actor.authUserId||currentActor.sessionId!==actor.sessionId)return {status:'error',code:'conflict'};
 try{await promoteAgentAuthority(currentActor,{id:input.profileId,email:input.email,revision:input.revision,reason:input.reason});}
 catch(error){const code=(error as {code?:string}).code;return {status:'error',code:code==='40001'?'conflict':code==='23514'?'ineligible':'failed'};}
 revalidatePath(`/${input.locale}/commune/staff/${input.profileId}`);
 revalidatePath(`/${input.locale}/commune/staff`);
 return {status:'success',code:'success'};
}
