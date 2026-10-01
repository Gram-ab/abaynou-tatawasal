import 'server-only';
import {publicDatabase} from '@/shared/db/public';
import type {ApplicationUser} from '@/server/auth/application-user';

export type CitizenAccount={profileId:string;fullName:string;email:string;status:'ACTIVE'|'DISABLED';createdAt:Date};
export type CitizenDetail=CitizenAccount&{phone:string|null;language:'ar'|'fr'|'en';revision:number;securityEpoch:number};
export type CitizenStatusEvent={action:'ACCOUNT_DISABLED'|'ACCOUNT_ENABLED';reason:string;occurredAt:Date;revision:number;securityEpoch:number};
const credentials=(actor:ApplicationUser)=>[actor.authUserId,actor.providerSessionId,actor.digest] as const;
export async function listCitizens(actor:ApplicationUser,input:{query:string;status:string|null;page:number}){
 const [auth,provider,digest]=credentials(actor);
 const rows=await publicDatabase()`select * from app.list_citizen_accounts(${auth},${provider},${digest},${input.query},${input.status},${input.page})`;
 return {items:rows.map(row=>({profileId:String(row.profile_id),fullName:String(row.full_name),email:String(row.email),status:row.access_status as 'ACTIVE'|'DISABLED',createdAt:new Date(row.created_at as string)})),total:rows[0]?Number(rows[0].total_count):0};
}
export async function readCitizen(actor:ApplicationUser,id:string):Promise<(CitizenDetail&{authUserId:string})|null>{
 const [auth,provider,digest]=credentials(actor);
 const [row]=await publicDatabase()`select * from app.read_citizen_admin_account(${auth},${provider},${digest},${id})`;
 if(!row)return null;
 return {profileId:String(row.profile_id),authUserId:String(row.auth_user_id),fullName:String(row.full_name),email:String(row.email),phone:row.contact_phone as string|null,language:row.preferred_language as CitizenDetail['language'],status:row.access_status as CitizenDetail['status'],revision:Number(row.revision),securityEpoch:Number(row.security_epoch),createdAt:new Date(row.created_at as string)};
}
export async function citizenStatusHistory(actor:ApplicationUser,id:string):Promise<CitizenStatusEvent[]>{
 const [auth,provider,digest]=credentials(actor);
 const rows=await publicDatabase()`select * from app.read_citizen_status_audit(${auth},${provider},${digest},${id})`;
 return rows.map(row=>({action:row.action as CitizenStatusEvent['action'],reason:String(row.reason),occurredAt:new Date(row.occurred_at as string),revision:Number((row.change_summary as {revision:number}).revision),securityEpoch:Number((row.change_summary as {security_epoch:number}).security_epoch)}));
}
export async function setCitizenStatus(actor:ApplicationUser,input:{id:string;revision:number;status:'ACTIVE'|'DISABLED';reason:string;key:string;fingerprint:Buffer}){
 const [auth,provider,digest]=credentials(actor);
 const [row]=await publicDatabase()`select * from app.set_citizen_access(${auth},${provider},${digest},${input.id},${input.revision},${input.status},${input.reason},${input.key},${input.fingerprint})`;
 return {authUserId:String(row.auth_user_id),status:row.access_status as 'ACTIVE'|'DISABLED',revision:Number(row.revision),replayed:Boolean(row.replayed)};
}
