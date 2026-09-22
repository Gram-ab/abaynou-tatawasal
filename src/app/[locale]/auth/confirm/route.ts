import {NextRequest,NextResponse} from 'next/server';
import {sealIntent} from '@/server/auth/sealed-intent';
import {appOrigin} from '@/server/auth/provider';
const locales=['ar','fr','en'] as const,types=['signup','recovery','email_change'] as const;
export async function GET(request:NextRequest,{params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;const token=request.nextUrl.searchParams.get('token_hash')??'';const type=request.nextUrl.searchParams.get('type')??'';
 const validLocale=locales.includes(locale as typeof locales[number]);const validType=types.includes(type as typeof types[number]);const validToken=/^[A-Za-z0-9_-]{16,512}$/.test(token);
 const target=new URL(`/${validLocale?locale:'ar'}/verify-email`,appOrigin());target.searchParams.set('action',validLocale&&validType&&validToken?'confirm':'invalid');
 const response=NextResponse.redirect(target);response.headers.set('Referrer-Policy','no-referrer');
 if(validLocale&&validType&&validToken)response.cookies.set('abaynou_auth_intent',sealIntent({tokenHash:token,type:type as typeof types[number],locale:locale as typeof locales[number],expires:Date.now()+15*60_000}),{httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:900});
 return response;
}
