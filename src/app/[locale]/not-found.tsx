import {getTranslations} from 'next-intl/server';
import {State} from '@/shared/ui/primitives';
import {Link} from '@/shared/i18n/navigation';
export default async function NotFound(){const t=await getTranslations();return <State title={t('notFoundTitle')}><p>{t('notFound')}</p><Link href="/">{t('back')}</Link></State>;}
