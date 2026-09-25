'use client';
import {useLocale} from 'next-intl';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
export default function ErrorBoundary({reset}:{reset:()=>void}){const c=communeCopy[useLocale() as CommuneLocale];return <section className="commune-state"><h1>{c.error}</h1><button className="btn" onClick={reset}>{c.retry}</button></section>;}
