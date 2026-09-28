'use client';
import {useActionState,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {useLocale} from 'next-intl';
import {CheckCircle} from '@phosphor-icons/react';
import {ConfirmationDialog} from '@/shared/ui/confirmation-dialog';
import {initialStaffAdminState,type StaffAdminState} from './model';
import {staffAdminCopy,type StaffAdminLocale} from './copy';
import {staffFeedbackCopy} from './feedback-copy';

export function StaffConfirmedForm({action,title,message,successMessage,target,children,className='commune-form commune-card',danger=false}:{action:(state:StaffAdminState,form:FormData)=>Promise<StaffAdminState>;title:string;message:string;successMessage:string;target?:string;children:ReactNode;className?:string;danger?:boolean}){
 const locale=useLocale() as StaffAdminLocale,c=staffAdminCopy[locale],feedback=staffFeedbackCopy[locale];
 const [state,submit,pending]=useActionState(action,initialStaffAdminState);
 const form=useRef<HTMLFormElement>(null),approved=useRef(false);
 const [confirmation,setConfirmation]=useState<{title:string;message:string;success:string;danger:boolean}|null>(null);
 const [lastConfirmation,setLastConfirmation]=useState<typeof confirmation>(null);
 const [dismissed,setDismissed]=useState<StaffAdminState|null>(null);
 const closeSuccess=()=>{setDismissed(state);if(state.redirectTo)window.location.assign(state.redirectTo);};
 return <>
  <form ref={form} action={submit} className={className} aria-busy={pending} onSubmit={event=>{
   if(pending){event.preventDefault();return;}
   if(approved.current){approved.current=false;return;}
   event.preventDefault();
   const data=new FormData(event.currentTarget);
   const recipient=target??[data.get('fullName'),data.get('email')].filter(Boolean).join(' — ');
   const destination=data.get('newEmail');
   setConfirmation({title,message:[message,recipient,destination?`→ ${String(destination)}`:''].filter(Boolean).join('\n'),success:successMessage,danger});
  }}>
   {children}
   {state.code&&<p className={`form-result ${state.status}`} role={state.status==='error'?'alert':'status'}>{c[state.code as keyof typeof c]??c.failed}</p>}
   <button type="submit" className={`btn${danger?' danger':''}`} disabled={pending}>{pending?feedback.pending:title}</button>
  </form>
  <ConfirmationDialog open={Boolean(confirmation)} title={confirmation?.title??title} message={confirmation?.message??message} confirmLabel={confirmation?.title??title} cancelLabel={feedback.cancel} danger={confirmation?.danger??danger} onCancel={()=>setConfirmation(null)} onConfirm={()=>{
   if(!confirmation||pending)return;
   setLastConfirmation(confirmation);setConfirmation(null);
   requestAnimationFrame(()=>{if(!form.current?.reportValidity())return;approved.current=true;form.current.requestSubmit();});
  }}/>
  <StaffSuccessDialog open={state.status==='success'&&state!==dismissed} title={feedback.successTitle} message={lastConfirmation?.success??successMessage} closeLabel={feedback.close} onClose={closeSuccess}/>
 </>;
}
function StaffSuccessDialog({open,title,message,closeLabel,onClose}:{open:boolean;title:string;message:string;closeLabel:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId(),messageId=useId();
 useEffect(()=>{const element=dialog.current;if(!element)return;if(open&&!element.open)element.showModal();if(!open&&element.open)element.close();},[open]);
 return <dialog ref={dialog} className="platform-dialog staff-success-dialog" aria-labelledby={titleId} aria-describedby={messageId} onCancel={event=>{event.preventDefault();onClose();}}>
  <div className="platform-dialog-icon" aria-hidden="true"><CheckCircle size={28}/></div>
  <h2 id={titleId}>{title}</h2><p id={messageId}>{message}</p>
  <div className="platform-dialog-actions"><button type="button" className="btn" onClick={onClose}>{closeLabel}</button></div>
 </dialog>;
}
