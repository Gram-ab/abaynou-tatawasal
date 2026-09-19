import {getTranslations} from 'next-intl/server';
export default async function Loading(){const t=await getTranslations();return <div className="container section" role="status"><p>{t('loading')}</p><div className="skeleton" aria-hidden="true"/></div>;}
