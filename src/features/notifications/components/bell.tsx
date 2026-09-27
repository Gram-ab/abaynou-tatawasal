'use client';
import {useCallback,useEffect,useState} from 'react';
import {Bell} from '@phosphor-icons/react';
import {useLocale} from 'next-intl';
import {usePathname,useRouter,Link} from '@/shared/i18n/navigation';
import {notificationCopy} from '../copy';
import type {NotificationSummary} from '../model';

export function NotificationBell({initial,area='citizen',interval=300000}:{initial:NotificationSummary;area?:'citizen'|'commune';interval?:number}){
 const locale=useLocale() as keyof typeof notificationCopy,copy=notificationCopy[locale],pathname=usePathname(),router=useRouter();
 const [summary,setSummary]=useState(initial);
 const refresh=useCallback(async()=>{
  if(document.hidden||!navigator.onLine)return false;
  try{
   const response=await fetch(`/${locale}/${area}/notifications/poll`,{cache:'no-store',credentials:'same-origin',headers:{'x-abaynou-passive':'notification-poll'}});
   if(!response.ok){if(response.status===401)router.refresh();return false;}
   const next=await response.json() as NotificationSummary;
   setSummary(current=>{if(pathname===`/${area}/notifications`&&next.changeRevision!==current.changeRevision)queueMicrotask(()=>router.refresh());return next;});
   return true;
  }catch{return false;}
 },[locale,pathname,router,area]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>,cancelled=false,delay=interval;
  const schedule=()=>{timer=setTimeout(async()=>{const ok=await refresh();delay=ok?interval:Math.min(delay*2,1800000);if(!cancelled)schedule();},delay);};
  const focus=()=>{if(!document.hidden)void refresh();};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);window.addEventListener('online',focus);schedule();
  return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);window.removeEventListener('online',focus);};
 },[refresh,interval]);
 const label=summary.unreadCount?copy.unread(summary.unreadCount):copy.bell;
 return <Link href={`/${area}/notifications`} className="citizen-bell" aria-label={label} aria-current={pathname===`/${area}/notifications`?'page':undefined}>
  <Bell size={21} aria-hidden="true"/><span className="sr-only">{label}</span>{summary.unreadCount>0&&<span className="notification-badge" aria-hidden="true">{summary.unreadCount>99?'99+':summary.unreadCount}</span>}
 </Link>;
}
