import 'server-only';
import type {ApplicationUser} from '@/server/auth/application-user';
import {publicDatabase} from '@/shared/db/public';

export async function promoteAgentAuthority(actor:ApplicationUser,input:{id:string;email:string;revision:number;reason:string}){
 if(actor.state!=='VALID'||actor.role!=='ADMIN'||actor.profileId===input.id)throw Object.assign(new Error('Administrator required'),{code:'42501'});
 return publicDatabase().begin(async sql=>{
  const [target]=await sql`select * from app.read_staff_account(${actor.authUserId},${actor.providerSessionId},${actor.digest},${input.id})`;
  if(!target||Number(target.revision)!==input.revision||String(target.email).toLowerCase()!==input.email)throw Object.assign(new Error('Staff account changed'),{code:'40001'});
  const [activation]=await sql`select * from app.read_staff_activation_states(${actor.authUserId},${actor.providerSessionId},${actor.digest},ARRAY[${input.id}]::uuid[])`;
  if(target.role!=='AGENT'||target.access_status!=='ACTIVE'||!target.email_confirmed_at||!activation||activation.activation_pending!==false)throw Object.assign(new Error('Activated active Agent required'),{code:'23514'});
  // The existing command locks the target, checks revision/authority again,
  // revokes target sessions and writes the reason to the audit log atomically.
  const [result]=await sql`select * from app.manage_staff_authority(${actor.authUserId},${actor.providerSessionId},${actor.digest},${input.id},${input.revision},${'PROMOTE'},${input.reason})`;
  if(!result||result.role!=='ADMIN'||result.access_status!=='ACTIVE'||Number(result.revision)!==input.revision+1)throw new Error('Promotion result unavailable');
 });
}
