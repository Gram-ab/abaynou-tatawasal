'use server';

import {revalidatePath} from 'next/cache';
import {appOrigin,isolatedProviderClient} from '@/server/auth/provider';
import {correctProviderInvitation,findInvitedStaff,findStaffByEmail,inviteStaff,removeInterruptedInvitation,setProviderEnabled} from '@/server/auth/staff-admin-provider';
import {requireAdmin} from '@/server/auth/application-user';
import {provisionAgent,recordSecurityAction,setAgentStatus,updateAgent} from '@/server/staff/repository';
import {correctionSchema,inviteSchema,profileSchema,recoverySchema,statusSchema,type StaffAdminState} from './model';
const fail=(code:string):StaffAdminState=>({status:'error',code});
export async function inviteAgent(_:StaffAdminState,form:FormData):Promise<StaffAdminState>{
 const p=inviteSchema.safeParse(Object.fromEntries(form));if(!p.success)return fail('invalid');const actor=await requireAdmin(p.data.locale);
 const {data,error}=await inviteStaff(p.data.email,`${appOrigin()}/${p.data.locale}/commune/auth/confirm`,p.data.language);
 let user=data.user;
 if(error||!user){user=await findInvitedStaff(p.data.email);if(!user)return fail('conflict');}
 let profileId:string;try{profileId=await provisionAgent(actor,{authId:user.id,email:p.data.email,name:p.data.fullName,phone:p.data.phone,language:p.data.language});}catch{if(!error&&data.user)await removeInterruptedInvitation(data.user.id);return fail('failed');}return {status:'success',code:'success',redirectTo:`/${p.data.locale}/commune/staff/${profileId}?state=invited`};
}
export async function saveAgent(_:StaffAdminState,form:FormData):Promise<StaffAdminState>{const p=profileSchema.safeParse(Object.fromEntries(form));if(!p.success)return fail('invalid');const a=await requireAdmin(p.data.locale);try{await updateAgent(a,{id:p.data.profileId,revision:p.data.revision,name:p.data.fullName,phone:p.data.phone,language:p.data.language});revalidatePath(`/${p.data.locale}/commune/staff/${p.data.profileId}`);return {status:'success',code:'success'};}catch{return fail('conflict');}}
export async function changeAgentStatus(_:StaffAdminState,form:FormData):Promise<StaffAdminState>{const p=statusSchema.safeParse(Object.fromEntries(form));if(!p.success)return fail('invalid');const a=await requireAdmin(p.data.locale),email=String(form.get('email')??'').toLowerCase();try{const target=await findStaffByEmail(email);if(!target)return fail('failed');if(p.data.status==='ACTIVE'){const enabled=await setProviderEnabled(target.id,true);if(enabled.error)return fail('failed');await setAgentStatus(a,{id:p.data.profileId,revision:p.data.revision,status:p.data.status,reason:p.data.reason});}else{await setAgentStatus(a,{id:p.data.profileId,revision:p.data.revision,status:p.data.status,reason:p.data.reason});await setProviderEnabled(target.id,false);}revalidatePath(`/${p.data.locale}/commune/staff/${p.data.profileId}`);return {status:'success',code:'success'};}catch{return fail('conflict');}}
export async function initiateStaffRecovery(_:StaffAdminState,form:FormData):Promise<StaffAdminState>{const p=recoverySchema.safeParse(Object.fromEntries(form));if(!p.success)return fail('invalid');const a=await requireAdmin(p.data.locale);try{await recordSecurityAction(a,p.data.profileId,'RECOVERY_INITIATED',p.data.revision);const sent=await isolatedProviderClient().auth.resetPasswordForEmail(p.data.email,{redirectTo:`${appOrigin()}/${p.data.locale}/commune/auth/confirm`});if(sent.error)return fail('failed');return {status:'success',code:'success'};}catch{return fail('failed');}}
export async function correctInvitationEmail(_:StaffAdminState,form:FormData):Promise<StaffAdminState>{
 const p=correctionSchema.safeParse(Object.fromEntries(form));if(!p.success)return fail('invalid');const actor=await requireAdmin(p.data.locale);
 const isolated=isolatedProviderClient(),proof=await isolated.auth.signInWithPassword({email:actor.email,password:p.data.currentPassword});if(proof.error||proof.data.user?.id!==actor.authUserId)return fail('reauth');await isolated.auth.signOut({scope:'local'});
 try {
  const target=await (await import('@/server/staff/repository')).staffDetail(actor,p.data.profileId);
  if(!target||target.role!=='AGENT'||target.email_confirmed_at||target.last_sign_in_at)return fail('activatedEmail');
  if(target.revision!==p.data.revision||target.email.toLowerCase()!==p.data.email)return fail('conflict');
  const user=await findInvitedStaff(target.email);
  if(!user||user.email_confirmed_at||user.last_sign_in_at)return fail('activatedEmail');
  if(await findStaffByEmail(p.data.newEmail))return fail('emailInUse');
  const changed=await correctProviderInvitation(user.id,p.data.newEmail);
  if(changed.error)return fail('emailInUse');
  try{await recordSecurityAction(actor,target.profile_id,'INVITATION_EMAIL_CORRECTED',p.data.revision);}catch{return fail('conflict');}
  const resent=await inviteStaff(p.data.newEmail,`${appOrigin()}/${p.data.locale}/commune/auth/confirm`,target.preferred_language);
  revalidatePath(`/${p.data.locale}/commune/staff/${target.profile_id}`);
  revalidatePath(`/${p.data.locale}/commune/staff`);
  if(resent.error||resent.data.user?.id!==user.id)return fail('resendFailed');
  return {status:'success',code:'success'};
 }catch{return fail('failed');}
}
