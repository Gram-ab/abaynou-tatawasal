import {getTranslations} from 'next-intl/server';
import {State} from '@/shared/ui/primitives';
import {Link} from '@/shared/i18n/navigation';
export default async function Unavailable(){const t=await getTranslations();return <State title={t('unavailableTitle')}><p>{t('unavailable')}</p><Link className="button secondary" href="/">{t('back')}</Link></State>;}
