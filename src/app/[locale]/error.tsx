'use client';
import {useTranslations} from 'next-intl';
export default function PublicError({reset}:{reset:()=>void}){const t=useTranslations();return <section className="container section prose"><h1>{t('errorTitle')}</h1><p>{t('error')}</p><button className="button" onClick={reset}>{t('retry')}</button></section>;}
