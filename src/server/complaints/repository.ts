import 'server-only';
import {publicDatabase} from '@/shared/db/public';
import type {ApplicationUser} from '@/server/auth/application-user';
import {canonicalComplaint,type ComplaintCommand,type Labels} from '@/features/complaints/model';
import {complaintFingerprint} from './fingerprint';
export type ComplaintDetail={reference:string;category_labels:Labels;location_labels:Labels;subject:string;description:string;location_clarification:string|null;status:'SUBMITTED';submitted_at:Date};
export async function submitComplaint(actor:ApplicationUser,input:ComplaintCommand){
 const sql=publicDatabase(),fields=canonicalComplaint(input),fingerprint=complaintFingerprint(input);
 const [result]=await sql`select * from app.submit_complaint(${actor.authUserId},${actor.providerSessionId},${actor.digest},${input.commandKey},${fingerprint},${fields.categoryId},${fields.locationId},${fields.subject},${fields.description},${fields.locationClarification},${input.confirmed})`;
 if(!result)throw new Error('Submission unconfirmed');
 return {reference:result.reference as string,replayed:Boolean(result.replayed)};
}
export async function ownComplaint(actor:ApplicationUser,reference:string):Promise<ComplaintDetail|null>{
 const [row]=await publicDatabase()`select * from app.read_own_complaint(${actor.authUserId},${actor.providerSessionId},${actor.digest},${reference})`;
 return row as ComplaintDetail??null;
}
export async function recoverComplaint(actor:ApplicationUser,key:string):Promise<string|null>{
 const [row]=await publicDatabase()`select * from app.recover_complaint_command(${actor.authUserId},${actor.providerSessionId},${actor.digest},${key})`;
 return row?.reference??null;
}
