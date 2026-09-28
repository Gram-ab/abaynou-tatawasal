'use client';
import {useActionState} from 'react';
import {useLocale} from 'next-intl';
import {initialStaffAdminState} from './model';
import {changeAgentStatus,correctInvitationEmail,initiateStaffRecovery,inviteAgent,saveAgent} from './actions';
import {staffAdminCopy,type StaffAdminLocale} from './copy';
import {staffFeedbackCopy} from './feedback-copy';
import {StaffConfirmedForm} from './confirmed-form';
const Language=({value}:{value?:string})=><select name="language" defaultValue={value??'ar'}><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select>;
export function InviteAgentForm(){
 const locale=useLocale() as StaffAdminLocale,c=staffAdminCopy[locale],f=staffFeedbackCopy[locale];
 return <StaffConfirmedForm action={inviteAgent} title={c.invite} message={f.inviteConfirm} successMessage={f.inviteSuccess} className="commune-form">
  <input type="hidden" name="locale" value={locale}/>
  <label className="commune-field">{c.name}<input name="fullName" required maxLength={160}/></label>
  <label className="commune-field">{c.email}<input name="email" type="email" dir="ltr" required maxLength={320}/></label>
  <label className="commune-field">{c.phone}<input name="phone" dir="ltr" maxLength={40}/></label>
  <label className="commune-field">{c.language}<Language/></label>
 </StaffConfirmedForm>;
}
export function AgentForms({staff}:{staff:{profile_id:string;full_name:string;email:string;contact_phone:string|null;preferred_language:string;revision:number;access_status:string;last_sign_in_at:Date|null;email_confirmed_at:Date|null}}){
 const locale=useLocale() as StaffAdminLocale,c=staffAdminCopy[locale],f=staffFeedbackCopy[locale];
 const [edit,editAction,editPending]=useActionState(saveAgent,initialStaffAdminState);
 const hidden=<><input type="hidden" name="locale" value={locale}/><input type="hidden" name="profileId" value={staff.profile_id}/><input type="hidden" name="revision" value={staff.revision}/></>;
 const disabling=staff.access_status==='ACTIVE',target=`${staff.full_name} — ${staff.email}`;
 return <div className="staff-actions">
  <form action={editAction} className="commune-form commune-card"><h2>{c.edit}</h2>{hidden}<label className="commune-field">{c.name}<input name="fullName" defaultValue={staff.full_name} required/></label><label className="commune-field">{c.phone}<input name="phone" dir="ltr" defaultValue={staff.contact_phone??''}/></label><label className="commune-field">{c.language}<Language value={staff.preferred_language}/></label><Result state={edit} c={c}/><button className="btn" disabled={editPending}>{c.edit}</button></form>
  <StaffConfirmedForm action={changeAgentStatus} title={disabling?c.disable:c.enable} message={disabling?f.disableConfirm:f.enableConfirm} successMessage={disabling?f.disableSuccess:f.enableSuccess} target={target} danger={disabling}>
   <h2>{disabling?c.disable:c.enable}</h2>{hidden}<input type="hidden" name="email" value={staff.email}/><input type="hidden" name="status" value={disabling?'DISABLED':'ACTIVE'}/>
   <label className="commune-field">{c.reason}<textarea name="reason" required minLength={3} maxLength={1000}/></label>
  </StaffConfirmedForm>
  {staff.access_status==='ACTIVE'&&<StaffConfirmedForm action={initiateStaffRecovery} title={c.recovery} message={f.recoveryConfirm} successMessage={f.recoverySuccess} target={target}>
   <h2>{c.recovery}</h2>{hidden}<input type="hidden" name="email" value={staff.email}/>
  </StaffConfirmedForm>}
  {(staff.email_confirmed_at||staff.last_sign_in_at)&&<p className="commune-card">{c.activatedEmail}</p>}
  {!staff.email_confirmed_at&&!staff.last_sign_in_at&&<StaffConfirmedForm action={correctInvitationEmail} title={c.correct} message={f.correctConfirm} successMessage={f.correctSuccess} target={target}>
   <h2>{c.correct}</h2>{hidden}<input type="hidden" name="email" value={staff.email}/>
   <label className="commune-field">{c.newEmail}<input name="newEmail" type="email" dir="ltr" required/></label>
   <label className="commune-field">{c.currentPassword}<input name="currentPassword" type="password" autoComplete="current-password" required/></label>
   <label className="complaint-confirm"><input name="confirmed" type="checkbox" required/><span>{c.confirmCorrection}</span></label>
  </StaffConfirmedForm>}
 </div>;
}
function Result({state,c}:{state:typeof initialStaffAdminState;c:Record<string,string>}){return state.code?<p role={state.status==='error'?'alert':'status'} className={`form-result ${state.status}`}>{c[state.code]??c.failed}</p>:null;}
