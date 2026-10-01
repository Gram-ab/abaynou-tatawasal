import type postgres from 'postgres';
import {developmentPages,developmentSettings} from '../fixtures/public-content';
import {pageRoutes,publicationSchema,publicSettingsSchema} from '../src/features/public-content/model';

/** Bootstrap-only local foundation initialization. Existing administered values are never rewritten. */
export async function seedPublicContent(sql:ReturnType<typeof postgres>){
 let publications=0,settingsCreated=false;
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(71919009)`;
  const pages=await tx`select id,page_key,current_version,revision from app.public_pages order by page_key for update`;
  const expected=Object.keys(pageRoutes).sort(),actual=pages.map(row=>String(row.page_key)).sort();
  if(pages.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new Error('Fixed public-page identity conflict; existing data was not overwritten');
  for(const [key,bundle] of Object.entries(developmentPages)){
   publicationSchema.parse(bundle);
   const page=pages.find(row=>row.page_key===key);
   if(!page)throw new Error('Fixed public-page identity conflict; existing data was not overwritten');
   if(page.current_version===null){await tx`select app.publish_development_page(${key},${page.revision},${tx.json(bundle)})`;publications++;}
  }
  const settings=await tx`select id,revision from app.commune_settings for update`;
  if(settings.length>1)throw new Error('Commune settings singleton conflict; existing data was not overwritten');
  if(!settings.length){
   const phone='+00000000000';
   const email='commune@example.invalid';
   for(const value of Object.values(developmentSettings))publicSettingsSchema.parse({...value,contact_phone:phone,contact_email:email,chikaya_url:'https://chikaya.ma/'});
   await tx`select app.configure_development_settings(0,${phone},${email},'https://chikaya.ma/',${tx.json(developmentSettings)})`;
   settingsCreated=true;
  }else{
   const translations=await tx`select language from app.commune_settings_translations where settings_id=${settings[0].id} order by language`;
   if(translations.map(row=>row.language).join(',')!=='ar,en,fr')throw new Error('Commune settings translation conflict; existing data was not overwritten');
  }
 });
 return {publications,settingsCreated};
}
