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
export const complaintStatuses=['SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED'] as const;
export type ComplaintStatus=typeof complaintStatuses[number];
export type ComplaintListItem={reference:string;category_labels:Labels;location_labels:Labels;subject:string;status:ComplaintStatus;submitted_at:Date;updated_at:Date;revision:number;citizen_name?:string};
export type ComplaintEvent={revision:number;event_type:'SUBMITTED'|'EDITED'|'STATE_CHANGED'|'RESPONSE_ISSUED'|'RESPONSE_CORRECTED';previous_status:ComplaintStatus|null;new_status:ComplaintStatus;occurred_at:Date};
export const complaintStatusSchema=z.enum(complaintStatuses);
export const complaintListQuerySchema=z.object({q:z.string().trim().max(150).optional().default(''),status:z.union([complaintStatusSchema,z.literal('')]).optional().default(''),beforeTime:z.string().datetime().optional(),beforeReference:z.string().regex(referencePattern).optional()});
export const complaintMutationSchema=complaintFieldsSchema.extend({reference:z.string().regex(referencePattern),expectedRevision:z.coerce.number().int().positive(),commandKey:z.string().uuid()}).strict();
export const complaintTransitionSchema=z.object({reference:z.string().regex(referencePattern),expectedRevision:z.coerce.number().int().positive(),commandKey:z.string().uuid()}).strict();
export const complaintResponseSchema=complaintTransitionSchema.extend({body:text(2000,1),confirmed:z.literal('true')}).strict();
export const complaintNotAcceptedSchema=complaintResponseSchema.extend({reason:z.enum(['OUT_OF_SCOPE','INSUFFICIENT_INFORMATION'])}).strict();
export const complaintCorrectionSchema=complaintResponseSchema.extend({correctionReason:text(500,1),currentPassword:z.string().min(1).max(2048)}).strict();
export type ResponseVersion={versionNumber:number;responseKind:'NORMAL'|'NOT_ACCEPTED';body:string;correctionReason:string|null;createdAt:Date};
export function canCitizenChange(status:ComplaintStatus){return status==='SUBMITTED';}
export function canStartReview(status:ComplaintStatus){return status==='SUBMITTED';}
export function canStartProcessing(status:ComplaintStatus){return status==='UNDER_REVIEW';}
export function canRespond(status:ComplaintStatus){return status==='IN_PROCESSING';}
export function canNotAccept(status:ComplaintStatus){return status==='UNDER_REVIEW'||status==='IN_PROCESSING';}
export function canCorrectResponse(status:ComplaintStatus){return status==='RESPONSE_SENT'||status==='CLOSED'||status==='NOT_ACCEPTED';}
export function canClose(status:ComplaintStatus){return status==='RESPONSE_SENT';}
export function catalogueLabel(item:{labels:Labels},locale:'ar'|'fr'|'en'){return {text:item.labels[locale]??item.labels.ar,language:item.labels[locale]?locale:'ar'};}
export function sortedCatalogue(items:CatalogueItem[],locale:'ar'|'fr'|'en'){
 const collator=new Intl.Collator(locale);
 return [...items].sort((a,b)=>collator.compare(catalogueLabel(a,locale).text,catalogueLabel(b,locale).text)||a.code.localeCompare(b.code,'en')||a.id.localeCompare(b.id,'en'));
}
