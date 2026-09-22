import {CheckCircle,SignIn} from '@phosphor-icons/react/dist/ssr';
import {getLocale} from 'next-intl/server';
import {Link} from '@/shared/i18n/navigation';
type Kind='verified'|'emailChanged'|'registrationComplete';
const copy={
 ar:{verified:['تم تأكيد البريد الإلكتروني بنجاح','أصبح حسابك نشطاً الآن. يمكنك تسجيل الدخول.'],emailChanged:['تم تغيير البريد الإلكتروني بنجاح','تم تحديث بريد تسجيل الدخول. سجل الدخول من جديد باستعمال بريدك الجديد.'],registrationComplete:['اكتمل التسجيل','أصبح حسابك جاهزاً. يمكنك تسجيل الدخول.'],signin:'تسجيل الدخول'},
 fr:{verified:['Adresse courriel confirmée','Votre compte est maintenant actif. Vous pouvez vous connecter.'],emailChanged:['Adresse courriel modifiée','Votre adresse de connexion a été mise à jour. Connectez-vous à nouveau avec la nouvelle adresse.'],registrationComplete:['Inscription terminée','Votre compte est prêt. Vous pouvez vous connecter.'],signin:'Se connecter'},
 en:{verified:['Email verified successfully','Your account is now active. You can sign in.'],emailChanged:['Email changed successfully','Your login email has been updated. Sign in again using your new email address.'],registrationComplete:['Registration complete','Your account is ready. You can sign in.'],signin:'Sign in'}
};
export async function VerificationResult({kind}:{kind:Kind}){const locale=await getLocale() as keyof typeof copy,c=copy[locale],content=c[kind];return <section className="verification-card"><CheckCircle size={42} weight="regular" aria-hidden="true"/><h1>{content[0]}</h1><p role="status">{content[1]}</p><Link className="btn" href="/login"><SignIn size={20}/>{c.signin}</Link></section>}
