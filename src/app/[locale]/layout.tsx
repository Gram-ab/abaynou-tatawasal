import {NextIntlClientProvider,hasLocale} from 'next-intl';
import {getMessages,setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/shared/i18n/routing';
import {Header} from '@/shared/ui/header';
import {Footer} from '@/shared/ui/footer';
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);
 const messages=await getMessages();
 return <NextIntlClientProvider messages={messages}><Header/><main id="main" tabIndex={-1}>{children}</main><Footer/></NextIntlClientProvider>;
}
