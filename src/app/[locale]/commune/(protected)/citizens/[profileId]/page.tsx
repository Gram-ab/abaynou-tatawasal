import {randomUUID} from 'node:crypto';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/server/auth/application-user';
import {readCitizen,citizenStatusHistory} from '@/server/citizen-admin/repository';
import {CitizenStatusForm} from '@/features/citizen-admin/components';
import {citizenAdminCopy} from '@/features/citizen-admin/copy';
import {Link} from '@/shared/i18n/navigation';
type Locale='ar'|'fr'|'en';
export default async function Page({params}:{params:Promise<{locale:Locale;profileId:string}>}){
 const {locale,profileId}=await params,actor=await requireAdmin(locale),c=citizenAdminCopy[locale];
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId))notFound();
 const citizen=await readCitizen(actor,profileId);if(!citizen)notFound();
 const history=await citizenStatusHistory(actor,profileId);
 return <section className="citizen-admin"><Link href="/commune/citizens">{c.back}</Link><h1>{citizen.fullName}</h1><div className="commune-card"><dl className="commune-details"><dt>{c.email}</dt><dd><bdi dir="ltr">{citizen.email}</bdi></dd><dt>{c.phone}</dt><dd>{citizen.phone??'—'}</dd><dt>{c.language}</dt><dd>{citizen.language}</dd><dt>{c.status}</dt><dd>{citizen.status==='ACTIVE'?c.active:c.disabled}</dd><dt>{c.created}</dt><dd><time dateTime={citizen.createdAt.toISOString()}>{new Intl.DateTimeFormat(locale).format(citizen.createdAt)}</time></dd><dt>{c.revision}</dt><dd>{citizen.revision}</dd></dl></div>
  <CitizenStatusForm profileId={citizen.profileId} revision={citizen.revision} status={citizen.status} name={citizen.fullName} email={citizen.email} commandKey={randomUUID()}/>
  <div className="commune-card"><h2>{c.history}</h2>{history.map((event,index)=><p key={`${event.occurredAt.toISOString()}-${index}`}><strong>{event.action==='ACCOUNT_DISABLED'?c.disabled:c.active}</strong> · <time dateTime={event.occurredAt.toISOString()}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(event.occurredAt)}</time> — {event.reason}</p>)}</div>
 </section>;
}
