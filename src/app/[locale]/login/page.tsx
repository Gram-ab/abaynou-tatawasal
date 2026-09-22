import {AuthPage} from '@/features/public-content/components/auth-page';
export default async function Page({searchParams}:{searchParams:Promise<{state?:string}>}){const query=await searchParams;return <AuthPage mode="login" state={query.state==='password-reset'?'passwordReset':undefined}/>;}

import {getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations();return {title:t('signIn')+' | '+t('brand'),robots:{index:false,follow:false}};}
