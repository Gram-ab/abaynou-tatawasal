import {AuthPage} from '@/features/public-content/components/auth-page';
import {redirectAuthenticatedUser} from '@/server/auth/application-user';
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{state?:string;returnTo?:string}>}){const {locale}=await params,query=await searchParams;await redirectAuthenticatedUser(locale,query.returnTo);return <AuthPage mode="login" state={query.state==='password-reset'?'passwordReset':undefined} returnTo={query.returnTo}/>;}

import {getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations();return {title:t('signIn')+' | '+t('brand'),robots:{index:false,follow:false}};}
