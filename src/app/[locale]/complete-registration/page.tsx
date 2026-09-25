import {redirect} from 'next/navigation';
import {AuthPage} from '@/features/public-content/components/auth-page';
import {verifiedProviderIdentity} from '@/server/auth/provider';
import {provisioningState,readSignupLegal} from '@/server/identity/repository';
import {localeSchema} from '@/features/auth/model';
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;const parsed=localeSchema.safeParse(locale);if(!parsed.success)redirect('/ar/login');const identity=await verifiedProviderIdentity();if(!identity)redirect(`/${parsed.data}/login`);const state=await provisioningState(identity.authUserId);if(state?.state==='DENIED')redirect(`/${parsed.data}/commune/login`);if(state?.state==='COMPLETE')redirect(`/${parsed.data}/login`);if(state?.state==='DISABLED')redirect(`/${parsed.data}/account-disabled`);const legal=await readSignupLegal(parsed.data);return <AuthPage mode="complete" legal={legal?{termsVersionId:legal.terms_version_id,privacyVersionId:legal.privacy_version_id}:null}/>;}
