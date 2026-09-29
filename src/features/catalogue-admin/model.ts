import {z} from 'zod';
import {codePoints,effectiveText,type Labels} from '@/features/complaints/model';
export const catalogueKinds=['CATEGORY','LOCATION'] as const;
export type CatalogueKind=typeof catalogueKinds[number];
const locale=z.enum(['ar','fr','en']);
const label=z.string().refine(value=>effectiveText(value).length>0,'required').refine(value=>codePoints(value)<=200,'tooLong');
const optionalLabel=z.preprocess(value=>value===''?undefined:value,label.optional());
const base=z.object({locale,kind:z.enum(catalogueKinds),commandKey:z.uuid(),arabic:label,french:optionalLabel,english:optionalLabel}).strict();
export const createCatalogueSchema=base;
export const updateCatalogueSchema=base.extend({id:z.uuid(),revision:z.coerce.number().int().positive()});
export const stateCatalogueSchema=z.object({locale,kind:z.enum(catalogueKinds),id:z.uuid(),revision:z.coerce.number().int().positive(),commandKey:z.uuid(),active:z.enum(['true','false']).transform(value=>value==='true')}).strict();
export type CatalogueAdminItem={id:string;code:string;isActive:boolean;labels:Labels;revision:number;createdAt:Date;updatedAt:Date};
export type CatalogueAdminState={status:'idle'|'success'|'error';code?:string};
export const initialCatalogueAdminState:CatalogueAdminState={status:'idle'};
export function canActivate(kind:CatalogueKind,labels:Partial<Labels>){return kind==='CATEGORY'?Boolean(labels.ar&&labels.fr&&labels.en):Boolean(labels.ar);}
export function catalogueStatus(item:{isActive:boolean}){return item.isActive?'ACTIVE':'INACTIVE';}
export function inactiveOptionLabel(label:string,inactive:string){return `${label} — ${inactive}`;}

