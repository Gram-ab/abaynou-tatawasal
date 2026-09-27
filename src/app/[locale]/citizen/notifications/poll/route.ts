import {currentApplicationUser} from '@/server/auth/application-user';
import {notificationSummary} from '@/server/notifications/repository';
export const dynamic='force-dynamic';
export async function GET(){
 const actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return Response.json({error:'unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{return Response.json(await notificationSummary(actor),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
