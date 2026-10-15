import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import postgres from 'postgres';
import {createClient} from '@supabase/supabase-js';
import {chromium,type BrowserContext} from '@playwright/test';
import {e2eTarget} from './e2e-target';
import {bootstrapLocalStaff} from './local-staff';
import {canonicalCategories,canonicalLocations} from '../fixtures/canonical-catalogue';

// Measurement harness only: no query, index, planner, pool-size or schema tuning.
// Secrets remain in process memory; stored results contain only aggregate metrics.
async function main(){
 if(process.env.APP_ENV!=='e2e'||process.env.ABAYNOU_E2E_TARGET!=='disposable')throw new Error('Disposable measurement target required');
 const target=e2eTarget(),runtime=process.env.DATABASE_URL!;
 if(process.env.APP_ORIGIN!==target.appOrigin||process.env.SUPABASE_URL!==target.apiUrl||new URL(runtime).port!=='55322'||new URL(runtime).username!=='app_web')throw new Error('Measurement endpoints do not match');
 const admin=postgres(target.adminDatabaseUrl,{max:1,onnotice:()=>{}});
 const web=postgres(runtime,{max:5,onnotice:()=>{},connection:{statement_timeout:5000}});
 const auth=createClient(target.apiUrl,target.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const password=randomBytes(32).toString('base64url'),run=randomUUID();
 const output:Record<string,unknown>={timestamp:new Date().toISOString(),environment:'Disposable local Supabase; production Next.js build',host:{logicalCpus:os.cpus().length,memoryGiB:Math.round(os.totalmem()/1024**3)},limitations:['Loopback/local hardware is not hosted Supabase Nano compute.','JSON result bytes exclude protocol/TLS/Auth overhead and are not metered egress.','Synthetic record growth does not establish a production retention forecast.']};
 mkdirSync('.local/quality',{recursive:true});
 const progress=(phase:string)=>{writeFileSync('.local/quality/progress.json',JSON.stringify({phase,time:new Date().toISOString()}));console.log(phase);};
 const save=()=>writeFileSync('.local/quality/measurements.json',JSON.stringify(output,null,2));
 const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,p50ms:+sorted[Math.floor((sorted.length-1)*.5)].toFixed(2),p95ms:+sorted[Math.ceil((sorted.length-1)*.95)].toFixed(2),maxMs:+sorted.at(-1)!.toFixed(2)};};
 type Actor={auth:string;provider:string;digest:Buffer;profile:string;email:string};
 async function session(id:string,email:string,audience:'CITIZEN'|'COMMUNE'):Promise<Actor>{
  const provider=randomUUID(),digest=randomBytes(32);
  const [row]=await web`select * from app.create_application_session(${id},${provider},${digest},${audience})`;
  if(!row)throw new Error('Synthetic session unavailable');
  return {auth:id,provider,digest,profile:String(row.profile_id),email};
 }
 async function storage(){
  const [total]=await admin`select pg_database_size(current_database())::bigint bytes`;
  const rows=await admin`select c.relname,pg_total_relation_size(c.oid)::bigint bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r' order by pg_total_relation_size(c.oid) desc`;
  const [count]=await admin`select count(*)::int complaints from app.complaints`;
  return {databaseBytes:Number(total.bytes),applicationBytes:rows.reduce((sum,row)=>sum+Number(row.bytes),0),complaints:count.complaints,tables:rows.map(row=>({name:row.relname,bytes:Number(row.bytes)}))};
 }
 const records:Actor[]=[],references:string[]=[];
 let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  progress('Preparing synthetic identities; owner stack is untouched.');
  // All existing staff in this database are disposable regression fixtures.
  // Bound fan-out at five active staff so old fixtures do not distort growth.
  await admin`update app.application_profiles set access_status='DISABLED' where role in ('AGENT','ADMIN') and access_status='ACTIVE'`;
  const staff:Actor[]=[];
  for(let i=0;i<5;i++){
   const email=`measure-staff-${i}-${run}@example.test`;
   const fixture=await bootstrapLocalStaff({email,password,fullName:`Synthetic Staff ${i}`,role:i===0?'ADMIN':'AGENT',language:'en'});
   const [row]=await admin`select auth_user_id from app.application_profiles where id=${fixture.profileId}`;
   staff.push(await session(String(row.auth_user_id),email,'COMMUNE'));
  }
  const [legal]=await web`select * from app.read_signup_legal('en')`;
  async function citizen(index:number){
   const email=`measure-citizen-${index}-${run}@example.test`;let id:string;
   if(index<20){
    const result=await auth.auth.admin.createUser({email,password,email_confirm:true});
    if(result.error||!result.data.user)throw new Error('Synthetic Auth creation failed');id=result.data.user.id;
   }else{id=randomUUID();await admin`insert into auth.users(id,email,email_confirmed_at) values(${id},${email},now())`;}
   const name=`Synthetic Citizen ${index}`;
   await web`select * from app.provision_citizen(${id},${name},null,'en',${legal.terms_version_id},${legal.privacy_version_id})`;
   return session(id,email,'CITIZEN');
  }
  const baseline=await storage(),checkpoints:unknown[]=[],timings:unknown[]=[];output.storageBaseline=baseline;
  for(const desired of [1000,10000]){
   progress(`Generating ${desired} complaints through real submission commands with constraints enabled.`);
   for(let index=records.length;index<desired/10;index++){
    const actor=await citizen(index);records.push(actor);
    await web.begin(async tx=>{
     for(let n=0;n<10;n++){
      const number=index*10+n,language=number%3;
      const subject=number%100===0?`Measurement needle case ${number}`:language===0?`قياس خدمة محلية ${number}`:language===1?`Mesure du service communal ${number}`:`Measurement local service ${number}`;
      const base=language===0?'هذه شكاية اصطناعية لقياس أداء خدمة محلية دون بيانات شخصية. ':language===1?'Réclamation synthétique sur un service local, sans données personnelles. ':'Synthetic complaint about a local service, containing no personal data. ';
      const description=base.repeat(5+number%12).slice(0,1500);
      const [row]=await tx`select * from app.submit_complaint(${actor.auth},${actor.provider},${actor.digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[number%canonicalCategories.length].id},${canonicalLocations[number%canonicalLocations.length].id},${subject},${description},null,true)`;
      references.push(String(row.reference));
     }
    });
    if((index+1)%100===0)progress(`Synthetic complaints committed: ${(index+1)*10}`);
   }
   const snapshot=await storage();checkpoints.push({syntheticComplaints:desired,...snapshot,incrementalApplicationBytes:snapshot.applicationBytes-baseline.applicationBytes,bytesPerSubmittedComplaint:(snapshot.applicationBytes-baseline.applicationBytes)/desired});
   const a=staff[0],c=records[0];
   const cases=[
    {name:'Citizen list (20)',run:()=>web`select * from app.list_own_complaints(${c.auth},${c.provider},${c.digest},null,null,null,null,20)`},
    {name:'Commune page 1',run:()=>web`select * from app.page_staff_complaints(${a.auth},${a.provider},${a.digest},null,null,null,1,20)`},
    {name:'Commune deep page',run:()=>web`select * from app.page_staff_complaints(${a.auth},${a.provider},${a.digest},null,null,null,${Math.floor(desired/20)},20)`},
    {name:'Commune selective search',run:()=>web`select * from app.page_staff_complaints(${a.auth},${a.provider},${a.digest},'needle',null,null,1,20)`},
    {name:'Commune Arabic search',run:()=>web`select * from app.page_staff_complaints(${a.auth},${a.provider},${a.digest},'قياس',null,null,1,20)`},
    {name:'Dashboard counts',run:()=>web`select * from app.staff_complaint_counts(${a.auth},${a.provider},${a.digest})`},
    {name:'Staff unread summary',run:()=>web`select * from app.notification_summary(${a.auth},${a.provider},${a.digest})`}
   ];
   for(const item of cases){
    await item.run();const values:number[]=[];let payloadBytes=0;
    for(let sample=0;sample<30;sample++){const start=performance.now(),rows=await item.run();values.push(performance.now()-start);payloadBytes=Buffer.byteLength(JSON.stringify(rows));}
    timings.push({syntheticComplaints:desired,name:item.name,...stats(values),jsonPayloadBytes:payloadBytes});
   }
   output.storage=checkpoints;output.databaseTimings=timings;save();
  }
  progress('Checking bounded Admin-only lookups above 1,000 Auth users.');
  const a=staff[0],g=staff[1],c=records[0];let checks=0;
  const [found]=await web`select * from app.find_auth_user_for_staff_admin(${a.auth},${a.provider},${a.digest},${records.at(-1)!.email})`;
  if(found?.auth_user_id!==records.at(-1)!.auth)throw new Error('Exact lookup failed');checks++;
  for(const denied of [g,c]){
   try{await web`select * from app.find_auth_user_for_staff_admin(${denied.auth},${denied.provider},${denied.digest},${a.email})`;throw new Error('Unauthorized lookup accepted');}
   catch(error){if((error as {code?:string}).code!=='42501')throw error;checks++;}
  }
  try{await web`select raw_user_meta_data from auth.users limit 1`;throw new Error('Raw metadata exposed');}
  catch(error){if((error as {code?:string}).code!=='42501')throw error;checks++;}
  try{await web`select * from app.read_staff_activation_states(${a.auth},${a.provider},${a.digest},${web.array(Array(51).fill(a.profile))}::uuid[])`;throw new Error('Unbounded read accepted');}
  catch(error){if((error as {code?:string}).code!=='22023')throw error;checks++;}
  output.authBoundaryChecks={passed:checks,failed:0};
  progress('Capturing existing query plans without changing indexes or planner settings.');
  const simplify=(node:Record<string,unknown>):unknown=>Object.fromEntries(Object.entries(node).filter(([key])=>['Node Type','Relation Name','Index Name','Actual Rows','Actual Loops','Actual Total Time','Rows Removed by Filter','Shared Hit Blocks','Shared Read Blocks','Sort Method','Sort Space Used','Plans'].includes(key)).map(([key,value])=>[key,key==='Plans'?(value as Record<string,unknown>[]).map(simplify):value]));
  output.queryPlans=await admin.begin(async tx=>{
   await tx`set local role app_writer`;await tx`select * from app.require_complaint_staff(${a.auth},${a.provider},${a.digest},false)`;
   const plans:unknown[]=[];
   for(const search of [null,'needle','قياس']){
    const [row]=await tx`explain (analyze,buffers,format json) select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.status,c.submitted_at,c.updated_at,c.revision,p.full_name,count(*) over() from app.complaints c join app.application_profiles p on p.id=c.citizen_id where (${search}::text is null or c.reference ilike '%'||${search}||'%' or c.subject ilike '%'||${search}||'%' or p.full_name ilike '%'||${search}||'%') order by c.submitted_at desc,c.reference desc limit 20 offset 0`;
    const root=row['QUERY PLAN'][0];plans.push({search:search??'unfiltered',executionMs:root['Execution Time'],planningMs:root['Planning Time'],plan:simplify(root.Plan)});
   }
   return plans;
  });
  save();progress('Measuring 100 complete lifecycles using existing guarded commands.');
  const beforeLifecycle=await storage();
  for(const reference of references.slice(0,100)){
   await web`select * from app.start_complaint_review(${a.auth},${a.provider},${a.digest},${reference},1,${randomUUID()},${randomBytes(32)})`;
   await web`select * from app.start_complaint_processing(${a.auth},${a.provider},${a.digest},${reference},2,${randomUUID()},${randomBytes(32)})`;
   await web`select * from app.issue_complaint_response(${a.auth},${a.provider},${a.digest},${reference},3,${randomUUID()},${randomBytes(32)},'Synthetic official response for measurement purposes.')`;
   await web`select * from app.close_complaint(${a.auth},${a.provider},${a.digest},${reference},4,${randomUUID()},${randomBytes(32)})`;
  }
  const afterLifecycle=await storage();output.lifecycleStorage={samples:100,additionalApplicationBytes:afterLifecycle.applicationBytes-beforeLifecycle.applicationBytes,additionalBytesPerCompletedComplaint:(afterLifecycle.applicationBytes-beforeLifecycle.applicationBytes)/100};
  await web.end();progress('Measuring production HTTP requests and client navigation.');
  browser=await chromium.launch({headless:true});const contexts:BrowserContext[]=[];
  async function login(email:string,area:'citizen'|'commune',locale='en'){
   const context=await browser!.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
   await page.goto(target.appOrigin+`/${locale}/${area==='citizen'?'login':'commune/login'}`);
   await page.locator('[name=email]').fill(email);await page.locator('[name=password]').fill(password);
   await page.locator(area==='citizen'?'button[type=submit]':'.commune-form button').click();
   await page.waitForURL(target.appOrigin+`/${locale}/${area}`);contexts.push(context);return {context,page};
  }
  const nav:{case:string;passed:boolean}[]=[],adminBrowser=await login(a.email,'commune');
  await adminBrowser.page.goto(target.appOrigin+'/en/commune/staff');await adminBrowser.page.locator('h1').waitFor();
  await adminBrowser.page.evaluate(()=>Reflect.set(window,'qualityNavigationMarker',true));
  await adminBrowser.page.locator('.staff-filters [name=q]').fill('Synthetic');
  await Promise.all([adminBrowser.page.waitForURL(/q=Synthetic/),adminBrowser.page.locator('.staff-filters button').click()]);
  nav.push({case:'Admin GET filter preserves document',passed:await adminBrowser.page.evaluate(()=>Reflect.get(window,'qualityNavigationMarker')===true)});
  await adminBrowser.context.close();contexts.pop();
  for(const locale of ['ar','fr','en']){
   const entry=await login(c.email,'citizen',locale);await entry.page.evaluate(()=>Reflect.set(window,'qualityNavigationMarker',true));
   await entry.page.locator(`.citizen-nav a[href="/${locale}/citizen/complaints"]`).click();await entry.page.waitForURL(target.appOrigin+`/${locale}/citizen/complaints`);
   nav.push({case:`${locale} Citizen section preserves document`,passed:await entry.page.evaluate(()=>Reflect.get(window,'qualityNavigationMarker')===true)});
   await entry.context.close();contexts.pop();
  }
  output.navigation=nav;if(nav.some(item=>!item.passed))throw new Error('Client navigation caused a full reload');
  for(const actor of records.slice(0,20))await login(actor.email,'citizen');
  const capacity:unknown[]=[];
  for(const concurrency of [1,5,10,20]){
   const values:number[]=[];let errors=0,totalBytes=0,peakConnections=0,sampling=true;
   const monitor=(async()=>{while(sampling){const [row]=await admin`select count(*)::int count from pg_stat_activity where usename='app_web'`;peakConnections=Math.max(peakConnections,row.count);await new Promise(resolve=>setTimeout(resolve,100));}})();
   const start=performance.now();
   await Promise.all(contexts.slice(0,concurrency).map(async context=>{
    for(let i=0;i<5;i++){
     const at=performance.now(),response=await context.request.get(target.appOrigin+'/en/citizen/complaints'),body=await response.body();
     values.push(performance.now()-at);totalBytes+=body.length;if(response.status()!==200||new URL(response.url()).pathname!=='/en/citizen/complaints'||!body.includes(Buffer.from('class="tracking-page"')))errors++;
    }
   }));
   sampling=false;await monitor;
   capacity.push({concurrency,requests:values.length,...stats(values),errors,throughputRequestsPerSecond:values.length/((performance.now()-start)/1000),peakWebDatabaseConnections:peakConnections,appHtmlBytes:totalBytes});
  }
  output.httpCapacity=capacity;output.finalStorage=await storage();save();progress('Measurements complete; no query/index/capacity tuning applied.');
 }finally{await browser?.close();await web.end().catch(()=>{});await admin.end();}
}
main().catch(error=>{console.error('Isolated measurements failed at the aggregate progress phase; code: '+String(error?.code??error?.name??'unknown'));console.error(String(error?.stack??'').split('\n').filter(line=>line.trim().startsWith('at ')).slice(0,4).join('\n'));process.exitCode=1;});
