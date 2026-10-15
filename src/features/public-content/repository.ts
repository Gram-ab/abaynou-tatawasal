import 'server-only';
import {cache} from 'react';
import {unstable_cache} from 'next/cache';
import {publicDatabase} from '@/shared/db/public';
import {localeSchema,pageKeySchema,publicPageSchema,publicSettingsSchema,type PageKey} from './model';
import {publicPagesTag,publicSettingsTag} from './cache-tags';

// Keep the existing dynamic-rendering architecture. This compatibility cache API
// avoids enabling Cache Components across authenticated routes just for public data.
// Only publication projections enter this cache; identities and legal acceptance do not.
const publishedPage=unstable_cache(async(key:PageKey,locale:string,_namespace:string)=>{
 void _namespace;
 const rows=await publicDatabase()`select * from app.read_public_page(${key},${locale})`;
 return rows.length?publicPageSchema.parse(rows[0]):null;
},['public-page-v1'],{tags:[publicPagesTag],revalidate:300});
const publishedSettings=unstable_cache(async(locale:string,_namespace:string)=>{
 void _namespace;
 const rows=await publicDatabase()`select * from app.read_public_settings(${locale})`;
 return rows.length?publicSettingsSchema.parse(rows[0]):null;
},['public-settings-v1'],{tags:[publicSettingsTag],revalidate:300});
const namespace=()=>[process.env.APP_ENV??'',process.env.SUPABASE_URL??''].join(':');
export const readPage=cache(async(key:PageKey,locale:string)=>{
 pageKeySchema.parse(key);localeSchema.parse(locale);
 return publishedPage(key,locale,namespace());
});
export const readSettings=cache(async(locale:string)=>{
 localeSchema.parse(locale);return publishedSettings(locale,namespace());
});
