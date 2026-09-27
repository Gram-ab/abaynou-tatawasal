import {requireCommuneStaff} from '@/server/auth/application-user';
import {listOwnNotifications,notificationSummary} from '@/server/notifications/repository';
import {notificationCursorSchema,type NotificationItem,type NotificationSummary} from '@/features/notifications/model';
import {NotificationCenter} from '@/features/notifications/components/center';
export const metadata={title:'Notifications',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{locale:'ar'|'fr'|'en'}>;searchParams:Promise<{before?:string}>}){const {locale}=await params,actor=await requireCommuneStaff(locale,true),raw=await searchParams,parsed=notificationCursorSchema.safeParse(raw.before);let items:NotificationItem[],summary:NotificationSummary,error=false;try{[items,summary]=await Promise.all([listOwnNotifications(actor,parsed.success?parsed.data:undefined),notificationSummary(actor)]);}catch{items=[];summary={changeRevision:0,lastSequence:0,unreadCount:0};error=true;}return <NotificationCenter locale={locale} items={items} unread={summary.unreadCount} error={error} area="commune"/>;}
