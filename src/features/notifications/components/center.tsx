import {Bell,CheckCircle} from '@phosphor-icons/react/dist/ssr';
import {notificationCopy} from '../copy';
import type {NotificationItem} from '../model';
import {markAllNotificationsReadAction,openNotificationAction} from '../actions';
import {Link} from '@/shared/i18n/navigation';

export function NotificationCenter({locale,items,unread,error=false}:{locale:'ar'|'fr'|'en';items:NotificationItem[];unread:number;error?:boolean}){
 const copy=notificationCopy[locale];
 if(error)return <section className="notification-page"><h1>{copy.title}</h1><div className="notification-empty" role="alert"><p>{copy.error}</p><Link className="btn ghost" href="/citizen/notifications">{copy.retry}</Link></div></section>;
 return <section className="notification-page"><div className="notification-title"><div><span className="eyebrow">{copy.bell}</span><h1>{copy.title}</h1></div>{unread>0&&<form action={markAllNotificationsReadAction}><input type="hidden" name="locale" value={locale}/><button className="notification-mark-all" type="submit"><CheckCircle size={19} aria-hidden="true"/>{copy.markAll}</button></form>}</div>
  {items.length===0?<div className="notification-empty"><Bell size={32} aria-hidden="true"/><p>{copy.empty}</p></div>:<ul className="notification-list">{items.map(item=><li key={item.id} className={item.readAt?'is-read':'is-unread'}><form action={openNotificationAction}><input type="hidden" name="locale" value={locale}/><input type="hidden" name="notification" value={item.id}/><button type="submit" className="notification-item"><span className="notification-dot" aria-hidden="true"/><span className="notification-copy"><strong>{copy.received}</strong><span>{copy.receivedText}</span><span className="notification-meta"><bdi dir="ltr">{item.reference}</bdi> · <time dateTime={item.createdAt.toISOString()}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Casablanca'}).format(item.createdAt)}</time></span></span><span className="notification-state">{item.readAt?copy.read:copy.new}</span><span className="notification-open">{copy.open}</span></button></form></li>)}</ul>}
  {items.length===20&&<Link className="notification-more" href={`/citizen/notifications?before=${items.at(-1)!.recipientSequence}`}>{copy.more}</Link>}
 </section>;
}
