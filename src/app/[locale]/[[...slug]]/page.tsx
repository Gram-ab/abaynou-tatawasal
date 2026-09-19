import {Suspense} from 'react';
import PublicLoading from '@/shared/ui/public-loading';
import type {PageKey} from '@/features/public-content/model';
import {notFound} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {keyForPath} from '@/features/public-content/model';
import {readPage,readSettings} from '@/features/public-content/repository';
import {PublicPageView} from '@/features/public-content/components/public-page';
import {State} from '@/shared/ui/primitives';
import {Link} from '@/shared/i18n/navigation';
export const dynamic='force-dynamic';
export default async function PublicRoute({params}:{params:Promise<{locale:string;slug?:string[]}>}){
 const {locale,slug}=await params;const key=keyForPath((slug??[]).join('/'));if(!key)notFound();
 return <Suspense fallback={<PublicLoading/>}><PublicContent locale={locale} pageKey={key}/></Suspense>;
}
async function PublicContent({locale,pageKey:key}:{locale:string;pageKey:PageKey}){
 const t=await getTranslations();
 const result=await Promise.all([
  readPage(key,locale),readSettings(locale).catch(()=>null),
  key==='HOME'?readPage('HOW_IT_WORKS',locale):null,key==='HOME'?readPage('SERVICE_SCOPE',locale):null
 ]).catch(()=>null);
 if(!result)return <State title={t('errorTitle')}><p>{t('error')}</p><Link href="/">{t('back')}</Link></State>;
 const [page,settings,processPage,scopePage]=result;
 if(!page)return <State title={t('missingTitle')}><p>{t('missing')}</p><Link href="/">{t('back')}</Link></State>;
 return <PublicPageView page={page} pageKey={key} settings={settings} processPage={processPage} scopePage={scopePage}/>;
}
export async function generateMetadata({params}:{params:Promise<{locale:string;slug?:string[]}>}){
 const {slug}=await params;const key=keyForPath((slug??[]).join('/'));const t=await getTranslations();
 return {title:`${key?t(`nav.${key}`):t('notFoundTitle')} | ${t('brand')}`,robots:{index:false,follow:false}};
}
