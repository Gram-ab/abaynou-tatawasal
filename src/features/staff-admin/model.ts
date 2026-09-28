import {z} from 'zod';
export const localeSchema=z.enum(['ar','fr','en']);
export const profileSchema=z.object({locale:localeSchema,profileId:z.uuid(),revision:z.coerce.number().int().positive(),fullName:z.string().trim().min(2).max(160),phone:z.string().trim().max(40).optional(),language:localeSchema});
export const inviteSchema=z.object({locale:localeSchema,email:z.email().trim().toLowerCase(),fullName:z.string().trim().min(2).max(160),phone:z.string().trim().max(40).optional(),language:localeSchema});
export const statusSchema=z.object({locale:localeSchema,profileId:z.uuid(),revision:z.coerce.number().int().positive(),status:z.enum(['ACTIVE','DISABLED']),reason:z.string().trim().min(3).max(1000)});
export const recoverySchema=z.object({locale:localeSchema,profileId:z.uuid(),revision:z.coerce.number().int().positive(),email:z.email().trim().toLowerCase()});
export const correctionSchema=recoverySchema.extend({newEmail:z.email().trim().toLowerCase(),currentPassword:z.string().min(1).max(2048),confirmed:z.literal('on')});
export type StaffAdminState={status:'idle'|'success'|'error';code?:string;redirectTo?:string};
export const initialStaffAdminState:StaffAdminState={status:'idle'};
