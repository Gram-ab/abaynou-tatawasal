import {execFileSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';

const project='vdpflzhsohhvvwdrjzhd',origin='https://abaynou-tatawasal.vercel.app';
const workdir=resolve(`.local/hosted-staging-${project}`),cli=resolve('node_modules/supabase/dist/supabase.js');
let stage='input verification';
const literal=(value:string)=>`'${value.replaceAll("'","''")}'`;
function run(args:string[]):unknown{
 // Both output streams are captured: API keys and provider diagnostics must never
 // reach the terminal, files, process arguments or thrown child-process errors.
 try{return JSON.parse(execFileSync(process.execPath,[cli,...args,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60_000,maxBuffer:2_000_000}));}
 catch{throw new Error('Supabase CLI operation failed; private output suppressed');}
}
function query(sql:string):Record<string,unknown>{
 const result=run(['db','query','--linked','--project-ref',project,'--workdir',workdir,sql]) as {rows?:{result:Record<string,unknown>}[]};
 if(!result.rows?.[0]?.result)throw new Error('Unexpected database response');return result.rows[0].result;
}
async function main(){
 const {values}=parseArgs({options:{email:{type:'string'},name:{type:'string'},language:{type:'string',default:'ar'},apply:{type:'boolean',default:false}}});
 const input=z.object({email:z.string().trim().email().transform(v=>v.toLowerCase()),name:z.string().trim().min(1).max(200),language:z.enum(['ar','fr','en'])}).parse(values);
 if(existsSync('supabase/.temp/project-ref')||readFileSync(resolve(workdir,'supabase/.temp/project-ref'),'utf8').trim()!==project)throw new Error('Unexpected project link');
 if(process.env.SUPABASE_CLI_BINARY_OVERRIDE||process.env.SUPABASE_ACCESS_TOKEN)throw new Error('Use the existing authenticated CLI profile, without credential overrides');
 stage='hosted preflight';
 const before=query(`begin read only;select jsonb_build_object('admins',(select count(*) from app.application_profiles where role='ADMIN'),'identity',(select jsonb_build_object('id',id,'operation',raw_app_meta_data->>'hosted_initial_admin_bootstrap') from auth.users where lower(email)=${literal(input.email)}),'audit_ready',exists(select 1 from supabase_migrations.schema_migrations where version='20261021000100')) as result;rollback;`);
 if(before.admins!==0)throw new Error('An Admin already exists; bootstrap cannot add or promote another');
 if(before.identity)throw new Error('Email already exists; no password, profile or role was changed');
 if(before.audit_ready!==true)throw new Error('Apply the reviewed audit-source migration first');
 console.log('PASS: pinned hosted project; no existing Admin or email conflict; audit source ready.');
 if(!values.apply){console.log('Preflight only. --apply creates exactly one initial Admin and sends password setup email.');return;}
 stage='in-memory provider authorization';
 const keys=run(['projects','api-keys','--project-ref',project,'--reveal']) as {name?:string;type?:string;api_key?:string}[];
 if(!Array.isArray(keys))throw new Error('Unexpected API-key response');
 const secret=keys.find(k=>k.type==='secret'&&k.api_key?.startsWith('sb_secret_'))?.api_key??keys.find(k=>k.name==='service_role')?.api_key;
 if(!secret)throw new Error('Server Auth authorization unavailable');
 const auth=createClient(`https://${project}.supabase.co`,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(30_000)})}});
 const operation=randomUUID();
 stage='operator-created Auth identity';
 // The initial random password is disposable and never revealed/persisted. The
 // owner-selected mailbox is asserted by the operator, then receives the only
 // usable password-setting link through the existing scanner-safe recovery flow.
 const created=await auth.auth.admin.createUser({email:input.email,password:randomBytes(48).toString('base64url'),email_confirm:true,app_metadata:{hosted_initial_admin_bootstrap:operation},user_metadata:{language:input.language,preferred_language:input.language}});
 if(created.error||!created.data.user)throw new Error('Auth identity creation failed');
 const id=created.data.user.id;
 stage='atomic Admin profile and audit';
 query(`begin;select set_config('bootstrap.auth_id',${literal(id)},true),set_config('bootstrap.email',${literal(input.email)},true),set_config('bootstrap.full_name',${literal(input.name)},true),set_config('bootstrap.language',${literal(input.language)},true),set_config('bootstrap.operation',${literal(operation)},true);${readFileSync('deployment/supabase/08-initial-admin.sql','utf8')}select jsonb_build_object('created',true) as result;commit;`);
 stage='hosted readback';
 const verified=query(`begin read only;select jsonb_build_object('valid',exists(select 1 from app.application_profiles p join app.audit_events a on a.resource_id=p.id and a.action='STAFF_CREATED' where p.auth_user_id=${literal(id)}::uuid and p.role='ADMIN' and p.access_status='ACTIVE' and p.full_name=${literal(input.name)} and p.preferred_language=${literal(input.language)} and a.actor_type='SYSTEM' and a.change_summary=jsonb_build_object('source','HOSTED_INITIAL_ADMIN_BOOTSTRAP','role','ADMIN')),'sessions',(select count(*) from app.application_sessions s join app.application_profiles p on p.id=s.profile_id where p.auth_user_id=${literal(id)}::uuid)) as result;rollback;`);
 if(verified.valid!==true||verified.sessions!==0)throw new Error('Admin/audit readback failed');
 console.log('PASS: initial Admin profile and audit committed; preferred language verified; no login session created.');
 stage='password setup email';
 const sent=await auth.auth.resetPasswordForEmail(input.email,{redirectTo:`${origin}/${input.language}/commune/auth/confirm`});
 if(sent.error)throw new Error('Admin exists, but password email failed. Use Commune forgot-password; do not bootstrap again.');
 console.log('PASS: provider accepted password setup email. Check the chosen inbox/spam; use a private password of at least 15 characters.');
}
main().catch(()=>{console.error(`Initial Admin setup stopped at ${stage}. No credentials or provider responses printed. If identity/profile creation already succeeded, do not rerun or delete it: inspect the recorded state first. A created Admin can request its password email from Commune forgot-password.`);process.exitCode=1;});
