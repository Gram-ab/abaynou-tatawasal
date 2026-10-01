import {requireAdmin} from '@/server/auth/application-user';
import {listCitizens} from '@/server/citizen-admin/repository';
import {citizenAdminCopy} from '@/features/citizen-admin/copy';
import {Link} from '@/shared/i18n/navigation';
type Locale='ar'|'fr'|'en';
export default async function Page({params,searchParams}:{params:Promise<{locale:Locale}>;searchParams:Promise<{q?:string;status?:string;page?:string}>}){
 const {locale}=await params,query=await searchParams,actor=await requireAdmin(locale),c=citizenAdminCopy[locale];
 const q=String(query.q??'').slice(0,160),status=query.status==='ACTIVE'||query.status==='DISABLED'?query.status:null,page=Math.min(10000,Math.max(1,Number(query.page)||1));
 const {items,total}=await listCitizens(actor,{query:q,status,page}),pages=Math.ceil(total/20);
 const href=(n:number)=>`/commune/citizens?${new URLSearchParams({q,status:status??'',page:String(n)})}`;
 return <section className="citizen-admin"><h1>{c.title}</h1><form method="get" className="commune-card citizen-admin-filters"><label className="commune-field">{c.search}<input name="q" defaultValue={q} maxLength={160}/></label><label className="commune-field">{c.status}<select name="status" defaultValue={status??''}><option value="">{c.all}</option><option value="ACTIVE">{c.active}</option><option value="DISABLED">{c.disabled}</option></select></label><button className="btn">{c.filter}</button></form>
  {items.length?<div className="tracking-table-wrap"><table className="tracking-table citizen-admin-table"><caption className="sr-only">{c.title}</caption><thead><tr><th scope="col">{c.name}</th><th scope="col">{c.email}</th><th scope="col">{c.status}</th><th scope="col">{c.created}</th><th scope="col"><span className="sr-only">{c.details}</span></th></tr></thead><tbody>{items.map(item=><tr key={item.profileId}><td data-label={c.name}>{item.fullName}</td><td data-label={c.email}><bdi dir="ltr">{item.email}</bdi></td><td data-label={c.status}>{item.status==='ACTIVE'?c.active:c.disabled}</td><td data-label={c.created}><time dateTime={item.createdAt.toISOString()}>{new Intl.DateTimeFormat(locale).format(item.createdAt)}</time></td><td><Link href={`/commune/citizens/${item.profileId}`}>{c.details}</Link></td></tr>)}</tbody></table></div>:<p className="commune-card">{c.empty}</p>}
  <nav className="citizen-admin-pages" aria-label={c.title}>{page>1&&<Link href={href(page-1)}>{c.previous}</Link>}<span>{page}{pages?` / ${pages}`:''}</span>{page<pages&&<Link href={href(page+1)}>{c.next}</Link>}</nav>
 </section>;
}
