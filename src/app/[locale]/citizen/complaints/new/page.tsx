import {randomUUID} from 'node:crypto';
import {redirect} from 'next/navigation';
import {requireCitizen} from '@/server/auth/application-user';
import {readCatalogues} from '@/server/catalogues/repository';
import {recoverComplaint} from '@/server/complaints/repository';
import {ComplaintWizard} from '@/features/complaints/components/wizard';
import {z} from 'zod';
export const metadata={title:'New complaint',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{command?:string}>}){
 const {locale}=await params,actor=await requireCitizen(locale,true),{command}=await searchParams;
 if(!z.string().uuid().safeParse(command).success)redirect(`/${locale}/citizen/complaints/new?command=${randomUUID()}`);
 const reference=await recoverComplaint(actor,command!);
 if(reference)redirect(`/${locale}/citizen/complaints/${reference}`);
 const catalogues=await readCatalogues().catch(()=>null);
 return <ComplaintWizard actor={actor.profileId} commandKey={command!} initialCatalogues={catalogues}/>;
}
