'use server';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/server/auth/application-user';
import {isolatedProviderClient} from '@/server/auth/provider';
import {setProviderEnabled} from '@/server/auth/staff-admin-provider';
import {readCitizen,setCitizenStatus} from '@/server/citizen-admin/repository';
import {contentAdminFingerprint} from '@/server/content-admin/fingerprint';
import {citizenAdminLocale,citizenStatusSchema,type CitizenAdminState} from './model';

async function synchronizeProvider(authId:string,enabled:boolean){
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await setProviderEnabled(authId,enabled);if(!result.error)return true;}catch{/* Retry a transient provider failure. */}
 }
 return false;
}
async function synchronizeCurrentProvider(actor:Awaited<ReturnType<typeof requireAdmin>>,profileId:string){
 for(let pass=0;pass<3;pass++){
  const before=await readCitizen(actor,profileId);if(!before)return false;
  if(!await synchronizeProvider(before.authUserId,before.status==='ACTIVE'))return false;
  const after=await readCitizen(actor,profileId);
  if(after?.revision===before.revision&&after.status===before.status)return true;
 }
 return false;
}
export async function changeCitizenStatus(_:CitizenAdminState,form:FormData):Promise<CitizenAdminState>{
 const parsed=citizenStatusSchema.safeParse(Object.fromEntries(form));if(!parsed.success)return {status:'error',code:'invalid'};
 const input=parsed.data,actor=await requireAdmin(input.locale);
 const client=isolatedProviderClient();
 const proof=await client.auth.signInWithPassword({email:actor.email,password:input.currentPassword});
 if(proof.error||proof.data.user?.id!==actor.authUserId)return {status:'error',code:'reauth'};
 await client.auth.signOut({scope:'local'});
 const fingerprint=contentAdminFingerprint('CITIZEN_SET_STATUS',{id:input.profileId,revision:input.revision,status:input.status,reason:input.reason});
 try{
  const result=await setCitizenStatus(actor,{id:input.profileId,revision:input.revision,status:input.status,reason:input.reason,key:input.key,fingerprint});
  revalidatePath(`/${input.locale}/commune/citizens/${input.profileId}`);
  revalidatePath(`/${input.locale}/commune/citizens`);
  if(!await synchronizeCurrentProvider(actor,input.profileId))return {status:'warning',code:'providerSync',revision:result.revision};
  return {status:'success',code:'success',revision:result.revision};
 }catch(error){
  const code=(error as {code?:string}).code;
  return {status:'error',code:code==='P0412'||code==='40001'||code==='P0409'?'conflict':'failed'};
 }
}
export async function retryCitizenProviderSync(_:CitizenAdminState,form:FormData):Promise<CitizenAdminState>{
 const locale=citizenAdminLocale.safeParse(form.get('locale'));
 const id=String(form.get('profileId')??'');
 if(!locale.success||!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i))return {status:'error',code:'invalid'};
 const actor=await requireAdmin(locale.data),citizen=await readCitizen(actor,id);
 if(!citizen)return {status:'error',code:'failed'};
 const okay=await synchronizeCurrentProvider(actor,id);
 return okay?{status:'success',code:'success',revision:citizen.revision}:{status:'warning',code:'providerSync',revision:citizen.revision};
}
