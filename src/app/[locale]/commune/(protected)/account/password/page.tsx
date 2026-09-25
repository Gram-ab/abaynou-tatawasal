import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {requireCommuneStaff} from '@/server/auth/application-user';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
import {StaffForm} from '@/features/commune-auth/forms';
export default async function Page({params}:{params:Promise<{locale:CommuneLocale}>}){const {locale}=await params;await requireCommuneStaff(locale,true);return <section><h1>{communeCopy[locale].change}</h1><div className="commune-card"><StaffForm kind="change"/></div></section>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].change};}
