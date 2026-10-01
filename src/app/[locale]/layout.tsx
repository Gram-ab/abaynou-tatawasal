import {NextIntlClientProvider,hasLocale} from 'next-intl';
import {getMessages,setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/shared/i18n/routing';
import {readSettings} from '@/features/public-content/repository';
import {CommuneNameProvider} from '@/shared/ui/commune-name';
import {Header} from '@/shared/ui/header';
import {Footer} from '@/shared/ui/footer';
import {currentApplicationUser} from '@/server/auth/application-user';
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);
 const messages=await getMessages(),settings=await readSettings(locale).catch(()=>null);
 const user=await currentApplicationUser(false).catch(()=>null);
 return <NextIntlClientProvider messages={messages}><CommuneNameProvider name={settings?.commune_name??null}><Header viewer={user?.state==='VALID'?{name:user.fullName,role:user.role}:null}/><main id="main" tabIndex={-1}>{children}</main><Footer showCommuneEntry={!(user?.state==='VALID'&&user.role==='CITIZEN')}/></CommuneNameProvider></NextIntlClientProvider>;
}
