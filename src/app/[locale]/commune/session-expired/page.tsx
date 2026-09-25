import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
import {Link} from '@/shared/i18n/navigation';
export default async function Page({params}:{params:Promise<{locale:CommuneLocale}>}){const c=communeCopy[(await params).locale];return <section className="commune-state"><h1>{c.expired}</h1><p>{c.expiredHelp}</p><Link className="btn" href="/commune/login">{c.login}</Link></section>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].expired};}
