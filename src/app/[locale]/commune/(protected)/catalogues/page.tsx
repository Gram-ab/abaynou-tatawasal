import {redirect} from 'next/navigation';
import type {CatalogueAdminLocale} from '@/features/catalogue-admin/copy';
export default async function Page({params}:{params:Promise<{locale:CatalogueAdminLocale}>}){const {locale}=await params;redirect(`/${locale}/commune/catalogues/categories`);}

