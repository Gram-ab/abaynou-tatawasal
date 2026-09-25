import {z} from 'zod';
export const staffPassword=z.string().refine(v=>Array.from(v).length>=15,'passwordLength').refine(v=>Array.from(v).length<=1024,'passwordTooLong');
export const staffResetSchema=z.object({password:staffPassword,confirmation:z.string()}).refine(v=>v.password===v.confirmation,{message:'passwordMismatch'});
export const staffLanguageSchema=z.object({language:z.enum(['ar','fr','en']),revision:z.coerce.number().int().positive()});
export const isStaff=(role:string)=>role==='AGENT'||role==='ADMIN';
export function staffReturnTo(value:unknown,locale:string){const allowed=['','/account','/account/password'].map(path=>`/${locale}/commune${path}`);return typeof value==='string'&&allowed.includes(value)?value:`/${locale}/commune`;}
