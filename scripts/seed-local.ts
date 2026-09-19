import postgres from 'postgres';
import {randomBytes} from 'node:crypto';
import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {localDatabaseUrl} from './local-target';
import {developmentPages,developmentSettings} from '../fixtures/public-content';
import {publicationSchema,publicSettingsSchema} from '../src/features/public-content/model';

async function main() {
 const url=localDatabaseUrl();
 const sql=postgres(url,{max:1,onnotice:()=>{}});
 let publications=0;
 try {
  for(const [key,bundle] of Object.entries(developmentPages)) {
   publicationSchema.parse(bundle);
   await sql.begin(async tx=>{
    const [page]=await tx`select id,revision,current_version from app.public_pages where page_key=${key} for update`;
    const rows=await tx`select t.language,t.title,t.body from app.public_page_translations t join app.public_page_versions v on v.id=t.version_id where v.page_id=${page.id} and v.version_number=${page.current_version}`;
    const current=Object.fromEntries(rows.map(r=>[r.language,{title:r.title,body:r.body}]));
    if(!isDeepStrictEqual(current,bundle)) {
     await tx`select app.publish_development_page(${key},${page.revision},${tx.json(bundle)})`;
     publications++;
    }
   });
  }
  const phone='+00000000000'; // visibly fictional, never an official number
  const email='commune@example.invalid'; // reserved non-deliverable development domain
  for(const value of Object.values(developmentSettings)) publicSettingsSchema.parse({...value,contact_phone:phone,contact_email:email,chikaya_url:'https://chikaya.ma/'});
  let settingsChanged=false;
  await sql.begin(async tx=>{
   const [settings]=await tx`select * from app.commune_settings`;
   const rows=await tx`select language,commune_name,public_address,opening_hours from app.commune_settings_translations`;
   const current=Object.fromEntries(rows.map(r=>[r.language,{commune_name:r.commune_name,public_address:r.public_address,opening_hours:r.opening_hours}]));
   if(!settings || settings.contact_phone!==phone || settings.contact_email!==email || settings.chikaya_url!=='https://chikaya.ma/' || !isDeepStrictEqual(current,developmentSettings)) {
    await tx`select app.configure_development_settings(${settings?.revision??0},${phone},${email},'https://chikaya.ma/',${tx.json(developmentSettings)})`;
    settingsChanged=true;
   }
  });
  {
   const prior=existsSync('.env.local')?readFileSync('.env.local','utf8'):'';
   const priorUrl=prior.match(/^DATABASE_URL=(.+)$/m)?.[1];
   const priorPassword=priorUrl?new URL(priorUrl).password:'';
   const password=!process.argv.includes('--runtime-credential') && /^[a-f0-9]{64}$/.test(priorPassword)?priorPassword:randomBytes(32).toString('hex');
   // Password is generated hex, never user input; PostgreSQL does not parameterize ALTER ROLE.
   await sql.unsafe(`alter role app_web password '${password}'`);
   const runtime=new URL(url);runtime.username='app_web';runtime.password=password;
   writeFileSync('.env.local',`APP_ENV=local\nDATABASE_URL=${runtime.href}\n`,{mode:0o600});
  }
  console.log(`Development fixtures ready: ${publications} new publications; settings changed: ${settingsChanged}. Runtime credential stored only in ignored .env.local.`);
 } finally {await sql.end();}
}
main().catch(()=>{console.error('Local fixture initialization failed. Inspect database constraints with the local test tools.');process.exitCode=1;});
