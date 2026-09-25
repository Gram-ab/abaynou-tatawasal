import {requireCitizen} from '@/server/auth/application-user';import {CitizenHeader} from '@/features/citizen-account/components/citizen-header';
export const dynamic='force-dynamic';
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const {locale}=await params;const citizen=await requireCitizen(locale);return <div className="citizen-shell"><CitizenHeader name={citizen.fullName}/><div className="citizen-main">{children}</div></div>}
