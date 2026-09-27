'use server';
import {z} from 'zod';
import {currentApplicationUser} from '@/server/auth/application-user';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {readCatalogues} from '@/server/catalogues/repository';
import {editOwnComplaint,recoverComplaint,startComplaintReview,submitComplaint,withdrawOwnComplaint,startComplaintProcessing,issueComplaintResponse,notAcceptComplaint,correctComplaintResponse,closeComplaint} from '@/server/complaints/repository';
import {complaintCommandSchema,complaintMutationSchema,complaintTransitionSchema,complaintResponseSchema,complaintNotAcceptedSchema,complaintCorrectionSchema} from './model';
import {isolatedProviderClient} from '@/server/auth/provider';

export async function submitComplaintAction(input:unknown){
 try{
  const actor=await currentApplicationUser(false);
  if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return {error:'session' as const};
  const parsed=complaintCommandSchema.safeParse(input);
  if(!parsed.success)return {error:'validation' as const};
  return await submitComplaint(actor,parsed.data);
 }catch(error){
  const code=(error as {code?:string}).code;
  return {error:code==='P0401'?'category':code==='P0402'?'location':code==='P0409'?'conflict':code==='P0429'?'throttled':code==='42501'?'session':code==='23514'?'validation':'uncertain'};
 }
}
export async function reloadComplaintCatalogues(){
 const actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return null;
 try{return await readCatalogues();}catch{return null;}
}
export async function recoverComplaintAction(key:unknown){
 if(!z.string().uuid().safeParse(key).success)return {error:'validation'};
 try{
  const actor=await currentApplicationUser(false);
  if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return {error:'session'};
  return {reference:await recoverComplaint(actor,key as string)};
 }catch{return {error:'uncertain'};}
}
const localeOf=(value:FormDataEntryValue|null)=>value==='fr'||value==='en'?value:'ar';
const commandError=(error:unknown)=>{const code=(error as {code?:string}).code;return code==='P0412'||code==='40001'?'conflict':code==='P0401'?'category':code==='P0402'?'location':code==='42501'?'session':code==='23514'?'validation':'uncertain';};
export async function editComplaintAction(form:FormData){
 const locale=localeOf(form.get('locale')),parsed=complaintMutationSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey'),categoryId:form.get('categoryId'),locationId:form.get('locationId'),subject:form.get('subject'),description:form.get('description'),locationClarification:form.get('locationClarification')});
 if(!parsed.success)redirect(`/${locale}/citizen/complaints/${String(form.get('reference'))}/edit?state=validation`);
 const actor=await currentApplicationUser(false);if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')redirect(`/${locale}/login?reason=authentication-required`);
 try{await editOwnComplaint(actor,parsed.data);}catch(error){redirect(`/${locale}/citizen/complaints/${parsed.data.reference}/edit?state=${commandError(error)}`);}revalidatePath(`/${locale}/citizen`,'layout');redirect(`/${locale}/citizen/complaints/${parsed.data.reference}?state=edited`);
}
export async function withdrawComplaintAction(form:FormData){
 const locale=localeOf(form.get('locale')),parsed=complaintTransitionSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey')});if(!parsed.success)redirect(`/${locale}/citizen/complaints`);
 const actor=await currentApplicationUser(false);if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')redirect(`/${locale}/login?reason=authentication-required`);
 try{await withdrawOwnComplaint(actor,parsed.data);}catch(error){redirect(`/${locale}/citizen/complaints/${parsed.data.reference}?state=${commandError(error)}`);}revalidatePath(`/${locale}/citizen`,'layout');redirect(`/${locale}/citizen/complaints/${parsed.data.reference}?state=withdrawn`);
}
export async function startReviewAction(form:FormData){
 const locale=localeOf(form.get('locale')),parsed=complaintTransitionSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey')});if(!parsed.success)redirect(`/${locale}/commune/complaints`);
 const actor=await currentApplicationUser(false);if(!actor||actor.state!=='VALID'||!['AGENT','ADMIN'].includes(actor.role))redirect(`/${locale}/commune/login`);
 try{await startComplaintReview(actor,parsed.data);}catch(error){redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=${commandError(error)}`);}revalidatePath(`/${locale}/commune`,'layout');redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=reviewing`);
}
async function staffActor(locale:'ar'|'fr'|'en'){const actor=await currentApplicationUser(false);if(!actor||actor.state!=='VALID'||!['AGENT','ADMIN'].includes(actor.role))redirect(`/${locale}/commune/login`);return actor;}
const finishStaffCommand=(locale:string,reference:string,state:string)=>{revalidatePath(`/${locale}/commune`,'layout');revalidatePath(`/${locale}/citizen`,'layout');redirect(`/${locale}/commune/complaints/${reference}?state=${state}`);};
export async function startProcessingAction(form:FormData){const locale=localeOf(form.get('locale')),parsed=complaintTransitionSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey')});if(!parsed.success)redirect(`/${locale}/commune/complaints`);const actor=await staffActor(locale);try{await startComplaintProcessing(actor,parsed.data);}catch(error){redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=${commandError(error)}`);}finishStaffCommand(locale,parsed.data.reference,'processing');}
export async function issueResponseAction(form:FormData){const locale=localeOf(form.get('locale')),parsed=complaintResponseSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey'),body:form.get('body'),confirmed:form.get('confirmed')});if(!parsed.success)redirect(`/${locale}/commune/complaints/${String(form.get('reference'))}?state=validation`);const actor=await staffActor(locale);try{await issueComplaintResponse(actor,parsed.data);}catch(error){redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=${commandError(error)}`);}finishStaffCommand(locale,parsed.data.reference,'responded');}
export async function notAcceptAction(form:FormData){const locale=localeOf(form.get('locale')),parsed=complaintNotAcceptedSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey'),reason:form.get('reason'),body:form.get('body'),confirmed:form.get('confirmed')});if(!parsed.success)redirect(`/${locale}/commune/complaints/${String(form.get('reference'))}?state=validation`);const actor=await staffActor(locale);try{await notAcceptComplaint(actor,parsed.data);}catch(error){redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=${commandError(error)}`);}finishStaffCommand(locale,parsed.data.reference,'not-accepted');}
export async function correctResponseAction(form:FormData){const locale=localeOf(form.get('locale')),parsed=complaintCorrectionSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey'),body:form.get('body'),correctionReason:form.get('correctionReason'),currentPassword:form.get('currentPassword'),confirmed:form.get('confirmed')});if(!parsed.success)redirect(`/${locale}/commune/complaints/${String(form.get('reference'))}?state=validation`);const actor=await staffActor(locale);const isolated=isolatedProviderClient(),verified=await isolated.auth.signInWithPassword({email:actor.email,password:parsed.data.currentPassword});if(verified.error||verified.data.user?.id!==actor.authUserId){await isolated.auth.signOut({scope:'local'});redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=reauth`);}await isolated.auth.signOut({scope:'local'});try{await correctComplaintResponse(actor,parsed.data);}catch(error){redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=${commandError(error)}`);}finishStaffCommand(locale,parsed.data.reference,'corrected');}
export async function closeComplaintAction(form:FormData){const locale=localeOf(form.get('locale')),parsed=complaintTransitionSchema.safeParse({reference:form.get('reference'),expectedRevision:form.get('expectedRevision'),commandKey:form.get('commandKey')});if(!parsed.success)redirect(`/${locale}/commune/complaints`);const actor=await staffActor(locale);try{await closeComplaint(actor,parsed.data);}catch(error){redirect(`/${locale}/commune/complaints/${parsed.data.reference}?state=${commandError(error)}`);}finishStaffCommand(locale,parsed.data.reference,'closed');}
