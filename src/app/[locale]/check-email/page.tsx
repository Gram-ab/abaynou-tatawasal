import {CheckEmail} from '@/features/auth/components/check-email';
import {maskEmail,readPendingSignup} from '@/server/auth/pending-signup';
export default async function Page(){const pending=await readPendingSignup();return <main className="auth-state-page"><CheckEmail maskedEmail={pending?maskEmail(pending.email):'••••@••••'} available={Boolean(pending)}/></main>}
