import {communeCopy as metadataCopy} from '@/features/commune-auth/copy';
import {requireCommuneStaff} from '@/server/auth/application-user';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
import {StaffForm} from '@/features/commune-auth/forms';
import {Link} from '@/shared/i18n/navigation';
export default async function Page({params,searchParams}:{params:Promise<{locale:CommuneLocale}>;searchParams:Promise<{state?:string}>}){const {locale}=await params,user=await requireCommuneStaff(locale,true),c=communeCopy[locale],query=await searchParams;return <section><h1>{c.account}</h1><div className="commune-card">{query.state==='saved'&&<p className="form-result" role="status">{c.messages.saved}</p>}<dl className="commune-details"><dt>{c.name}</dt><dd>{user.fullName}</dd><dt>{c.email}</dt><dd dir="ltr">{user.email}</dd><dt>{c.role}</dt><dd>{user.role==='ADMIN'?c.admin:c.agent}</dd></dl><p>{c.readonly}</p><p><Link href="/commune/account/email">{c.changeEmail}</Link></p><StaffForm kind="language" language={user.language} revision={user.revision}/></div></section>;}

export async function generateMetadata({params}:{params:Promise<{locale:keyof typeof metadataCopy}>}){return {title:metadataCopy[(await params).locale].account};}
