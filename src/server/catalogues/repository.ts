import 'server-only';
import {publicDatabase} from '@/shared/db/public';
import type {Catalogues,Labels} from '@/features/complaints/model';
import type {ApplicationUser} from '@/server/auth/application-user';
import type {CatalogueAdminItem,CatalogueKind} from '@/features/catalogue-admin/model';
export async function readCatalogues():Promise<Catalogues>{
 const rows=await publicDatabase()`select * from app.read_submission_catalogues()`;
 const result:Catalogues={categories:[],locations:[]};
 for(const row of rows)result[row.kind==='category'?'categories':'locations'].push({id:row.id,code:row.code,labels:row.labels as Labels});
 if(!result.categories.length||!result.locations.length)throw new Error('Catalogue unavailable');
 return result;
}
const mapAdmin=(row:Record<string,unknown>):CatalogueAdminItem=>({id:String(row.id),code:String(row.code),isActive:Boolean(row.is_active),labels:row.labels as Labels,revision:Number(row.revision),createdAt:new Date(row.created_at as string),updatedAt:new Date(row.updated_at as string)});
export async function listAdminCatalogues(actor:ApplicationUser,kind:CatalogueKind,input:{query?:string;status?:string}){return (await publicDatabase()`select * from app.list_admin_catalogues(${actor.authUserId},${actor.providerSessionId},${actor.digest},${kind},${input.query??null},${input.status??'ALL'})`).map(mapAdmin);}
export async function readAdminCatalogue(actor:ApplicationUser,kind:CatalogueKind,id:string){const [row]=await publicDatabase()`select * from app.read_admin_catalogue(${actor.authUserId},${actor.providerSessionId},${actor.digest},${kind},${id})`;return row?mapAdmin(row):null;}
export async function readAdminCatalogueAudit(actor:ApplicationUser,kind:CatalogueKind,id:string){return publicDatabase()`select * from app.read_admin_catalogue_audit(${actor.authUserId},${actor.providerSessionId},${actor.digest},${kind},${id},${30})`;}
export async function createCatalogue(actor:ApplicationUser,input:{kind:CatalogueKind;key:string;fingerprint:Buffer;ar:string;fr?:string;en?:string}){const [row]=await publicDatabase()`select * from app.create_catalogue(${actor.authUserId},${actor.providerSessionId},${actor.digest},${input.kind},${input.key},${input.fingerprint},${input.ar},${input.fr??null},${input.en??null})`;return row;}
export async function updateCatalogue(actor:ApplicationUser,input:{kind:CatalogueKind;id:string;revision:number;key:string;fingerprint:Buffer;ar:string;fr?:string;en?:string}){const [row]=await publicDatabase()`select * from app.update_catalogue(${actor.authUserId},${actor.providerSessionId},${actor.digest},${input.kind},${input.id},${input.revision},${input.key},${input.fingerprint},${input.ar},${input.fr??null},${input.en??null})`;return row;}
export async function setCatalogueActive(actor:ApplicationUser,input:{kind:CatalogueKind;id:string;revision:number;key:string;fingerprint:Buffer;active:boolean}){const [row]=await publicDatabase()`select * from app.set_catalogue_active(${actor.authUserId},${actor.providerSessionId},${actor.digest},${input.kind},${input.id},${input.revision},${input.key},${input.fingerprint},${input.active})`;return row;}
export async function readCitizenEditCatalogues(actor:ApplicationUser,reference:string){const rows=await publicDatabase()`select * from app.read_own_edit_catalogues(${actor.authUserId},${actor.providerSessionId},${actor.digest},${reference})`;const result:{categories:(Catalogues['categories'][number]&{isActive:boolean;isCurrent:boolean})[];locations:(Catalogues['locations'][number]&{isActive:boolean;isCurrent:boolean})[]}={categories:[],locations:[]};for(const row of rows)result[row.kind==='category'?'categories':'locations'].push({id:row.id,code:row.code,labels:row.labels as Labels,isActive:row.is_active,isCurrent:row.is_current});return result;}
export async function readStaffLocationFilters(actor:ApplicationUser){return (await publicDatabase()`select * from app.read_staff_location_filters(${actor.authUserId},${actor.providerSessionId},${actor.digest})`).map(row=>({id:String(row.id),labels:row.labels as Labels,isActive:Boolean(row.is_active)}));}
