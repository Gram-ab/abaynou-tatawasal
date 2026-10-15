import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import postgres from 'postgres';
import {localDatabaseUrl} from './local-target';

async function main(){
 if(process.env.ABAYNOU_E2E_TARGET!==undefined)throw new Error('STOP: owner snapshot must explicitly use the normal local target');
 const stage=process.argv[2];if(stage!=='before'&&stage!=='after')throw new Error('Use before or after');
 const db=postgres(localDatabaseUrl(),{max:1,connect_timeout:5,onnotice:()=>{}});
 const tables=['auth.users','app.application_profiles','app.complaints','app.commune_settings','app.commune_settings_translations','app.public_pages','app.public_page_versions','app.public_page_translations','app.categories','app.locations'];
 const result:Record<string,{count:number;digest:string}>={};
 try{for(const table of tables){
  const [row]=await db.unsafe(`select count(*)::int count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from ${table} t`);
  result[table]={count:row.count,digest:row.digest};
 }}finally{await db.end();}
 const file=resolve('.local/e2e/owner-before.json');
 if(stage==='before'){writeFileSync(file,JSON.stringify(result));console.log('Owner review data fingerprint recorded (counts and hashes only).');return;}
 const original=JSON.parse(readFileSync(file,'utf8')) as typeof result;
 const changed=tables.filter(table=>JSON.stringify(original[table])!==JSON.stringify(result[table]));
 if(changed.length)throw new Error(`STOP: owner review data changed in ${changed.join(', ')}`);
 console.log('Owner review accounts, complaints, settings, content, and catalogues match the pre-E2E read-only fingerprint.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Owner snapshot failed');process.exitCode=1;});
