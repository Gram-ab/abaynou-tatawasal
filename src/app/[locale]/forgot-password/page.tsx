import {AuthPage} from '@/features/public-content/components/auth-page';
export default function Page(){return <AuthPage mode="recovery"/>;}

import {getLocale,getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations(),l=await getLocale();return {title:({ar:'استعادة كلمة المرور',fr:'Récupérer le mot de passe',en:'Recover your password'}[l as 'ar'|'fr'|'en'])+' | '+t('brand'),robots:{index:false,follow:false}};}
