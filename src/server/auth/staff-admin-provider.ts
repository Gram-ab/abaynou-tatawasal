import 'server-only';import {createClient,type User} from '@supabase/supabase-js';import {staffAdminConfiguration} from './provider';
function client(){const {url,key}=staffAdminConfiguration();return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export async function inviteStaff(email:string,redirectTo:string,language:string){return client().auth.admin.inviteUserByEmail(email,{redirectTo,data:{abaynou_staff_invitation:true,staff_activation_pending:true,preferred_language:language}});}
export async function findInvitedStaff(email:string):Promise<User|null>{const result=await client().auth.admin.listUsers({page:1,perPage:1000});return result.data.users.find(user=>user.email?.toLowerCase()===email.toLowerCase()&&user.user_metadata?.abaynou_staff_invitation===true)??null;}
export async function findStaffByEmail(email:string):Promise<User|null>{const result=await client().auth.admin.listUsers({page:1,perPage:1000});return result.data.users.find(user=>user.email?.toLowerCase()===email.toLowerCase())??null;}
export async function removeInterruptedInvitation(id:string){return client().auth.admin.deleteUser(id);}
export async function setProviderEnabled(id:string,enabled:boolean){return client().auth.admin.updateUserById(id,{ban_duration:enabled?'none':'876000h'});}
export async function correctProviderInvitation(id:string,email:string){return client().auth.admin.updateUserById(id,{email,email_confirm:false});}

// Presentation only: application authorization still comes from the guarded database session.
export async function pendingStaffActivationEmails(){
 const pending=new Set<string>();
 const admin=client();
 for(let page=1;;page++){
  const result=await admin.auth.admin.listUsers({page,perPage:1000});
  if(result.error)throw new Error('Staff activation state unavailable');
  for(const user of result.data.users){
   if(user.email&&user.user_metadata?.staff_activation_pending===true)pending.add(user.email.toLowerCase());
  }
  if(result.data.users.length<1000)return pending;
 }
}
