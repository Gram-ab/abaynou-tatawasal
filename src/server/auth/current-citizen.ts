import 'server-only';
import {headers} from 'next/headers';
import {verifiedProviderIdentity} from './provider';
import {digestSessionSecret,readSessionSecret} from '@/server/sessions/cookie';
import {resolveApplicationSession} from '@/server/identity/repository';

export type CitizenContext={state:string;authUserId:string;email:string;providerSessionId:string;sessionId:string;profileId:string;fullName:string;phone:string|null;language:'ar'|'fr'|'en';revision:number;absoluteExpiresAt:string;secret:string;digest:Buffer};
export async function currentCitizen(requestActivity=false):Promise<CitizenContext|null>{
 const secret=await readSessionSecret();if(!secret)return null;
 const identity=await verifiedProviderIdentity();if(!identity)return null;
 const h=await headers();const meaningful=requestActivity&&h.get('purpose')!=='prefetch'&&h.get('next-router-prefetch')!=='1';
 const digest=digestSessionSecret(secret);const row=await resolveApplicationSession(identity.authUserId,identity.providerSessionId,digest,meaningful);if(!row)return null;
 return {state:row.state,authUserId:identity.authUserId,email:identity.email,providerSessionId:identity.providerSessionId,sessionId:row.session_id,profileId:row.profile_id,fullName:row.full_name,phone:row.contact_phone,language:row.preferred_language,revision:Number(row.profile_revision),absoluteExpiresAt:row.absolute_expires_at,secret,digest};
}
