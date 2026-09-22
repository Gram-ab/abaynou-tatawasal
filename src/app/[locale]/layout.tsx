import {NextIntlClientProvider,hasLocale} from 'next-intl';
import {getMessages,setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/shared/i18n/routing';
import {Header} from '@/shared/ui/header';
import {Footer} from '@/shared/ui/footer';
import {currentCitizen} from '@/server/auth/current-citizen';
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);
 const messages=await getMessages();
 const citizen=await currentCitizen(false).catch(()=>null);
 return <NextIntlClientProvider messages={messages}><Header viewer={citizen?.state==='VALID'?{name:citizen.fullName}:null}/><main id="main" tabIndex={-1}>{children}</main><Footer/></NextIntlClientProvider>;
}
