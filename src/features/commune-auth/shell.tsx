'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from 'next-intl';
import {House,UserCircle,LockKey,SignOut,List,X} from '@phosphor-icons/react';
import {Link,usePathname} from '@/shared/i18n/navigation';
import {Brand} from '@/shared/ui/header';
import {staffLogout} from './actions';
import {communeCopy,type CommuneLocale} from './copy';
export function CommuneShell({children,name,role}:{children:React.ReactNode;name:string;role:'AGENT'|'ADMIN'}){
 const locale=useLocale() as CommuneLocale,c=communeCopy[locale],pathname=usePathname(),[open,setOpen]=useState(false),menu=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement;const el=panel.current;el?.querySelector<HTMLElement>('button,a')?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;previous?.focus();};},[open]);
 const links=[{href:'/commune',label:c.home,Icon:House},{href:'/commune/account',label:c.account,Icon:UserCircle},{href:'/commune/account/password',label:c.change,Icon:LockKey}];
 return <div className="commune-shell"><a className="skip-link" href="#commune-content">{c.home}</a><div hidden={!open} aria-hidden="true" className="commune-backdrop" onClick={()=>setOpen(false)}/>
 <aside id="commune-navigation" ref={panel} className={`commune-sidebar ${open?'is-open':''}`} role={open?'dialog':undefined} aria-modal={open||undefined} aria-label={c.brand} onKeyDown={e=>{if(!open)return;if(e.key==='Escape'){setOpen(false);menu.current?.focus();}if(e.key==='Tab'){const nodes=panel.current?.querySelectorAll<HTMLElement>('a,button');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
 <button className="commune-close" aria-label={c.close} onClick={()=>setOpen(false)}><X size={24}/></button><div className="commune-sidebar-brand"><Brand/><span>{c.brand}</span></div>
 <nav aria-label={c.brand}>{links.map(({href,label,Icon})=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} onClick={()=>setOpen(false)}><Icon size={22}/>{label}</Link>)}</nav>
 <div className="commune-identity"><strong>{name}</strong><span>{role==='ADMIN'?c.admin:c.agent}</span><form action={staffLogout}><input type="hidden" name="locale" value={locale}/><button><SignOut size={22}/>{c.logout}</button></form></div>
 </aside><div className="commune-workspace" inert={open||undefined}><header className="commune-topbar"><button ref={menu} className="commune-menu" aria-label={c.menu} aria-controls="commune-navigation" aria-expanded={open} onClick={()=>setOpen(true)}><List size={24}/></button><span>{c.brand}</span><Link href="/commune/account">{name}</Link></header><div id="commune-content" className="commune-content" tabIndex={-1}>{children}</div></div></div>;
}
