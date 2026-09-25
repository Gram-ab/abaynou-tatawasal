import {requireCommuneStaff} from '@/server/auth/application-user';
import {CommuneShell} from '@/features/commune-auth/shell';
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const user=await requireCommuneStaff((await params).locale);return <CommuneShell name={user.fullName} role={user.role as 'AGENT'|'ADMIN'}>{children}</CommuneShell>;}
