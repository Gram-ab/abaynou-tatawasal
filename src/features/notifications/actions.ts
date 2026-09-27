'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {currentApplicationUser} from '@/server/auth/application-user';
import {markAllOwnNotificationsRead,openOwnNotification} from '@/server/notifications/repository';
import {notificationIdSchema} from './model';
const localeOf=(value:FormDataEntryValue|null)=>value==='fr'||value==='en'?value:'ar';
const refreshCitizenNotificationState=(locale:string)=>revalidatePath(`/${locale}/citizen`,'layout');
export async function openNotificationAction(form:FormData){
 const locale=localeOf(form.get('locale')),parsed=notificationIdSchema.safeParse(form.get('notification'));
 if(!parsed.success)redirect(`/${locale}/citizen/notifications?state=unavailable`);
 const actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')redirect(`/${locale}/login?reason=authentication-required`);
 const result=await openOwnNotification(actor,parsed.data);
 if(!result)redirect(`/${locale}/citizen/notifications?state=unavailable`);
 refreshCitizenNotificationState(locale);
 redirect(`/${locale}/citizen/complaints/${result.reference}`);
}
export async function markAllNotificationsReadAction(form:FormData){
 const locale=localeOf(form.get('locale')),actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')redirect(`/${locale}/login?reason=authentication-required`);
 await markAllOwnNotificationsRead(actor);
 refreshCitizenNotificationState(locale);
 redirect(`/${locale}/citizen/notifications`);
}
