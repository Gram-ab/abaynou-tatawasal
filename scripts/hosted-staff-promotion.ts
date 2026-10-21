import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {staffPassword} from '../src/features/commune-auth/model';

export type SessionProof={authUserId:string;providerSessionId:string;digest:Buffer};
export type Identity={profileId:string;role:string;accessStatus:string};
export type PromotionTarget={profileId:string;authUserId:string;email:string;fullName:string;role:string;accessStatus:string;revision:number;confirmed:boolean;activationPending:boolean};
export type PromotionResult={role:string;accessStatus:string;revision:number;authUserId:string};
export interface PromotionStore {
 identity(authUserId:string):Promise<Identity|null>;
 createSession(proof:SessionProof):Promise<boolean>;
 target(proof:SessionProof,email:string):Promise<PromotionTarget|null>;
 promote(proof:SessionProof,target:PromotionTarget,reason:string):Promise<PromotionResult>;
 revokeSession(proof:SessionProof):Promise<void>;
}
export interface PromotionProvider {
 authenticate(email:string,password:string):Promise<{authUserId:string;providerSessionId:string;confirmed:boolean}>;
 signOutLocal():Promise<void>;
}
export type PromotionErrorCode='invalid_input'|'authentication'|'admin_required'|'target_ineligible'|'expired'|'conflict'|'unconfirmed_result'|'operation_failed'|'cleanup_failed'|'promoted_cleanup_failed';
export class PromotionError extends Error {
 constructor(public readonly code:PromotionErrorCode){super(code);this.name='PromotionError';}
}
const email=z.string().trim().max(254).email().transform(value=>value.toLowerCase());
const inputSchema=z.object({adminEmail:email,targetEmail:email,password:staffPassword,reason:z.string().trim().refine(value=>Array.from(value).length>=3&&Array.from(value).length<=1000)}).refine(value=>value.adminEmail!==value.targetEmail);
const freshWindow=5*60_000;
function eligible(target:PromotionTarget|null,email:string):asserts target is PromotionTarget {
 if(!target||target.email.toLowerCase()!==email||target.role!=='AGENT'||target.accessStatus!=='ACTIVE'||!target.confirmed||target.activationPending||!Number.isSafeInteger(target.revision)||target.revision<1)throw new PromotionError('target_ineligible');
}
function sameTarget(before:PromotionTarget,after:PromotionTarget){return (Object.keys(before) as (keyof PromotionTarget)[]).every(key=>before[key]===after[key]);}
async function finishSessions(provider:PromotionProvider,store:PromotionStore,proof:SessionProof|undefined,attempted:boolean,committed:boolean){
 let failed=false;
 if(attempted&&proof){try{await store.revokeSession(proof);}catch{failed=true;}}
 try{await provider.signOutLocal();}catch{failed=true;}
 if(failed)throw new PromotionError(committed?'promoted_cleanup_failed':'cleanup_failed');
}
export async function promoteHostedStaff(input:unknown,dependencies:{provider:PromotionProvider;store:PromotionStore;confirm:(target:Readonly<PromotionTarget>,reason:string)=>Promise<boolean>;now?:()=>number}){
 const parsed=inputSchema.safeParse(input);
 if(!parsed.success)throw new PromotionError('invalid_input');
 const value=parsed.data,{provider,store,confirm}=dependencies,now=dependencies.now??Date.now;
 let proof:SessionProof|undefined,sessionAttempted=false,authenticatedAt=0,committed=false;
 try{
  const identity=await provider.authenticate(value.adminEmail,value.password);
  if(!identity.confirmed||!z.uuid().safeParse(identity.authUserId).success||!z.uuid().safeParse(identity.providerSessionId).success)throw new PromotionError('authentication');
  authenticatedAt=now();
  const actor=await store.identity(identity.authUserId);
  if(actor?.role!=='ADMIN'||actor.accessStatus!=='ACTIVE')throw new PromotionError('admin_required');
  proof={authUserId:identity.authUserId,providerSessionId:identity.providerSessionId,digest:createHash('sha256').update(randomBytes(32)).digest()};
  sessionAttempted=true;
  if(!await store.createSession(proof))throw new PromotionError('admin_required');
  const target=await store.target(proof,value.targetEmail);
  eligible(target,value.targetEmail);
  const approved=Object.freeze({...target});
  if(!await confirm(approved,value.reason))return {status:'cancelled' as const};
  if(now()-authenticatedAt>freshWindow)throw new PromotionError('expired');
  const latest=await store.target(proof,value.targetEmail);
  eligible(latest,value.targetEmail);
  if(!sameTarget(approved,latest))throw new PromotionError('conflict');
  if(now()-authenticatedAt>freshWindow)throw new PromotionError('expired');
  const result=await store.promote(proof,approved,value.reason);
  committed=true;
  if(result.role!=='ADMIN'||result.accessStatus!=='ACTIVE'||result.authUserId!==approved.authUserId||result.revision!==approved.revision+1)throw new PromotionError('unconfirmed_result');
  return {status:'promoted' as const,email:approved.email};
 }catch(error){
  if(error instanceof PromotionError)throw error;
  if(typeof error==='object'&&error&&'code' in error&&error.code==='40001')throw new PromotionError('conflict');
  throw new PromotionError('operation_failed');
 }finally{await finishSessions(provider,store,proof,sessionAttempted,committed);}
}
