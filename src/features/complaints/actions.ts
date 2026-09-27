'use server';
import {z} from 'zod';
import {currentApplicationUser} from '@/server/auth/application-user';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {readCatalogues} from '@/server/catalogues/repository';
import {editOwnComplaint,recoverComplaint,startComplaintReview,submitComplaint,withdrawOwnComplaint} from '@/server/complaints/repository';
import {complaintCommandSchema,complaintMutationSchema,complaintTransitionSchema} from './model';

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
