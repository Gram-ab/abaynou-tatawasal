import {Link} from '@/shared/i18n/navigation';
import {Brand,Languages} from '@/shared/ui/header';
import {StaffForm} from './forms';
import {communeCopy,type CommuneLocale} from './copy';
export function StaffAuthScreen({locale,kind,returnTo='',invalid=false}:{locale:CommuneLocale;kind:'login'|'recovery'|'confirm'|'reset';returnTo?:string;invalid?:boolean}){const c=communeCopy[locale];return <><header className="auth-header"><div className="auth-top"><Brand/><Languages/></div></header><section className="commune-auth"><div className="commune-card"><span className="eyebrow">{c.brand}</span><h1>{c[kind]}</h1>{invalid?<><p role="alert">{c.messages.link}</p><Link className="btn" href="/commune/forgot-password">{c.forgot}</Link></>:<StaffForm kind={kind} returnTo={returnTo}/>}</div></section></>;}
