'use client';
import Image from 'next/image';
import {useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {Globe,List,X} from '@phosphor-icons/react';
import {Link,usePathname} from '@/shared/i18n/navigation';
import {pageRoutes,type PageKey} from '@/features/public-content/model';
const primary:PageKey[]=['HOME','HOW_IT_WORKS','SERVICE_SCOPE','FAQ'];
export function Brand(){const t=useTranslations();return <Link href="/" className="brand"><Image src="/assets/commune-mark-abaynou.png" width={88} height={52} alt="" unoptimized/><span><b>{t('brand')}</b><small>{t('tagline')}</small></span></Link>;}
export function Languages(){const t=useTranslations(),locale=useLocale(),pathname=usePathname();return <nav className="language" aria-label={t('languages')}><Globe size={19} aria-hidden="true"/>{(['ar','fr','en'] as const).map(lang=><a key={lang} href={`/${lang}${pathname==='/'?'':pathname}`} hrefLang={lang} lang={lang} aria-label={{ar:'العربية',fr:'Français',en:'English'}[lang]} aria-current={lang===locale?'true':undefined}>{lang==='ar'?'العربية':lang.toUpperCase()}</a>)}</nav>;}
export function Header(){
 const t=useTranslations(),pathname=usePathname(),locale=useLocale();const menuKey=locale+pathname;const [openPath,setOpenPath]=useState<string|null>(null);const open=openPath===menuKey;
 const auth=['/login','/register','/forgot-password'].includes(pathname);
 const links=primary.map(key=><Link onClick={()=>setOpenPath(null)} key={key} href={'/'+pageRoutes[key]} aria-current={pathname==='/'+pageRoutes[key]?'page':undefined}>{t(`nav.${key}`)}</Link>);
 return <><a className="skip-link" href="#main">{t('skip')}</a>{auth?<header className="auth-header"><div className="auth-top"><Brand/><Languages/></div></header>:<header className="public-header"><div className="head"><Brand/><nav className="desktop-nav" aria-label={t('navigation')}>{links}</nav><div className="head-actions"><Languages/><Link className="btn ghost" href="/login">{t('signIn')}</Link><Link className="btn" href="/register">{t('createAccount')}</Link></div><button className="hamb" aria-label={t('menu')} aria-expanded={open} aria-controls="public-mobile-menu" onClick={()=>setOpenPath(open?null:menuKey)}>{open?<X size={25}/>:<List size={25}/>}</button></div>{open&&<nav className="mobile-nav" id="public-mobile-menu" aria-label={t('navigation')} onKeyDown={e=>{if(e.key==='Escape'){setOpenPath(null);document.querySelector<HTMLButtonElement>('.hamb')?.focus();}}}>{links}<Languages/><Link onClick={()=>setOpenPath(null)} href="/login">{t('signIn')}</Link><Link className="btn" onClick={()=>setOpenPath(null)} href="/register">{t('createAccount')}</Link></nav>}</header>}</>;
}
