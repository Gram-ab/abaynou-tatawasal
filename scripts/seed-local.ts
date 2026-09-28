import postgres from 'postgres';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {localDatabaseUrl} from './local-target';
import {developmentPages,developmentSettings} from '../fixtures/public-content';
import {publicationSchema,publicSettingsSchema} from '../src/features/public-content/model';
import {seedCatalogues} from './seed-catalogues';
import {ensureLocalComplaintAuthUsage} from './local-complaint-auth-grant';

async function main() {
 const url=localDatabaseUrl();
 const sql=postgres(url,{max:1,onnotice:()=>{}});
 let publications=0;
 try {
  ensureLocalComplaintAuthUsage();
  await seedCatalogues(sql);
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
   const status=JSON.parse(execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'status','-o','json'],{encoding:'utf8'}));
   const cookieSecret=prior.match(/^AUTH_COOKIE_SECRET=(.+)$/m)?.[1]??randomBytes(32).toString('base64url');
   execFileSync('git',['check-ignore','--quiet','.env.local'],{stdio:'ignore'});
   const fingerprintSecret=prior.match(/^COMMAND_FINGERPRINT_SECRET=(.+)$/m)?.[1]??randomBytes(32).toString('hex');
   if(!/^[a-f0-9]{64}$/.test(fingerprintSecret))throw new Error('Invalid existing fingerprint configuration');
   const priorMailerUrl=prior.match(/^MAILER_DATABASE_URL=(.+)$/m)?.[1];
   const priorMailerPassword=priorMailerUrl?new URL(priorMailerUrl).password:'';
   const mailerPassword=/^[a-f0-9]{64}$/.test(priorMailerPassword)?priorMailerPassword:randomBytes(32).toString('hex');
   await sql.unsafe(`alter role app_mailer password '${mailerPassword}'`);
   const mailerRuntime=new URL(url);mailerRuntime.username='app_mailer';mailerRuntime.password=mailerPassword;
   writeFileSync('.env.local',`APP_ENV=local\nAPP_ORIGIN=http://127.0.0.1:3000\nDATABASE_URL=${runtime.href}\nMAILER_DATABASE_URL=${mailerRuntime.href}\nSUPABASE_URL=${status.API_URL}\nSUPABASE_PUBLISHABLE_KEY=${status.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\nAUTH_COOKIE_SECRET=${cookieSecret}\nCOMMAND_FINGERPRINT_SECRET=${fingerprintSecret}\nSMTP_HOST=127.0.0.1\nSMTP_PORT=54325\nSMTP_SECURE=false\nMAIL_FROM=Abaynou Tatawasal <no-reply@abaynou.test>\n`,{mode:0o600});
  }
  console.log(`Development fixtures ready: ${publications} new publications; settings changed: ${settingsChanged}. Runtime credential stored only in ignored .env.local.`);
 } finally {await sql.end();}
}
main().catch(()=>{console.error('Local fixture initialization failed. Inspect database constraints with the local test tools.');process.exitCode=1;});
