import 'server-only';
import {publicDatabase} from '@/shared/db/public';
import type {ApplicationUser} from '@/server/auth/application-user';
import type {NotificationItem,NotificationSummary} from '@/features/notifications/model';

export async function notificationSummary(actor:ApplicationUser):Promise<NotificationSummary>{
 const [row]=await publicDatabase()`select * from app.notification_summary(${actor.authUserId},${actor.providerSessionId},${actor.digest})`;
 return {changeRevision:Number(row?.change_revision??0),lastSequence:Number(row?.last_sequence??0),unreadCount:Number(row?.unread_count??0)};
}
export async function listOwnNotifications(actor:ApplicationUser,before?:number,limit=20):Promise<NotificationItem[]>{
 const rows=await publicDatabase()`select * from app.list_own_notifications(${actor.authUserId},${actor.providerSessionId},${actor.digest},${before??null},${limit})`;
 return rows.map(row=>({id:row.id,type:row.type,reference:row.reference,recipientSequence:Number(row.recipient_sequence),createdAt:new Date(row.created_at),readAt:row.read_at?new Date(row.read_at):null}));
}
export async function openOwnNotification(actor:ApplicationUser,id:string){
 const [row]=await publicDatabase()`select * from app.open_own_notification(${actor.authUserId},${actor.providerSessionId},${actor.digest},${id})`;
 return row?{reference:row.reference as string,changed:Boolean(row.changed)}:null;
}
export async function markAllOwnNotificationsRead(actor:ApplicationUser){
 const [row]=await publicDatabase()`select app.mark_all_own_notifications_read(${actor.authUserId},${actor.providerSessionId},${actor.digest}) changed`;
 return Number(row?.changed??0);
}
