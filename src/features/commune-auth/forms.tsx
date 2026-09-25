'use client';
import {useActionState,useState} from 'react';
import {useLocale} from 'next-intl';
import {Link} from '@/shared/i18n/navigation';
import {initialAuthState} from '@/features/auth/model';
import {staffLogin,staffRecovery,staffConfirmRecovery,staffReset,staffChangePassword,staffSaveLanguage} from './actions';
import {communeCopy,type CommuneLocale} from './copy';
export function StaffForm({kind,returnTo='',language='ar',revision=1}:{kind:'login'|'recovery'|'confirm'|'reset'|'change'|'language';returnTo?:string;language?:string;revision?:number}){
 const locale=useLocale() as CommuneLocale,c=communeCopy[locale];
 const action={login:staffLogin,recovery:staffRecovery,confirm:staffConfirmRecovery,reset:staffReset,change:staffChangePassword,language:staffSaveLanguage}[kind];
 const [values,setValues]=useState<Record<string,string>>({email:'',password:'',confirmation:'',currentPassword:''});
 const [state,submit,pending]=useActionState(async(previous:typeof initialAuthState,form:FormData)=>{const result=await action(previous,form);if(result.status==='success'&&kind==='change')setValues({email:'',password:'',confirmation:'',currentPassword:''});return result;},initialAuthState);
 const passwordFields=kind==='reset'||kind==='change';
 const field=(name:string,label:string,type:string,autocomplete:string)=><label className="commune-field" key={name}>{label}<input name={name} value={values[name]} onChange={event=>setValues(current=>({...current,[name]:event.target.value}))} type={type} autoComplete={autocomplete} required maxLength={name==='email'?320:2048} dir={type==='email'?'ltr':undefined}/></label>;
 const message=state.code?c.messages[state.code as keyof typeof c.messages]??c.messages.failed:'';
 return <form action={submit} className="commune-form"><input type="hidden" name="locale" value={locale}/><input type="hidden" name="returnTo" value={returnTo}/>
 {(kind==='login'||kind==='recovery')&&field('email',c.email,'email','username')}
 {kind==='login'&&field('password',c.password,'password','current-password')}
 {kind==='change'&&field('currentPassword',c.currentPassword,'password','current-password')}
 {passwordFields&&<><p id="staff-password-policy">{c.policy}</p>{field('password',c.password,'password','new-password')}{field('confirmation',c.confirmation,'password','new-password')}</>}
 {kind==='confirm'&&<p>{c.confirmHelp}</p>}
 {kind==='language'&&<><input type="hidden" name="revision" value={revision}/><label className="commune-field">{c.language}<select name="language" defaultValue={language}><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label></>}
 {message&&<p className={`form-result ${state.status}`} role={state.status==='error'?'alert':'status'}>{message}</p>}
 <button className="btn" disabled={pending} aria-busy={pending}>{kind==='login'?c.login:kind==='recovery'?c.send:kind==='confirm'?c.continue:kind==='reset'?c.reset:c.save}</button>
 {kind==='login'&&<Link href="/commune/forgot-password">{c.forgot}</Link>}
 {(kind==='recovery'||kind==='reset'||kind==='confirm')&&<Link href="/commune/login">{c.login}</Link>}
 </form>;
}
