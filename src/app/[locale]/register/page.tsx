import {AuthPage} from '@/features/public-content/components/auth-page';
import {readSignupLegal} from '@/server/identity/repository';
import {localeSchema} from '@/features/auth/model';
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;const parsed=localeSchema.safeParse(locale);const legal=parsed.success?await readSignupLegal(parsed.data):null;return <AuthPage mode="register" legal={legal?{termsVersionId:legal.terms_version_id,privacyVersionId:legal.privacy_version_id}:null}/>;}

import {getTranslations} from 'next-intl/server';
export async function generateMetadata(){const t=await getTranslations();return {title:t('createAccount')+' | '+t('brand'),robots:{index:false,follow:false}};}
