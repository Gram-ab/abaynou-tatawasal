import {randomUUID} from 'node:crypto';import {requireAdmin} from '@/server/auth/application-user';import {CatalogueEditor} from '@/features/catalogue-admin/forms';import {catalogueAdminCopy,type CatalogueAdminLocale} from '@/features/catalogue-admin/copy';
export default async function Page({params}:{params:Promise<{locale:CatalogueAdminLocale}>}){const {locale}=await params;await requireAdmin(locale);return <section><h1>{catalogueAdminCopy[locale].locationNew}</h1><CatalogueEditor kind="LOCATION" commandKey={randomUUID()}/></section>}

