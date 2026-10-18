import {X509Certificate} from 'node:crypto';
import type {Options} from 'postgres';

type RuntimeEnvironment={APP_ENV?:string;SUPABASE_URL?:string;DATABASE_CA_CERT?:string};
function hostedTls(certificate:string|undefined){
 if(certificate===undefined)return 'verify-full' as const;
 try{
  const ca=certificate.replaceAll('\\n','\n').trim();
  if(ca.length>16384||!/^-----BEGIN CERTIFICATE-----[\r\n]+[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----$/u.test(ca)||!new X509Certificate(ca).ca)throw new Error();
  return {ca,rejectUnauthorized:true};
 }catch{throw new Error('Hosted database CA configuration invalid');}
}
export function restrictedDatabaseOptions(value:string,role:'app_web'|'app_mailer',env:RuntimeEnvironment={APP_ENV:process.env.APP_ENV,SUPABASE_URL:process.env.SUPABASE_URL,DATABASE_CA_CERT:process.env.DATABASE_CA_CERT}):Options<Record<string,never>>{
 const url=new URL(value),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('PostgreSQL connection required');
 const shared=url.hostname.endsWith('.pooler.supabase.com');
 const expectedProject=env.SUPABASE_URL?new URL(env.SUPABASE_URL).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1]:undefined;
 const username=decodeURIComponent(url.username);
 if(username!==role&&!(shared&&expectedProject&&username===`${role}.${expectedProject}`))throw new Error('Restricted database identity required');
 if((env.APP_ENV==='local'||env.APP_ENV==='e2e')&&!local)throw new Error('Local and E2E databases must use loopback');
 if(env.APP_ENV==='local'&&url.port!=='54322')throw new Error('Local database port mismatch');
 if(env.APP_ENV==='e2e'&&url.port!=='55322')throw new Error('E2E database port mismatch');
 if(shared&&url.port==='6543')throw new Error('Shared transaction pooling is not supported by the installed Postgres.js driver; use the session pooler or a verified direct connection');
 return {max:role==='app_web'?5:1,connect_timeout:5,idle_timeout:role==='app_web'?20:120,max_lifetime:600,
  ssl:local?false:hostedTls(env.DATABASE_CA_CERT),prepare:!shared,onnotice:()=>{},connection:{statement_timeout:5000}};
}
