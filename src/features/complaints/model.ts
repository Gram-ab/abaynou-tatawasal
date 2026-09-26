import {z} from 'zod';

/** ECMAScript whitespace, mirrored explicitly by app.complaint_effective_text. */
export const effectiveText=(value:string)=>value.trim();
export const codePoints=(value:string)=>Array.from(value).length;
const validText=(value:string)=>!/[\u0000\uD800-\uDFFF]/u.test(value);
const text=(maximum:number,minimum:number)=>z.string()
 .refine(validText,'invalidText')
 .refine(value=>codePoints(value)<=maximum,'tooLong')
 .refine(value=>codePoints(effectiveText(value))>=minimum,'tooShort');
export const complaintFieldsSchema=z.object({
 categoryId:z.string().uuid('required'),
 subject:text(150,1),
 description:text(2000,20),
 locationId:z.string().uuid('required'),
 locationClarification:text(300,0)
}).strict();
export const complaintCommandSchema=complaintFieldsSchema.extend({
 confirmed:z.literal(true),commandKey:z.string().uuid(),locale:z.enum(['ar','fr','en'])
}).strict();
export type ComplaintFields=z.infer<typeof complaintFieldsSchema>;
export type ComplaintCommand=z.infer<typeof complaintCommandSchema>;
export const emptyComplaint:ComplaintFields={categoryId:'',subject:'',description:'',locationId:'',locationClarification:''};
export function canonicalComplaint(input:ComplaintFields){return {
 categoryId:input.categoryId.toLowerCase(),subject:input.subject,description:input.description,
 locationId:input.locationId.toLowerCase(),locationClarification:effectiveText(input.locationClarification)?input.locationClarification:null
};}
export const referencePattern=/^AB-(?:[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-){2}[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;
export type Labels=Partial<Record<'ar'|'fr'|'en',string>>&{ar:string};
export type CatalogueItem={id:string;code:string;labels:Labels};
export type Catalogues={categories:CatalogueItem[];locations:CatalogueItem[]};
export function catalogueLabel(item:{labels:Labels},locale:'ar'|'fr'|'en'){return {text:item.labels[locale]??item.labels.ar,language:item.labels[locale]?locale:'ar'};}
export function sortedCatalogue(items:CatalogueItem[],locale:'ar'|'fr'|'en'){
 const collator=new Intl.Collator(locale);
 return [...items].sort((a,b)=>collator.compare(catalogueLabel(a,locale).text,catalogueLabel(b,locale).text)||a.code.localeCompare(b.code,'en')||a.id.localeCompare(b.id,'en'));
}
