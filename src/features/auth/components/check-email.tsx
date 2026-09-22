'use client';
import {useActionState} from 'react';
import {useLocale} from 'next-intl';
import {EnvelopeSimple,SignIn} from '@phosphor-icons/react';
import {resendPendingVerificationAction} from '../actions';
import {initialAuthState} from '../model';
import {Link} from '@/shared/i18n/navigation';
type Locale='ar'|'fr'|'en';
const copy={
 ar:{title:'تحقق من بريدك الإلكتروني',lead:'أرسلنا رابط تحقق إلى',detail:'افتح الرسالة لتأكيد عنوانك وتفعيل حسابك.',resend:'إعادة إرسال رسالة التحقق',sent:'إذا كان الحساب ينتظر التأكيد فستصل رسالة جديدة.',invalid:'انتهت معلومات التسجيل. أنشئ الحساب من جديد أو سجل الدخول.',signin:'العودة إلى تسجيل الدخول'},
 fr:{title:'Vérifiez votre courriel',lead:'Nous avons envoyé un lien de vérification à',detail:'Ouvrez le message pour confirmer votre adresse et activer votre compte.',resend:'Renvoyer le courriel de vérification',sent:'Si le compte attend une confirmation, un nouveau courriel sera envoyé.',invalid:'Les informations d’inscription ont expiré. Recommencez l’inscription ou connectez-vous.',signin:'Retour à la connexion'},
 en:{title:'Check your email',lead:'We sent a verification link to',detail:'Open the email to confirm your address and activate your account.',resend:'Resend verification email',sent:'If the account is awaiting confirmation, a new email will be sent.',invalid:'The registration details expired. Register again or sign in.',signin:'Back to sign in'}
};
export function CheckEmail({maskedEmail,available}:{maskedEmail:string;available:boolean}){const locale=useLocale() as Locale,c=copy[locale];const [state,action,pending]=useActionState(resendPendingVerificationAction,initialAuthState);return <section className="verification-card"><EnvelopeSimple size={38} aria-hidden="true"/><h1>{c.title}</h1><p>{c.lead} <b dir="ltr">{maskedEmail}</b>.<br/>{c.detail}</p>{state.status!=='idle'&&<p className={`auth-notice ${state.status==='error'?'error-notice':''}`} role={state.status==='error'?'alert':'status'}>{state.status==='success'?c.sent:c.invalid}</p>}<form action={action}><input type="hidden" name="locale" value={locale}/><button className="btn" type="submit" disabled={pending||!available}>{pending?'…':c.resend}</button></form><Link className="btn secondary" href="/login"><SignIn size={20}/>{c.signin}</Link></section>}
