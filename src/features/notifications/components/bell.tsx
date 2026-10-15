'use client';
import {useEffect,useState} from 'react';
import {Bell} from '@phosphor-icons/react';
import {useLocale} from 'next-intl';
import {usePathname,useRouter,Link} from '@/shared/i18n/navigation';
import {notificationCopy} from '../copy';
import type {NotificationSummary} from '../model';

export function NotificationBell({initial,area='citizen',interval=300000}:{initial:NotificationSummary;area?:'citizen'|'commune';interval?:number}){
 const locale=useLocale() as keyof typeof notificationCopy,copy=notificationCopy[locale],pathname=usePathname(),router=useRouter();
 const [summary,setSummary]=useState(initial);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>,cancelled=false,delay=interval,lastAttempt=-Infinity,lastResult=false,revision=initial.changeRevision;
  let inFlight:Promise<boolean>|undefined,controller:AbortController|undefined;
  const refresh=():Promise<boolean>=>{
   if(document.hidden||!navigator.onLine)return Promise.resolve(false);
   if(inFlight)return inFlight;
   if(Date.now()-lastAttempt<1000)return Promise.resolve(lastResult);
   lastAttempt=Date.now();controller=new AbortController();
   inFlight=(async()=>{
    try{
     const response=await fetch(`/${locale}/${area}/notifications/poll`,{cache:'no-store',credentials:'same-origin',signal:controller!.signal,headers:{'x-abaynou-passive':'notification-poll'}});
     if(cancelled)return false;
     if(!response.ok){if(response.status===401)router.refresh();return false;}
     const next=await response.json() as NotificationSummary;
     if(cancelled)return false;
     if(next.changeRevision>=revision){
      const changed=next.changeRevision!==revision;revision=next.changeRevision;
      setSummary(next);
      if(changed&&pathname===`/${area}/notifications`)router.refresh();
     }
     return true;
    }catch{return false;}
   })().then(ok=>{lastResult=ok;return ok;}).finally(()=>{inFlight=undefined;});
   return inFlight;
  };
  const schedule=()=>{timer=setTimeout(async()=>{const ok=await refresh();delay=ok?interval:Math.min(delay*2,1800000);if(!cancelled)schedule();},delay);};
  const focus=()=>{if(!document.hidden)void refresh();};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);window.addEventListener('online',focus);schedule();
  return()=>{cancelled=true;clearTimeout(timer);controller?.abort();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);window.removeEventListener('online',focus);};
 },[locale,pathname,router,area,interval,initial.changeRevision]);
 const label=summary.unreadCount?copy.unread(summary.unreadCount):copy.bell;
 return <Link href={`/${area}/notifications`} className="citizen-bell" aria-label={label} aria-current={pathname===`/${area}/notifications`?'page':undefined}>
  <Bell size={21} aria-hidden="true"/><span className="sr-only">{label}</span>{summary.unreadCount>0&&<span className="notification-badge" aria-hidden="true">{summary.unreadCount>99?'99+':summary.unreadCount}</span>}
 </Link>;
}
