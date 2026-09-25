import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {cookies} from 'next/headers';
import {openData} from '@/server/auth/sealed-intent';
import {StaffAuthScreen} from '@/features/commune-auth/auth-screen';
import type {CommuneLocale} from '@/features/commune-auth/copy';
export default async function Page({params,searchParams}:{params:Promise<{locale:CommuneLocale}>;searchParams:Promise<{step?:string}>}){const {locale}=await params,q=await searchParams,store=await cookies(),marker=openData<{expires:number;audience:string}>(store.get(q.step==='confirm'?'abaynou_staff_intent':'abaynou_staff_recovery')?.value);return <StaffAuthScreen locale={locale} kind={q.step==='confirm'?'confirm':'reset'} invalid={q.step==='invalid'||marker?.audience!=='COMMUNE'}/>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].reset};}
