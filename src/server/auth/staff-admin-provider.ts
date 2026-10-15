import 'server-only';
import {createClient,type User} from '@supabase/supabase-js';
import {staffAdminConfiguration} from './provider';
import {publicDatabase} from '@/shared/db/public';
import type {ApplicationUser} from './application-user';
function client(){const {url,key}=staffAdminConfiguration();return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export async function inviteStaff(email:string,redirectTo:string,language:string){return client().auth.admin.inviteUserByEmail(email,{redirectTo,data:{abaynou_staff_invitation:true,staff_activation_pending:true,preferred_language:language}});}
export async function findStaffByEmail(actor:ApplicationUser,email:string):Promise<User|null>{
 const [row]=await publicDatabase()`select * from app.find_auth_user_for_staff_admin(${actor.authUserId},${actor.providerSessionId},${actor.digest},${email})`;
 if(!row)return null;
 const result=await client().auth.admin.getUserById(String(row.auth_user_id));
 if(result.error)throw new Error('Staff provider account unavailable');
 return result.data.user;
}
export async function findInvitedStaff(actor:ApplicationUser,email:string):Promise<User|null>{
 const user=await findStaffByEmail(actor,email);
 return user?.user_metadata?.abaynou_staff_invitation===true?user:null;
}
export async function removeInterruptedInvitation(id:string){return client().auth.admin.deleteUser(id);}
export async function setProviderEnabled(id:string,enabled:boolean){return client().auth.admin.updateUserById(id,{ban_duration:enabled?'none':'876000h'});}
export async function correctProviderInvitation(id:string,email:string){return client().auth.admin.updateUserById(id,{email,email_confirm:false});}
export async function staffActivationStates(actor:ApplicationUser,profiles:string[]){
 if(!profiles.length)return new Map<string,boolean>();
 const sql=publicDatabase(),rows=await sql`select * from app.read_staff_activation_states(${actor.authUserId},${actor.providerSessionId},${actor.digest},${sql.array(profiles) }::uuid[])`;
 return new Map<string,boolean>(rows.map(row=>[String(row.profile_id),row.activation_pending===true]));
}
