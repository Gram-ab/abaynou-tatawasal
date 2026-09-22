import 'server-only';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cache} from 'react';

function configuration(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Authentication configuration unavailable');
 if(process.env.APP_ENV==='local'&&!/^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/.test(url))throw new Error('Local Auth must use the local Supabase API');
 return {url,key};
}

export async function providerClient(){
 const {url,key}=configuration();const store=await cookies();
 return createServerClient(url,key,{
  auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'abaynou-provider'},
  cookieOptions:{path:'/',sameSite:'lax',secure:process.env.APP_ENV!=='local',httpOnly:true},
  cookies:{getAll:()=>store.getAll(),setAll(values){for(const {name,value,options} of values){try{store.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/'});}catch{/* Read-only Server Component; Route Handlers/Actions perform refresh writes. */}}}}
 });
}

export function isolatedProviderClient(){
 const {url,key}=configuration();
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

export type VerifiedProviderIdentity={authUserId:string;email:string;providerSessionId:string};
async function resolveVerifiedProviderIdentity(trustedClient:Awaited<ReturnType<typeof providerClient>>):Promise<VerifiedProviderIdentity|null>{
 const {data:claimData,error:claimError}=await trustedClient.auth.getClaims();if(claimError)return null;
 const {data:userData,error:userError}=await trustedClient.auth.getUser();
 const claims=claimData?.claims as Record<string,unknown>|undefined;
 const subject=typeof claims?.sub==='string'?claims.sub:null;
 const sessionId=typeof claims?.session_id==='string'?claims.session_id:null;
 const user=userData.user;
 if(userError||claimError||!user||!user.email||!user.email_confirmed_at||!subject||subject!==user.id||!sessionId)return null;
 return {authUserId:user.id,email:user.email,providerSessionId:sessionId};
}
const cachedVerifiedProviderIdentity=cache(async()=>resolveVerifiedProviderIdentity(await providerClient()));
export async function verifiedProviderIdentity(client?:Awaited<ReturnType<typeof providerClient>>):Promise<VerifiedProviderIdentity|null>{return client?resolveVerifiedProviderIdentity(client):cachedVerifiedProviderIdentity();}

export function appOrigin(){
 const value=process.env.APP_ORIGIN??(process.env.APP_ENV==='local'?'http://127.0.0.1:3000':'');
 if(!value)throw new Error('Application origin unavailable');const url=new URL(value);
 if(url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid application origin');
 return url.origin;
}
