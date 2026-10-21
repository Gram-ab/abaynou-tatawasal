import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import postgres from 'postgres';
import {restrictedDatabaseOptions} from '../src/shared/db/options';
import {PromotionError,type PromotionProvider,type PromotionStore} from './hosted-staff-promotion';

export const hostedPromotionProject='vdpflzhsohhvvwdrjzhd';
const apiUrl=`https://${hostedPromotionProject}.supabase.co`;
const pooler='aws-0-eu-west-1.pooler.supabase.com';
const caHash='700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7';
export function validatePromotionConfiguration(input:{linkedRef:string;rootLinked:boolean;ca:Buffer;cliOverride?:string;tokenOverride?:string}){
 if(input.rootLinked||input.linkedRef.trim()!==hostedPromotionProject||input.cliOverride||input.tokenOverride||createHash('sha256').update(input.ca).digest('hex')!==caHash)throw new Error('Hosted promotion configuration is not the reviewed pinned target');
 return {url:apiUrl,host:pooler,port:5432,database:'postgres',username:`app_web.${hostedPromotionProject}`,ca:input.ca.toString('utf8')};
}
export function promotionConfiguration(){
 const release=resolve(`.local/hosted-staging-${hostedPromotionProject}`);
 return validatePromotionConfiguration({linkedRef:readFileSync(resolve(release,'supabase/.temp/project-ref'),'utf8'),rootLinked:existsSync('supabase/.temp/project-ref'),ca:readFileSync(resolve(release,'certs/supabase-root.crt')),cliOverride:process.env.SUPABASE_CLI_BINARY_OVERRIDE,tokenOverride:process.env.SUPABASE_ACCESS_TOKEN});
}
export function selectPromotionPublicKey(value:unknown):string{
 if(!Array.isArray(value))throw new Error('Public Auth configuration unavailable');
 for(const item of value){if(item?.type==='publishable'&&typeof item.api_key==='string'&&item.api_key.startsWith('sb_publishable_'))return item.api_key;}
 for(const item of value){
  if(item?.name!=='anon'||typeof item.api_key!=='string'||!item.api_key.startsWith('eyJ'))continue;
  try{const claims=JSON.parse(Buffer.from(item.api_key.split('.')[1],'base64url').toString());if(claims.role==='anon'&&claims.ref===hostedPromotionProject)return item.api_key;}catch{/* Reject malformed/incorrectly scoped public keys. */}
 }
 throw new Error('Public Auth configuration unavailable');
}
export function promotionPublicKey(){
 try{
  const output=execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'projects','api-keys','--project-ref',hostedPromotionProject,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30_000,maxBuffer:1_000_000});
  return selectPromotionPublicKey(JSON.parse(output));
 }catch{throw new Error('Existing Supabase CLI login and public Auth configuration are required; private CLI output suppressed');}
}
export function promotionProvider(key:string):PromotionProvider{
 const auth=createClient(apiUrl,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(30_000)})}});
 let signedIn=false;
 return {
  async authenticate(email,password){
   const login=await auth.auth.signInWithPassword({email,password});
   signedIn=Boolean(login.data.session);
   if(login.error||!login.data.session)throw new PromotionError('authentication');
   const [{data:user,error:userError},{data:claims,error:claimError}]=await Promise.all([auth.auth.getUser(),auth.auth.getClaims()]);
   const claim=claims?.claims;
   if(userError||claimError||!user.user?.email_confirmed_at||!claim||user.user.id!==claim.sub||typeof claim.session_id!=='string')throw new PromotionError('authentication');
   return {authUserId:user.user.id,providerSessionId:claim.session_id,confirmed:true};
  },
  async signOutLocal(){if(signedIn){const result=await auth.auth.signOut({scope:'local'});if(result.error)throw new Error('CLI provider session cleanup failed');signedIn=false;}}
 };
}
export function promotionDatabaseUrl(config:{username:string;host:string;port:number;database:string},password:string){
 if(!password||password.length>4096||password.includes('\0'))throw new Error('Restricted database credential required');
 const url=new URL(`postgresql://${config.username}@${config.host}:${config.port}/${config.database}`);
 url.password=encodeURIComponent(password);
 return url.href;
}
export function promotionStore(config:ReturnType<typeof promotionConfiguration>,password:string){
 const url=promotionDatabaseUrl(config,password);
 const sql=postgres(url,{...restrictedDatabaseOptions(url,'app_web',{APP_ENV:'staging',SUPABASE_URL:config.url,DATABASE_CA_CERT:config.ca}),max:1,connect_timeout:10,idle_timeout:5,max_lifetime:60});
 const store:PromotionStore={
  async identity(auth){const [row]=await sql`select * from app.read_application_identity(${auth})`;return row?{profileId:String(row.profile_id),role:String(row.role),accessStatus:String(row.access_status)}:null;},
  async createSession(p){return (await sql`select * from app.create_application_session(${p.authUserId},${p.providerSessionId},${p.digest},'COMMUNE')`).length===1;},
  async target(p,email){
   const [auth]=await sql`select * from app.find_auth_user_for_staff_admin(${p.authUserId},${p.providerSessionId},${p.digest},${email})`;
   if(!auth)return null;
   const identity=await store.identity(String(auth.auth_user_id));
   if(!identity||!['AGENT','ADMIN'].includes(identity.role))return null;
   const [row]=await sql`select * from app.read_staff_account(${p.authUserId},${p.providerSessionId},${p.digest},${identity.profileId})`;
   if(!row)return null;
   const [activation]=await sql`select * from app.read_staff_activation_states(${p.authUserId},${p.providerSessionId},${p.digest},array[${identity.profileId}::uuid])`;
   return {profileId:identity.profileId,authUserId:String(auth.auth_user_id),email:String(row.email),fullName:String(row.full_name),role:String(row.role),accessStatus:String(row.access_status),revision:Number(row.revision),confirmed:Boolean(row.email_confirmed_at),activationPending:activation?.activation_pending!==false};
  },
  async promote(p,target,reason){
   const [row]=await sql`select * from app.manage_staff_authority(${p.authUserId},${p.providerSessionId},${p.digest},${target.profileId},${target.revision},'PROMOTE',${reason})`;
   if(!row)throw new PromotionError('unconfirmed_result');
   return {role:String(row.role),accessStatus:String(row.access_status),revision:Number(row.revision),authUserId:String(row.auth_user_id)};
  },
  async revokeSession(p){await sql`select app.revoke_application_session(${p.authUserId},${p.providerSessionId},${p.digest})`;}
 };
 return {store,close:()=>sql.end({timeout:5})};
}
