import 'server-only';
import {publicDatabase} from '@/shared/db/public';
import {localeSchema,pageKeySchema,publicPageSchema,publicSettingsSchema,type PageKey} from './model';
export async function readPage(key:PageKey,locale:string){
 pageKeySchema.parse(key);localeSchema.parse(locale);
 const sql=publicDatabase();
 const rows=await sql`select * from app.read_public_page(${key},${locale})`;
 return rows.length?publicPageSchema.parse(rows[0]):null;
}
export async function readSettings(locale:string){
 localeSchema.parse(locale);const sql=publicDatabase();
 const rows=await sql`select * from app.read_public_settings(${locale})`;
 return rows.length?publicSettingsSchema.parse(rows[0]):null;
}
