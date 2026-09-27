import {z} from 'zod';
export const notificationIdSchema=z.string().uuid();
export const notificationCursorSchema=z.coerce.number().int().positive();
export type NotificationSummary={changeRevision:number;lastSequence:number;unreadCount:number};
export type NotificationType='COMPLAINT_RECEIVED'|'NEW_COMPLAINT'|'COMPLAINT_WITHDRAWN'|'COMPLAINT_UNDER_REVIEW'|'IN_PROCESSING'|'RESPONSE_AVAILABLE'|'COMPLAINT_NOT_ACCEPTED'|'RESPONSE_CORRECTED'|'COMPLAINT_CLOSED';
export type NotificationItem={id:string;type:NotificationType;reference:string;recipientSequence:number;createdAt:Date;readAt:Date|null};
