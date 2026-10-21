'use client';
import {useLocale} from 'next-intl';
import {staffAdminCopy,type StaffAdminLocale} from './copy';
import {staffPromotionCopy} from './promotion-copy';
import {StaffConfirmedForm} from './confirmed-form';
import {promoteAgent} from './promotion-actions';

export function AgentPromotionForm({staff}:{staff:{profile_id:string;full_name:string;email:string;revision:number;role:string;access_status:string;email_confirmed_at:Date|null;activation_pending?:boolean}}){
 const locale=useLocale() as StaffAdminLocale,c=staffAdminCopy[locale],p=staffPromotionCopy[locale];
 const available=staff.role==='AGENT'&&staff.access_status==='ACTIVE'&&Boolean(staff.email_confirmed_at)&&staff.activation_pending===false;
 return <StaffConfirmedForm available={available} unavailableContent={staff.role==='ADMIN'?<p className="commune-card">{p.restricted}</p>:null} action={promoteAgent} title={p.title} message={p.confirm} successMessage={p.success} target={`${staff.full_name} — ${staff.email}`}>
  <h2>{p.title}</h2><p>{p.description}</p>
  <input type="hidden" name="locale" value={locale}/><input type="hidden" name="profileId" value={staff.profile_id}/><input type="hidden" name="revision" value={staff.revision}/><input type="hidden" name="email" value={staff.email}/>
  <label className="commune-field">{c.reason}<textarea name="reason" required minLength={3} maxLength={2000}/></label>
  <label className="commune-field">{c.currentPassword}<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={1024}/></label>
  <label className="complaint-confirm"><input name="confirmed" type="checkbox" required/><span>{p.acknowledgement}</span></label>
 </StaffConfirmedForm>;
}
