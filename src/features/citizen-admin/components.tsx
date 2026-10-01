'use client';
import {useActionState,useRef,useState} from 'react';
import {useLocale} from 'next-intl';
import {ConfirmationDialog} from '@/shared/ui/confirmation-dialog';
import {changeCitizenStatus,retryCitizenProviderSync} from './actions';
import {citizenAdminCopy} from './copy';
import {initialCitizenAdminState} from './model';

export function CitizenStatusForm({profileId,revision,status,name,email,commandKey}:{profileId:string;revision:number;status:'ACTIVE'|'DISABLED';name:string;email:string;commandKey:string}){
 const locale=useLocale() as 'ar'|'fr'|'en',c=citizenAdminCopy[locale],disabling=status==='ACTIVE',next=disabling?'DISABLED':'ACTIVE';
 const [state,submit,pending]=useActionState(changeCitizenStatus,initialCitizenAdminState);
 const [retryState,retry,retryPending]=useActionState(retryCitizenProviderSync,initialCitizenAdminState);
 const [confirm,setConfirm]=useState(false),approved=useRef(false),form=useRef<HTMLFormElement>(null);
 const message=retryState.status==='idle'?state:retryState;
 return <div className="commune-card citizen-admin-action">
  <h2>{disabling?c.disable:c.enable}</h2>
  <form ref={form} action={submit} className="commune-form" aria-busy={pending} onSubmit={event=>{
   if(approved.current){approved.current=false;return;}
   event.preventDefault();setConfirm(true);
  }}>
   <input type="hidden" name="locale" value={locale}/><input type="hidden" name="profileId" value={profileId}/>
   <input type="hidden" name="revision" value={revision}/><input type="hidden" name="status" value={next}/><input type="hidden" name="key" value={commandKey}/>
   <label className="commune-field">{c.reason}<textarea name="reason" required minLength={3} maxLength={1000}/></label>
   <label className="commune-field">{c.password}<input type="password" name="currentPassword" autoComplete="current-password" required/></label>
   <button className={`btn${disabling?' danger':''}`} disabled={pending}>{disabling?c.disable:c.enable}</button>
  </form>
  {message.code&&<p role={message.status==='error'?'alert':'status'} className={`form-result ${message.status}`}>{c[message.code]}</p>}
  {message.status==='warning'&&<form action={retry} className="commune-form"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="profileId" value={profileId}/><button className="btn" disabled={retryPending}>{c.retry}</button></form>}
  <ConfirmationDialog open={confirm} title={disabling?c.disable:c.enable} message={`${disabling?c.confirmDisable:c.confirmEnable}\n${name} — ${email}`} confirmLabel={c.confirm} cancelLabel={c.cancel} danger={disabling} onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);requestAnimationFrame(()=>{if(!form.current?.reportValidity())return;approved.current=true;form.current.requestSubmit();});}}/>
 </div>;
}
