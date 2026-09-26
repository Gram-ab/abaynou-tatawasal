import 'server-only';
import {publicDatabase} from '@/shared/db/public';
import type {Catalogues,Labels} from '@/features/complaints/model';
export async function readCatalogues():Promise<Catalogues>{
 const rows=await publicDatabase()`select * from app.read_submission_catalogues()`;
 const result:Catalogues={categories:[],locations:[]};
 for(const row of rows)result[row.kind==='category'?'categories':'locations'].push({id:row.id,code:row.code,labels:row.labels as Labels});
 if(!result.categories.length||!result.locations.length)throw new Error('Catalogue unavailable');
 return result;
}
