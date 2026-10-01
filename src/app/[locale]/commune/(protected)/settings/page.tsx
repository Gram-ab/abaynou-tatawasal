import {requireAdmin} from '@/server/auth/application-user';
import {Link} from '@/shared/i18n/navigation';
import {FileText,Scales,Gear,LockKey} from '@phosphor-icons/react/dist/ssr';
import {communeCopy} from '@/features/commune-auth/copy';
import {contentAdminCopy} from '@/features/content-admin/copy';
import type {ContentAdminLocale} from '@/features/content-admin/model';
export default async function Page({params}:{params:Promise<{locale:ContentAdminLocale}>}){const {locale}=await params;await requireAdmin(locale);const c=contentAdminCopy[locale],account=communeCopy[locale];return <section className="settings-home"><span className="eyebrow">{c.nav}</span><h1>{c.title}</h1><p>{c.intro}</p><div className="settings-cards"><Link href="/commune/settings/pages"><FileText size={28}/><span><strong>{c.pages}</strong><small>{c.pagesIntro}</small></span></Link><Link href="/commune/settings/pages?group=legal"><Scales size={28}/><span><strong>{c.legal}</strong><small>{c.legalIntro}</small></span></Link><Link href="/commune/settings/commune"><Gear size={28}/><span><strong>{c.commune}</strong><small>{c.communeIntro}</small></span></Link><Link href="/commune/account/password"><LockKey size={28}/><span><strong>{account.change}</strong><small>{account.policy}</small></span></Link></div></section>;}
