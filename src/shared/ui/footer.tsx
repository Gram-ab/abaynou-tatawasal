import {getLocale,getTranslations} from 'next-intl/server';
import {Info,Phone,FileText,Lock,PersonArmsSpread,Scales,Buildings} from '@phosphor-icons/react/dist/ssr';
import {Link} from '@/shared/i18n/navigation';
import {readSettings} from '@/features/public-content/repository';
import {chikayaUrlSchema,pageRoutes,type PageKey} from '@/features/public-content/model';
export async function Footer({showCommuneEntry=true}:{showCommuneEntry?:boolean}){
 const t=await getTranslations(),locale=await getLocale();const settings=await readSettings(locale).catch(()=>null);
 const pages:PageKey[]=['CONTACT','USER_GUIDE','PRIVACY','ACCESSIBILITY','TERMS'];const icons=[Phone,FileText,Lock,PersonArmsSpread,Scales];
 return <><aside className="chikaya"><Info size={18} aria-hidden="true"/><span>{t('chikayaNote')}</span>{settings&&chikayaUrlSchema.safeParse(settings.chikaya_url).success&&<a href={settings.chikaya_url} rel="external noopener noreferrer">Chikaya.ma<span className="sr-only"> — {t('external')}</span></a>}</aside><footer className="public-footer"><nav aria-label={t('footer')}>{pages.map((key,i)=>{const Icon=icons[i];return <Link key={key} href={'/'+pageRoutes[key]}><Icon size={18} aria-hidden="true"/>{t(`nav.${key}`)}</Link>;})}{showCommuneEntry&&<Link className="commune-footer-link" href="/commune/login"><Buildings size={16} aria-hidden="true"/>{t('communeSpace')}</Link>}</nav><small>{t('copyright')}</small></footer></>;
}
