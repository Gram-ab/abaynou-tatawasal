import {NextRequest,NextResponse} from 'next/server';
import {sealData} from '@/server/auth/sealed-intent';
import {appOrigin} from '@/server/auth/provider';
export async function GET(request:NextRequest,{params}:{params:Promise<{locale:string}>}){
 const {locale}=await params;const lang=['ar','fr','en'].includes(locale)?locale:'ar';const token=request.nextUrl.searchParams.get('token_hash')??'';
 const valid=request.nextUrl.searchParams.get('type')==='recovery'&&/^[A-Za-z0-9_-]{16,512}$/.test(token);
 const response=NextResponse.redirect(new URL(`/${lang}/commune/reset-password?step=${valid?'confirm':'invalid'}`,appOrigin()));response.headers.set('Referrer-Policy','no-referrer');response.headers.set('Cache-Control','no-store');
 if(valid)response.cookies.set('abaynou_staff_intent',sealData({tokenHash:token,audience:'COMMUNE',expires:Date.now()+900_000}),{httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',maxAge:900});return response;
}
