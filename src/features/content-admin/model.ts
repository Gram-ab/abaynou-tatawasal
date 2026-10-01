import {z} from 'zod';
import {chikayaUrlSchema,pageKeySchema,type PageKey} from '@/features/public-content/model';

export const contentAdminLocales=['ar','fr','en'] as const;
export type ContentAdminLocale=typeof contentAdminLocales[number];
const locale=z.enum(contentAdminLocales);
const codePoints=(value:string)=>Array.from(value).length;
const plain=(maximum:number)=>z.string().trim().min(1).refine(value=>codePoints(value)<=maximum,'tooLong').refine(value=>!/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value),'unsafe');
const body=plain(30000).refine(value=>value.split(/\r?\n/u).every(line=>!line.startsWith('#')||/^##\s+\S/u.test(line)),'markdown');
export const adminTranslationSchema=z.object({title:plain(200),body}).strict();
export const adminPublicationBundleSchema=z.object({ar:adminTranslationSchema,fr:adminTranslationSchema,en:adminTranslationSchema}).strict();
export const publishPageSchema=z.object({locale,pageKey:pageKeySchema,revision:z.coerce.number().int().positive(),commandKey:z.uuid(),bundle:adminPublicationBundleSchema}).strict();
const settingText=(maximum:number)=>plain(maximum);
export const adminSettingsBundleSchema=z.object({
 ar:z.object({commune_name:settingText(200),public_address:settingText(1000),opening_hours:settingText(1000)}).strict(),
 fr:z.object({commune_name:settingText(200),public_address:settingText(1000),opening_hours:settingText(1000)}).strict(),
 en:z.object({commune_name:settingText(200),public_address:settingText(1000),opening_hours:settingText(1000)}).strict()
}).strict();
export const updateSettingsSchema=z.object({locale,revision:z.coerce.number().int().positive(),commandKey:z.uuid(),contactPhone:z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,23}$/u),contactEmail:z.email().trim().max(254),chikayaUrl:chikayaUrlSchema,bundle:adminSettingsBundleSchema}).strict();
export type AdminTranslation=z.infer<typeof adminTranslationSchema>;
export type AdminPublicationBundle=z.infer<typeof adminPublicationBundleSchema>;
export type AdminSettingsBundle=z.infer<typeof adminSettingsBundleSchema>;
export type AdminPageSummary={id:string;key:PageKey;currentVersion:number;revision:number;title:string;publishedAt:Date};
export type AdminPage={id:string;key:PageKey;currentVersion:number;revision:number;translations:AdminPublicationBundle;publishedAt:Date;publisherName:string|null;actorType:string};
export type AdminPageHistory={id:string;version:number;current:boolean;translations:AdminPublicationBundle;publishedAt:Date;publisherName:string|null;actorType:string};
export type AdminSettings={id:string;contactPhone:string;contactEmail:string;chikayaUrl:string;revision:number;updatedAt:Date;translations:AdminSettingsBundle};
export type AdminSettingsHistory={revision:number;changedFields:string[];occurredAt:Date;publisherName:string|null};
export type ContentAdminState={status:'idle'|'success'|'error';code?:string};
export const initialContentAdminState:ContentAdminState={status:'idle'};
