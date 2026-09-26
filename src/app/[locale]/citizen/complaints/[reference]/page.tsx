import {notFound} from 'next/navigation';
import {requireCitizen} from '@/server/auth/application-user';
import {ownComplaint} from '@/server/complaints/repository';
import {referencePattern} from '@/features/complaints/model';
import {complaintCopy} from '@/features/complaints/copy';
import {ComplaintFacts} from '@/features/complaints/components/detail';
import {Link} from '@/shared/i18n/navigation';
export const metadata={title:'Complaint',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:'ar'|'fr'|'en';reference:string}>}){
 const {locale,reference}=await params,actor=await requireCitizen(locale,true);
 if(!referencePattern.test(reference))notFound();
 const complaint=await ownComplaint(actor,reference);if(!complaint)notFound();
 const c=complaintCopy[locale],instant=new Date(complaint.submitted_at);
 return <section className="complaint-page"><span className="eyebrow">{c.detail}</span><h1>{c.success}</h1><p>{c.successText}</p><div className="complaint-panel"><p>{c.reference}: <bdi dir="ltr" className="complaint-reference">{complaint.reference}</bdi></p><span className="complaint-status">{c.received}</span><ComplaintFacts locale={locale} values={complaint}/><p>{c.submitted}: <time dateTime={instant.toISOString()}>{new Intl.DateTimeFormat(locale,{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Casablanca'}).format(instant)}</time></p></div><Link href="/citizen" className="btn ghost">{c.home}</Link></section>;
}
