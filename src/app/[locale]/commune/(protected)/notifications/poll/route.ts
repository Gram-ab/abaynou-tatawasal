import {NextResponse} from 'next/server';
import {currentApplicationUser} from '@/server/auth/application-user';
import {notificationSummary} from '@/server/notifications/repository';
export const dynamic='force-dynamic';
export async function GET(){const actor=await currentApplicationUser(false);if(!actor||actor.state!=='VALID'||actor.role==='CITIZEN')return NextResponse.json({error:'unauthorized'},{status:401});try{return NextResponse.json(await notificationSummary(actor),{headers:{'cache-control':'no-store'}});}catch{return NextResponse.json({error:'unavailable'},{status:503});}}
