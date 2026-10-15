import postgres from 'postgres';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {e2eTarget} from '../../scripts/e2e-target';

export default async function globalSetup(){
 const target=e2eTarget();
 const web=new URL(process.env.DATABASE_URL??''),mailer=new URL(process.env.MAILER_DATABASE_URL??'');
 const admin=new URL(target.adminDatabaseUrl);
 if(process.env.APP_ENV!=='e2e'||process.env.APP_ORIGIN!==target.appOrigin||process.env.SUPABASE_URL!==target.apiUrl||process.env.E2E_APP_ORIGIN!==target.appOrigin||process.env.E2E_MAILPIT_ORIGIN!==target.mailpitOrigin||process.env.SMTP_PORT!=='55325'||!process.env.E2E_APP_DATABASE_PASSWORD||web.hostname!==admin.hostname||web.port!==admin.port||web.pathname!==admin.pathname||web.username!=='app_web'||web.password!==process.env.E2E_APP_DATABASE_PASSWORD||mailer.hostname!==admin.hostname||mailer.port!==admin.port||mailer.pathname!==admin.pathname||mailer.username!=='app_mailer')throw new Error('STOP: isolated E2E app, Auth, worker, Mailpit, or database configuration mismatch');
 const db=postgres(target.adminDatabaseUrl,{max:1,connect_timeout:5});
 try{
  const [identity]=await db`select current_database() database,inet_server_port() port`;
  if(identity.database!=='postgres'||Number(identity.port)!==5432)throw new Error('STOP: unexpected isolated Postgres instance');
  const auth=await fetch(new URL('/auth/v1/health',target.apiUrl),{headers:{apikey:target.anonKey}});
  if(!auth.ok)throw new Error('STOP: isolated Auth is unavailable');
  const client=createClient(target.apiUrl,target.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const created=await client.auth.admin.createUser({email:`e2e-target-proof-${randomUUID()}@example.test`,password:randomUUID()+randomUUID(),email_confirm:true});
  if(created.error||!created.data.user)throw new Error('STOP: isolated Auth identity proof failed');
  try{const [row]=await db`select count(*)::int as count from auth.users where id=${created.data.user.id}`;if(row.count!==1)throw new Error('STOP: Auth and database are not the same isolated stack');}
  finally{await client.auth.admin.deleteUser(created.data.user.id);}
  const mail=await fetch(new URL('/api/v1/messages',target.mailpitOrigin));
  if(!mail.ok)throw new Error('STOP: isolated Mailpit is unavailable');
  const app=await fetch(new URL('/en',target.appOrigin));
  if(!app.ok)throw new Error('STOP: isolated application is unavailable');
 }finally{await db.end();}
}
