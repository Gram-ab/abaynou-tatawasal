import {NextResponse} from 'next/server';
import {currentApplicationUser} from '@/server/auth/application-user';
import {appOrigin,providerClient} from '@/server/auth/provider';
import {clearSessionSecret} from '@/server/sessions/cookie';
export async function GET(_request:Request,{params}:{params:Promise<{locale:string}>}){
 const {locale}=await params,lang=['ar','fr','en'].includes(locale)?locale:'ar',user=await currentApplicationUser();
 if(user?.state==='VALID')return NextResponse.redirect(new URL(`/${lang}/${user.role==='CITIZEN'?'citizen':'commune'}`,appOrigin()));
 const disabled=user?.state==='DISABLED';const client=await providerClient();await client.auth.signOut({scope:'local'});await clearSessionSecret();
 const response=NextResponse.redirect(new URL(`/${lang}/commune/${disabled?'account-disabled':'session-expired'}`,appOrigin()));response.headers.set('Cache-Control','no-store');return response;
}
