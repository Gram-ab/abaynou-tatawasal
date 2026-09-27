import {requireCommuneStaff} from '@/server/auth/application-user';
import {CommuneShell} from '@/features/commune-auth/shell';
import {notificationSummary} from '@/server/notifications/repository';
export default async function Layout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){const user=await requireCommuneStaff((await params).locale),notifications=await notificationSummary(user).catch(()=>({changeRevision:0,lastSequence:0,unreadCount:0}));return <CommuneShell name={user.fullName} role={user.role as 'AGENT'|'ADMIN'} notifications={notifications}>{children}</CommuneShell>;}
