'use client';
import {useMenuDismiss} from './use-menu-dismiss';
import Image from 'next/image';
import {useState} from 'react';
import {useRouter as useNextRouter} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {Globe,List,X} from '@phosphor-icons/react';
import {Link,usePathname} from '@/shared/i18n/navigation';
import {pageRoutes,type PageKey} from '@/features/public-content/model';
import {staffLogout} from '@/features/commune-auth/actions';
import {logoutAction} from '@/features/auth/actions';
const primary:PageKey[]=['HOME','HOW_IT_WORKS','SERVICE_SCOPE','FAQ'];
export function Brand(){const t=useTranslations();return <Link href="/" className="brand"><Image src="/assets/commune-mark-abaynou.png" width={88} height={52} alt="" unoptimized/><span><b>{t('brand')}</b><small>{t('tagline')}</small></span></Link>;}
export function Languages(){const router=useNextRouter(),t=useTranslations(),locale=useLocale(),pathname=usePathname();return <nav className="language" aria-label={t('languages')}><Globe size={19} aria-hidden="true"/>{(['ar','fr','en'] as const).map(lang=><a key={lang} onClick={event=>{if(pathname==='/citizen/complaints/new'){event.preventDefault();router.push(`/${lang}${pathname}${window.location.search}`);}}} href={`/${lang}${pathname==='/'?'':pathname}`} hrefLang={lang} lang={lang} aria-label={{ar:'العربية',fr:'Français',en:'English'}[lang]} aria-current={lang===locale?'true':undefined}>{lang==='ar'?'العربية':lang.toUpperCase()}</a>)}</nav>;}
export function Header({viewer=null}:{viewer?:{name:string;role:'CITIZEN'|'AGENT'|'ADMIN'}|null}){
 const t=useTranslations(),pathname=usePathname(),locale=useLocale();const menuKey=locale+pathname;const [openPath,setOpenPath]=useState<string|null>(null);const open=openPath===menuKey;const menuRoot=useMenuDismiss(open,()=>setOpenPath(null));
 if(pathname.startsWith('/citizen')||pathname.startsWith('/commune'))return null;
 const auth=['/login','/register','/forgot-password','/verify-email','/reset-password','/complete-registration','/account-disabled','/session-expired'].includes(pathname);
 const links=primary.map(key=><Link onClick={()=>setOpenPath(null)} key={key} href={'/'+pageRoutes[key]} aria-current={pathname==='/'+pageRoutes[key]?'page':undefined}>{t(`nav.${key}`)}</Link>);
 const actions=viewer?<><Link className="btn ghost public-viewer-name" href={viewer.role==='CITIZEN'?'/citizen/account':'/commune/account'} onClick={()=>setOpenPath(null)}>{viewer.name}</Link><form action={viewer.role==='CITIZEN'?logoutAction:staffLogout}><input type="hidden" name="locale" value={locale}/><button className="btn" type="submit">{t('signOut')}</button></form></>:<><Link className="btn ghost" href="/login">{t('signIn')}</Link><Link className="btn" href="/register">{t('createAccount')}</Link></>;
 return <><a className="skip-link" href="#main">{t('skip')}</a>{auth?<header className="auth-header"><div className="auth-top"><Brand/><Languages/></div></header>:<header ref={menuRoot} className="public-header"><div className="head"><Brand/><nav className="desktop-nav" aria-label={t('navigation')}>{links}</nav><div className="head-actions"><Languages/>{actions}</div><button className="hamb" aria-label={t('menu')} aria-expanded={open} aria-controls="public-mobile-menu" onClick={()=>setOpenPath(open?null:menuKey)}>{open?<X size={25}/>:<List size={25}/>}</button></div><nav hidden={!open} inert={!open} className="mobile-nav" id="public-mobile-menu" aria-label={t('navigation')} onKeyDown={e=>{if(e.key==='Escape'){setOpenPath(null);document.querySelector<HTMLButtonElement>('.hamb')?.focus();}}}>{links}<Languages/>{actions}</nav></header>}</>;
}
