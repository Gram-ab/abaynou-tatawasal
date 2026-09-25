import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {requireCommuneStaff} from '@/server/auth/application-user';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
import {Link} from '@/shared/i18n/navigation';
export default async function Page({params}:{params:Promise<{locale:CommuneLocale}>}){const {locale}=await params,user=await requireCommuneStaff(locale,true),c=communeCopy[locale];return <section><span className="eyebrow">{c.brand}</span><h1>{c.welcome} {user.fullName}</h1><div className="commune-card"><p>{c.ready}</p><Link className="btn" href="/commune/account">{c.account}</Link><p>{c.future}</p></div></section>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].home};}
