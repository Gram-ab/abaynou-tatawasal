import {AuthPage} from '@/features/public-content/components/auth-page';
export default function Page(){return <AuthPage mode="login"/>;}

import {getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations();return {title:t('signIn')+' | '+t('brand'),robots:{index:false,follow:false}};}
