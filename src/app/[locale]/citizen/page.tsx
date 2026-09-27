import {getLocale} from 'next-intl/server';
import {Link} from '@/shared/i18n/navigation';
import {requireCitizen} from '@/server/auth/application-user';
import {listOwnComplaints} from '@/server/complaints/repository';
import {ComplaintList} from '@/features/complaints/components/tracking';
import {complaintCopy} from '@/features/complaints/copy';
import {trackingCopy} from '@/features/complaints/tracking-copy';
const copy={ar:{eyebrow:'فضاء المواطن',hello:'مرحباً',lead:'تابع شكاياتك أو أرسل شكاية جديدة.',recent:'أحدث الشكايات'},fr:{eyebrow:'Espace citoyen',hello:'Bonjour',lead:'Suivez vos réclamations ou déposez-en une nouvelle.',recent:'Réclamations récentes'},en:{eyebrow:'Citizen space',hello:'Welcome',lead:'Track your complaints or submit a new one.',recent:'Recent complaints'}};
export default async function Page(){const locale=await getLocale() as keyof typeof copy,c=copy[locale],citizen=await requireCitizen(locale,true),items=await listOwnComplaints(citizen,{},5),t=trackingCopy[locale];return <section className="citizen-landing container section"><span className="eyebrow">{c.eyebrow}</span><h1>{c.hello} {citizen.fullName}</h1><p>{c.lead}</p><div className="dashboard-actions"><Link className="btn" href="/citizen/complaints/new">{complaintCopy[locale].new}</Link><Link className="btn ghost" href="/citizen/complaints">{t.title}</Link></div><div className="dashboard-recent"><h2>{c.recent}</h2>{items.length?<ComplaintList locale={locale} items={items}/>:<p className="tracking-empty">{t.empty}</p>}</div></section>;}
