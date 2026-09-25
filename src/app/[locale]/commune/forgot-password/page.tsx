import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {StaffAuthScreen} from '@/features/commune-auth/auth-screen';
import type {CommuneLocale} from '@/features/commune-auth/copy';
export default async function Page({params}:{params:Promise<{locale:CommuneLocale}>}){return <StaffAuthScreen locale={(await params).locale} kind="recovery"/>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].recovery};}
