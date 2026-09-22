import {getTranslations} from 'next-intl/server';
import Link from 'next/link';
import {State} from '@/shared/ui/primitives';
export default async function NotFound(){const t=await getTranslations();return <State title={t('notFoundTitle')}><p>{t('notFound')}</p><Link href="/">{t('back')}</Link></State>;}
