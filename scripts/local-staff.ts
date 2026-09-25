import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import postgres from 'postgres';
import {z} from 'zod';
import {localDatabaseUrl} from './local-target';
import {staffPassword} from '../src/features/commune-auth/model';
export const staffFixtureSchema=z.object({email:z.string().trim().email().transform(v=>v.toLowerCase()),password:staffPassword,fullName:z.string().trim().min(1).max(200),role:z.enum(['AGENT','ADMIN']),language:z.enum(['ar','fr','en']).default('ar')});
export async function bootstrapLocalStaff(input:z.input<typeof staffFixtureSchema>){
 const value=staffFixtureSchema.parse(input);
 const db=postgres(localDatabaseUrl(),{max:1,onnotice:()=>{}});
 try{
  const status=JSON.parse(execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  const endpoint=new URL(status.API_URL);
  if(endpoint.protocol!=='http:'||!['127.0.0.1','localhost'].includes(endpoint.hostname)||endpoint.port!=='54321')throw new Error('STOP: non-local Auth endpoint');
  const auth=createClient(endpoint.href,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  return await db.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtextextended(${value.email},0))`;
   const [existing]=await tx`select u.id,u.email_confirmed_at,u.raw_app_meta_data,p.role,p.access_status,p.id profile_id from auth.users u left join app.application_profiles p on p.auth_user_id=u.id where lower(u.email)=${value.email}`;
   if(existing?.role){
    if(existing.role!==value.role||existing.access_status!=='ACTIVE'||!existing.email_confirmed_at||existing.raw_app_meta_data?.local_staff_fixture!==true)throw new Error('STOP: conflicting or unmanaged existing identity');
    return {created:false,profileId:existing.profile_id as string};
   }
   if(existing&& (existing.raw_app_meta_data?.local_staff_fixture!==true||existing.raw_app_meta_data?.local_staff_role!==value.role||!existing.email_confirmed_at))throw new Error('STOP: conflicting existing identity');
   let id=existing?.id as string|undefined;
   if(!id){
    const {data,error}=await auth.auth.admin.createUser({email:value.email,password:value.password,email_confirm:true,app_metadata:{local_staff_fixture:true,local_staff_role:value.role},user_metadata:{language:value.language}});
    if(error||!data.user)throw new Error('Local Auth identity creation failed');
    id=data.user.id;
   }
   // A prior interrupted run may leave a marked Auth identity. Reconcile only that exact role.
   const [profile]=await tx`insert into app.application_profiles(auth_user_id,full_name,preferred_language,role,access_status) values(${id},${value.fullName},${value.language},${value.role},'ACTIVE') returning id`;
   await tx`insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary) values('SYSTEM','STAFF_CREATED','APPLICATION_PROFILE',${profile.id},'{"source":"LOCAL_STAFF_FIXTURE"}'::jsonb)`;
   return {created:true,profileId:profile.id as string};
  });
 }finally{await db.end();}
}
