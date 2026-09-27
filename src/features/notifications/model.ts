import {z} from 'zod';
export const notificationIdSchema=z.string().uuid();
export const notificationCursorSchema=z.coerce.number().int().positive();
export type NotificationSummary={changeRevision:number;lastSequence:number;unreadCount:number};
export type NotificationItem={id:string;type:'COMPLAINT_RECEIVED';reference:string;recipientSequence:number;createdAt:Date;readAt:Date|null};
