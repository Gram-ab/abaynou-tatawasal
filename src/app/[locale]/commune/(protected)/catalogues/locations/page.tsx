import {CatalogueOverview} from '@/features/catalogue-admin/overview';
import {catalogueAdminCopy,type CatalogueAdminLocale} from '@/features/catalogue-admin/copy';
export default async function Page({params,searchParams}:{params:Promise<{locale:CatalogueAdminLocale}>;searchParams:Promise<{q?:string;status?:string}>}){const {locale}=await params;return <CatalogueOverview locale={locale} query={await searchParams} kind="LOCATION"/>;}
export async function generateMetadata({params}:{params:Promise<{locale:CatalogueAdminLocale}>}){const {locale}=await params;return {title:catalogueAdminCopy[locale].locations};}
