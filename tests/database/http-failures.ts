import assert from 'node:assert/strict';
import postgres from 'postgres';
import {readFileSync} from 'node:fs';
import {localDatabaseUrl} from '../../scripts/local-target';
async function main(){
 const sql=postgres(localDatabaseUrl(),{max:1,onnotice:()=>{}});let checks=0;
 const check=(value:unknown,name:string)=>{assert.ok(value,name);checks++;console.log(`PASS ${name}`);};
 try{
  await sql`revoke execute on function app.read_public_page(text,text) from app_web`;
  try{const body=await(await fetch('http://127.0.0.1:3000/en/privacy')).text();check(body.includes('We could not load this information'),'database permission failure produces localized safe state');check(!body.includes('permission denied'),'database error details are not exposed');}
  finally{await sql`grant execute on function app.read_public_page(text,text) to app_web`;}
  await sql`revoke execute on function app.read_public_settings(text) from app_web`;
  try{const body=await(await fetch('http://127.0.0.1:3000/fr/contact')).text();check(body.includes('temporairement indisponibles'),'missing settings has localized safe state');}
  finally{await sql`grant execute on function app.read_public_settings(text) to app_web`;}
  const [home]=await sql`select * from app.public_pages where page_key='PRIVACY'`;
  await sql.begin(async tx=>{await tx`alter table app.public_pages disable trigger page_transition`;await tx`update app.public_pages set current_version=null where id=${home.id}`;await tx`set constraints all immediate`;await tx`alter table app.public_pages enable trigger page_transition`;});
  try{const body=await(await fetch('http://127.0.0.1:3000/en/privacy')).text();check(body.includes('Information not yet available'),'missing required publication has safe state');check(!body.includes('Official policy pending'),'unpublished content absent from HTML');}
  finally{await sql.begin(async tx=>{await tx`alter table app.public_pages disable trigger page_transition`;await tx`update app.public_pages set current_version=${home.current_version} where id=${home.id}`;await tx`set constraints all immediate`;await tx`alter table app.public_pages enable trigger page_transition`;});}
  const env=readFileSync('.env.local','utf8');const secret=new URL(env.match(/^DATABASE_URL=(.+)$/m)![1]).password;
  const body=await(await fetch('http://127.0.0.1:3000/en')).text();check(!body.includes(secret)&&!body.includes('DATABASE_URL')&&!body.includes('audit_event_id'),'runtime secret and metadata absent from public HTML');
  const scripts=[...body.matchAll(/src="([^\"]+\.js[^\"]*)"/g)].map(m=>m[1]);
  check(scripts.length>0,'browser bundle found');
  for(const path of scripts){const bundle=await(await fetch(new URL(path,'http://127.0.0.1:3000'))).text();assert.ok(!bundle.includes(secret)&&!bundle.includes('postgresql://app_web'),'secret not present in browser bundle');}
  checks++;console.log('PASS browser bundles contain no runtime credential');
  console.log(`Live HTTP failure integration: ${checks} checks passed; fixture state and grants restored.`);
 }finally{await sql.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
