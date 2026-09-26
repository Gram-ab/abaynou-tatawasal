import type postgres from 'postgres';
import {isDeepStrictEqual} from 'node:util';
import {canonicalCategories,canonicalLocations} from '../fixtures/canonical-catalogue';

/** Called only by the verified local maintenance workflow, never application runtime. */
export async function seedCatalogues(sql:ReturnType<typeof postgres>){
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(71919004)`;
  for(const [kind,rows] of [['category',canonicalCategories],['location',canonicalLocations]] as const){
   const parent=kind==='category'?'categories':'locations';
   const child=kind==='category'?'category_translations':'location_translations';
   const fk=kind==='category'?'category_id':'location_id';
   for(const row of rows){
    const existing=await tx`select id,code,is_active from app.${tx(parent)} where id=${row.id} or code=${row.code}`;
    if(existing.length){
     const labels=await tx`select language,label from app.${tx(child)} where ${tx(fk)}=${row.id}`;
     if(existing.length!==1||existing[0].id!==row.id||existing[0].code!==row.code||existing[0].is_active!==row.isActive||!isDeepStrictEqual(Object.fromEntries(labels.map(l=>[l.language,l.label])),row.labels))throw new Error('Canonical initialization conflict; existing data was not overwritten');
     continue;
    }
    await tx`insert into app.${tx(parent)}(id,code,is_active) values(${row.id},${row.code},${row.isActive})`;
    for(const [language,label] of Object.entries(row.labels))await tx`insert into app.${tx(child)}(${tx(fk)},language,label) values(${row.id},${language},${label})`;
    await tx`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values('SYSTEM',${kind==='category'?'CATEGORY_CREATED':'LOCATION_CREATED'},${kind==='category'?'CATEGORY':'LOCATION'},${row.id},'{"source":"LOCAL_CANONICAL_FIXTURE"}')`;
   }
  }
 });
}
