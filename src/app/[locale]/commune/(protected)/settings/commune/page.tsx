import {settingsFieldLabel,settingsPresentation} from '@/features/content-admin/presentation';
import {randomUUID} from 'node:crypto';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/server/auth/application-user';
import {readAdminSettings,readAdminSettingsHistory} from '@/server/content-admin/repository';
import {SettingsEditor} from '@/features/content-admin/components';
import {contentAdminCopy} from '@/features/content-admin/copy';
import type {ContentAdminLocale} from '@/features/content-admin/model';
export default async function Page({params}:{params:Promise<{locale:ContentAdminLocale}>}){const {locale}=await params,actor=await requireAdmin(locale),[settings,history]=await Promise.all([readAdminSettings(actor),readAdminSettingsHistory(actor)]);if(!settings)notFound();const c=contentAdminCopy[locale];return <section className="settings-detail"><span className="eyebrow">{c.nav}</span><h1>{c.commune}</h1><p>{c.communeIntro}</p><p>{settingsPresentation[locale].nameHelp}</p><SettingsEditor key={settings.revision} settings={settings} commandKey={randomUUID()}/><section className="commune-card settings-history"><h2>{settingsPresentation[locale].history}</h2><p>{settingsPresentation[locale].help}</p>{history.length?history.map((item,index)=><article key={`${item.occurredAt.toISOString()}-${index}`}><strong>{c.version} {item.revision}</strong><span>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(item.occurredAt)} · {item.publisherName??settingsPresentation[locale].unknown}</span>{item.changedFields.length>0&&<small>{c.changed}: {item.changedFields.map(field=>settingsFieldLabel(locale,field)).join('، ')}</small>}</article>):<p>{c.noHistory}</p>}</section></section>;}
