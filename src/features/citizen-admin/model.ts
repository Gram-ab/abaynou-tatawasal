import {z} from 'zod';
export const citizenAdminLocale=z.enum(['ar','fr','en']);
export const citizenStatusSchema=z.object({locale:citizenAdminLocale,profileId:z.uuid(),revision:z.coerce.number().int().positive(),status:z.enum(['ACTIVE','DISABLED']),reason:z.string().trim().refine(value=>Array.from(value).length>=3&&Array.from(value).length<=1000),key:z.uuid(),currentPassword:z.string().min(1).max(2048)});
export type CitizenAdminState={status:'idle'|'success'|'warning'|'error';code?:'invalid'|'reauth'|'conflict'|'failed'|'providerSync'|'success';revision?:number};
export const initialCitizenAdminState:CitizenAdminState={status:'idle'};
