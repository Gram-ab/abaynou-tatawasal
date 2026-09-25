import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {StaffAuthScreen} from '@/features/commune-auth/auth-screen';
import type {CommuneLocale} from '@/features/commune-auth/copy';
import {redirectAuthenticatedUser} from '@/server/auth/application-user';
export default async function Page({params,searchParams}:{params:Promise<{locale:CommuneLocale}>;searchParams:Promise<{returnTo?:string}>}){const {locale}=await params;await redirectAuthenticatedUser(locale);const q=await searchParams;return <StaffAuthScreen locale={locale} kind="login" returnTo={q.returnTo}/>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].login};}
