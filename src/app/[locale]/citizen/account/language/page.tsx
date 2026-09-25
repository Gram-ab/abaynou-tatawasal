import {requireCitizen} from '@/server/auth/application-user';
import {redirect} from 'next/navigation';
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;await requireCitizen(locale);redirect(`/${locale}/citizen/account`);}
