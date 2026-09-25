import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
import {Link} from '@/shared/i18n/navigation';
export default async function Page({params}:{params:Promise<{locale:CommuneLocale}>}){const c=communeCopy[(await params).locale];return <section className="commune-state"><h1>{c.denied}</h1><p>{c.deniedHelp}</p><Link className="btn" href="/commune/login">{c.login}</Link><Link href="/citizen">{c.citizen}</Link></section>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].denied};}
