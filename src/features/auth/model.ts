import {z} from 'zod';
export const localeSchema=z.enum(['ar','fr','en']);
const obviousPasswords=new Set(['password','1234567890','qwerty12345']);
const password=z.string().refine(v=>Array.from(v).length>=10,'passwordLength').refine(v=>Array.from(v).length<=1024,'passwordTooLong').refine(v=>!obviousPasswords.has(v.normalize('NFKC').trim().toLocaleLowerCase('en-US')),'passwordObvious');
export const signupSchema=z.object({fullName:z.string().trim().min(1).max(200),email:z.string().trim().email().max(320),phone:z.string().max(24).optional(),password,locale:localeSchema,termsVersionId:z.string().uuid(),privacyVersionId:z.string().uuid(),accepted:z.literal('on')});
export const completeRegistrationSchema=signupSchema.omit({email:true,password:true});
export const loginSchema=z.object({email:z.string().trim().email().max(320),password:z.string().min(1).max(1024),locale:localeSchema,returnTo:z.string().max(500).optional()});
export const recoverySchema=z.object({email:z.string().trim().email().max(320),locale:localeSchema});
export const resetSchema=z.object({password,confirmation:z.string(),locale:localeSchema}).refine(v=>v.password===v.confirmation,{path:['confirmation'],message:'passwordMismatch'});
export const profileSchema=z.object({fullName:z.string().trim().min(1).max(200),phone:z.string().max(24).optional(),language:localeSchema,revision:z.coerce.number().int().positive()});
export const passwordChangeSchema=z.object({currentPassword:z.string().min(1).max(1024),password,confirmation:z.string(),locale:localeSchema}).refine(v=>v.password===v.confirmation,{path:['confirmation'],message:'passwordMismatch'});
export const emailChangeSchema=z.object({currentPassword:z.string().min(1).max(1024),email:z.string().trim().email().max(320),locale:localeSchema});
export type AuthState={status:'idle'|'success'|'error';code?:string};
export const initialAuthState:AuthState={status:'idle'};
export function normalizePhone(input:string|undefined){if(!input?.trim())return null;let value=input.trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));value=value.replace(/^00/,'+').replace(/[ ()-]/g,'');if(!/^\+?\d{7,15}$/.test(value))throw new Error('phoneInvalid');return value;}
export function safeReturnTo(value:string|undefined,locale:string){if(!value)return `/${locale}/citizen`;try{const decoded=decodeURIComponent(value);if(decoded.startsWith(`/${locale}/citizen`)&&!decoded.startsWith('//')&&!decoded.includes('\\'))return decoded;}catch{}return `/${locale}/citizen`;}
