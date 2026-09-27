'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {currentApplicationUser} from '@/server/auth/application-user';
import {markAllOwnNotificationsRead,openOwnNotification} from '@/server/notifications/repository';
import {notificationIdSchema} from './model';
const localeOf=(value:FormDataEntryValue|null)=>value==='fr'||value==='en'?value:'ar';
export async function openNotificationAction(form:FormData){
 const locale=localeOf(form.get('locale')),area=form.get('area')==='commune'?'commune':'citizen',parsed=notificationIdSchema.safeParse(form.get('notification'));
 if(!parsed.success)redirect(`/${locale}/${area}/notifications?state=unavailable`);
 const actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||(area==='citizen'?actor.role!=='CITIZEN':actor.role==='CITIZEN'))redirect(area==='citizen'?`/${locale}/login?reason=authentication-required`:`/${locale}/commune/login`);
 const result=await openOwnNotification(actor,parsed.data);
 if(!result)redirect(`/${locale}/${area}/notifications?state=unavailable`);
 revalidatePath(`/${locale}/${area}`,'layout');
 redirect(`/${locale}/${area}/complaints/${result.reference}`);
}
export async function markAllNotificationsReadAction(form:FormData){
 const locale=localeOf(form.get('locale')),area=form.get('area')==='commune'?'commune':'citizen',actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||(area==='citizen'?actor.role!=='CITIZEN':actor.role==='CITIZEN'))redirect(area==='citizen'?`/${locale}/login?reason=authentication-required`:`/${locale}/commune/login`);
 await markAllOwnNotificationsRead(actor);
 revalidatePath(`/${locale}/${area}`,'layout');
 redirect(`/${locale}/${area}/notifications`);
}
