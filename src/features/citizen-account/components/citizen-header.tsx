'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {List,X,User,SignOut,CaretDown,Globe,House,Plus,Question,ClipboardText} from '@phosphor-icons/react';
import {useLocale} from 'next-intl';
import {complaintCopy} from '@/features/complaints/copy';
import {useMenuDismiss} from '@/shared/ui/use-menu-dismiss';
import {Brand,Languages} from '@/shared/ui/header';
import {Link,usePathname} from '@/shared/i18n/navigation';
import {logoutAction} from '@/features/auth/actions';
import {NotificationBell} from '@/features/notifications/components/bell';
import type {NotificationSummary} from '@/features/notifications/model';
const labels={ar:{space:'فضاء المواطن',complaints:'شكاياتي',account:'حسابي',help:'المساعدة',logout:'تسجيل الخروج',menu:'قائمة المواطن',language:'اللغة'},fr:{space:'Espace citoyen',complaints:'Mes réclamations',account:'Mon compte',help:'Aide',logout:'Déconnexion',menu:'Menu citoyen',language:'Langue'},en:{space:'Citizen space',complaints:'My complaints',account:'My account',help:'Help',logout:'Sign out',menu:'Citizen menu',language:'Language'}};
function HeaderDisclosure({label,children,className='',accessibleLabel}:{label:ReactNode;children:ReactNode;className?:string;accessibleLabel?:string}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  const resize=()=>setOpen(false);
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',resize);};
 },[open]);
 return <div ref={root} className={`citizen-disclosure ${className}`} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
  <button ref={trigger} type="button" className="citizen-disclosure-trigger" aria-label={accessibleLabel} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{label}<CaretDown size={14} aria-hidden="true"/></button>
  <div id={id} className="citizen-dropdown" hidden={!open} onClick={event=>{if((event.target as HTMLElement).closest('a'))setOpen(false);}}>{children}</div>
 </div>;
}
export function CitizenHeader({name,notifications={changeRevision:0,lastSequence:0,unreadCount:0}}:{name:string;notifications?:NotificationSummary}){
 const locale=useLocale() as keyof typeof labels,c=labels[locale],pathname=usePathname();
 const [open,setOpen]=useState(false),menuRoot=useMenuDismiss(open,()=>setOpen(false),1100);
 const links=<><Link href="/citizen" aria-current={pathname==='/citizen'?'page':undefined}><House size={19} aria-hidden="true"/>{c.space}</Link><Link href="/citizen/complaints" aria-current={pathname==='/citizen/complaints'||pathname.startsWith('/citizen/complaints/')&&pathname!=='/citizen/complaints/new'?'page':undefined}><ClipboardText size={19} aria-hidden="true"/>{c.complaints}</Link><Link href="/citizen/complaints/new" aria-current={pathname==='/citizen/complaints/new'?'page':undefined}><Plus size={19} aria-hidden="true"/>{complaintCopy[locale].new}</Link><Link href="/contact"><Question size={19} aria-hidden="true"/>{c.help}</Link></>;
 const logout=<form action={logoutAction}><input type="hidden" name="locale" value={locale}/><button className="signout" type="submit"><SignOut size={19} aria-hidden="true"/>{c.logout}</button></form>;
 return <header ref={menuRoot} className="citizen-header"><div className="citizen-head"><Brand/><nav className="citizen-nav" aria-label={c.menu}>{links}</nav><NotificationBell key={notifications.changeRevision} initial={notifications}/><div className="citizen-actions">
  <HeaderDisclosure className="citizen-language" accessibleLabel={c.language} label={<><Globe size={18} aria-hidden="true"/><span>{locale==='ar'?'العربية':locale.toUpperCase()}</span></>}><Languages/></HeaderDisclosure>
  <HeaderDisclosure className="citizen-user" label={<><span className="citizen-avatar"><User size={19} aria-hidden="true"/></span><span className="citizen-user-name">{name}</span></>}><Link href="/citizen/account"><User size={19} aria-hidden="true"/>{c.account}</Link>{logout}</HeaderDisclosure>
 </div><button className="hamb" aria-label={c.menu} aria-expanded={open} aria-controls="citizen-mobile-menu" onClick={()=>setOpen(!open)}>{open?<X size={25}/>:<List size={25}/>}</button></div>
 <nav hidden={!open} inert={!open} id="citizen-mobile-menu" onClick={event=>{if((event.target as HTMLElement).closest('a'))setOpen(false);}} className="citizen-mobile" aria-label={c.menu}>{links}<Languages/><Link className="citizen-mobile-account" href="/citizen/account"><span className="citizen-avatar"><User size={19} aria-hidden="true"/></span><span>{name}<small>{c.account}</small></span></Link>{logout}</nav></header>;
}
