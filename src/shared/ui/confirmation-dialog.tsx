'use client';
import {useEffect,useId,useRef} from 'react';
import {WarningCircle,X} from '@phosphor-icons/react';

export function ConfirmationDialog({open,title,message,confirmLabel,cancelLabel,danger=false,onConfirm,onCancel}:{open:boolean;title:string;message:string;confirmLabel:string;cancelLabel:string;danger?:boolean;onConfirm:()=>void;onCancel:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId(),descriptionId=useId();
 useEffect(()=>{const node=dialog.current;if(!node)return;if(open&&!node.open)node.showModal();if(!open&&node.open)node.close();},[open]);
 return <dialog ref={dialog} className="platform-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event=>{event.preventDefault();onCancel();}} onClose={onCancel}>
  <div className="platform-dialog-icon" aria-hidden="true"><WarningCircle size={26}/></div>
  <button type="button" className="platform-dialog-close" aria-label={cancelLabel} onClick={onCancel}><X size={21}/></button>
  <h2 id={titleId}>{title}</h2><p id={descriptionId}>{message}</p>
  <div className="platform-dialog-actions"><button type="button" className="btn ghost" onClick={onCancel}>{cancelLabel}</button><button type="button" className={`btn${danger?' danger':''}`} onClick={onConfirm}>{confirmLabel}</button></div>
 </dialog>;
}
