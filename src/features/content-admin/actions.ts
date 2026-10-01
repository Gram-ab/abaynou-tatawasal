'use server';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/server/auth/application-user';
import {contentAdminFingerprint} from '@/server/content-admin/fingerprint';
import {publishAdminPage,updateAdminSettings} from '@/server/content-admin/repository';
import {pageRoutes} from '@/features/public-content/model';
import {publishPageSchema,updateSettingsSchema,type ContentAdminState} from './model';
const fail=(code:string):ContentAdminState=>({status:'error',code});
const errorCode=(error:unknown)=>{const code=typeof error==='object'&&error&&'code' in error?String(error.code):'';return code==='P0812'||code==='P0409'?'conflict':code==='23514'||code==='22023'?'invalid':'failed';};
const bundle=(form:FormData)=>({ar:{title:form.get('arTitle'),body:form.get('arBody')},fr:{title:form.get('frTitle'),body:form.get('frBody')},en:{title:form.get('enTitle'),body:form.get('enBody')}});
export async function publishPageAction(_:ContentAdminState,form:FormData):Promise<ContentAdminState>{
 const parsed=publishPageSchema.safeParse({locale:form.get('locale'),pageKey:form.get('pageKey'),revision:form.get('revision'),commandKey:form.get('commandKey'),bundle:bundle(form)});if(!parsed.success)return fail('invalid');
 const value=parsed.data,actor=await requireAdmin(value.locale),canonical={key:value.pageKey,revision:value.revision,bundle:value.bundle};
 try{await publishAdminPage(actor,{key:value.pageKey,revision:value.revision,commandKey:value.commandKey,fingerprint:contentAdminFingerprint('PUBLIC_CONTENT_PUBLISH',canonical),bundle:value.bundle});}
 catch(error){return fail(errorCode(error));}
 for(const language of ['ar','fr','en'] as const){const route=pageRoutes[value.pageKey];revalidatePath(`/${language}${route?`/${route}`:''}`);if(['HOME','HOW_IT_WORKS','SERVICE_SCOPE'].includes(value.pageKey))revalidatePath(`/${language}`);}
 revalidatePath(`/${value.locale}/commune/settings/pages`);revalidatePath(`/${value.locale}/commune/settings/pages/${value.pageKey}`);
 return {status:'success',code:'success'};
}
const settingsBundle=(form:FormData)=>({ar:{commune_name:form.get('arCommuneName'),public_address:form.get('arPublicAddress'),opening_hours:form.get('arOpeningHours')},fr:{commune_name:form.get('frCommuneName'),public_address:form.get('frPublicAddress'),opening_hours:form.get('frOpeningHours')},en:{commune_name:form.get('enCommuneName'),public_address:form.get('enPublicAddress'),opening_hours:form.get('enOpeningHours')}});
export async function updateSettingsAction(_:ContentAdminState,form:FormData):Promise<ContentAdminState>{
 const parsed=updateSettingsSchema.safeParse({locale:form.get('locale'),revision:form.get('revision'),commandKey:form.get('commandKey'),contactPhone:form.get('contactPhone'),contactEmail:form.get('contactEmail'),chikayaUrl:form.get('chikayaUrl'),bundle:settingsBundle(form)});if(!parsed.success)return fail('settingsInvalid');
 const value=parsed.data,actor=await requireAdmin(value.locale),canonical={revision:value.revision,phone:value.contactPhone,email:value.contactEmail,chikayaUrl:value.chikayaUrl,bundle:value.bundle};
 try{await updateAdminSettings(actor,{revision:value.revision,commandKey:value.commandKey,fingerprint:contentAdminFingerprint('COMMUNE_SETTINGS_UPDATE',canonical),phone:value.contactPhone,email:value.contactEmail,chikayaUrl:value.chikayaUrl,bundle:value.bundle});}
 catch(error){const code=errorCode(error);return fail(code==='invalid'?'settingsInvalid':code);}
 for(const language of ['ar','fr','en'] as const)revalidatePath(`/${language}`,'layout');
 revalidatePath(`/${value.locale}/commune/settings/commune`);
 return {status:'success',code:'settingsSuccess'};
}
