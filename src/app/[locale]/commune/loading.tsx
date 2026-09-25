import {getLocale} from 'next-intl/server';
import {communeCopy,type CommuneLocale} from '@/features/commune-auth/copy';
export default async function Loading(){return <p role="status" className="commune-state">{communeCopy[await getLocale() as CommuneLocale].loading}</p>;}
