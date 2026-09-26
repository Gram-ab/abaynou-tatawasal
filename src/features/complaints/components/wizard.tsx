'use client';
import {useEffect,useRef,useState} from 'react';
import {useForm,useWatch} from 'react-hook-form';
import {useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {complaintCopy} from '../copy';
import {catalogueLabel,codePoints,complaintFieldsSchema,emptyComplaint,sortedCatalogue,type Catalogues,type ComplaintFields} from '../model';
import {recoverComplaintAction,reloadComplaintCatalogues,submitComplaintAction} from '../actions';
import {useFlowMemory} from './flow-memory';
import {ComplaintFacts} from './detail';

export function ComplaintWizard({actor,commandKey,initialCatalogues}:{actor:string;commandKey:string;initialCatalogues:Catalogues|null}){
 const locale=useLocale() as 'ar'|'fr'|'en',c=complaintCopy[locale],router=useRouter(),memory=useFlowMemory();
 const [saved]=useState(()=>{const prior=memory.read();return prior?.actor===actor&&prior.key===commandKey?prior:null;});
 const {register,control,getValues,setError,clearErrors,setFocus,formState:{errors}}=useForm<ComplaintFields>({defaultValues:saved?.fields??emptyComplaint});
 const [step,setStep]=useState(saved?.step??0),[confirmed,setConfirmed]=useState(saved?.confirmed??false);
 const [catalogues,setCatalogues]=useState(initialCatalogues),[pending,setPending]=useState(false),[message,setMessage]=useState('');
 const [uncertain,setUncertain]=useState(saved?.uncertain??false);const heading=useRef<HTMLHeadingElement>(null),finished=useRef(false),locked=useRef(false);
 const fields=useWatch({control,compute:(values:ComplaintFields)=>values}),dirty=Object.values(fields).some(Boolean);
 useEffect(()=>{memory.write({actor,key:commandKey,fields,step,confirmed,uncertain});},[actor,commandKey,fields,step,confirmed,uncertain,memory]);
 useEffect(()=>{
  if(!dirty)return;
  const unload=(event:BeforeUnloadEvent)=>{if(!finished.current){event.preventDefault();event.returnValue='';}};
  const leave=(event:MouseEvent)=>{const link=(event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');if(!link||finished.current)return;const target=new URL(link.href,location.href);if(/^\/(ar|fr|en)\/citizen\/complaints\/new$/.test(target.pathname))return;if(target.origin===location.origin&&target.pathname===location.pathname)return;if(!window.confirm(c.leave)){event.preventDefault();event.stopPropagation();}};
  window.addEventListener('beforeunload',unload);document.addEventListener('click',leave,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',leave,true);};
 },[dirty,c.leave]);
 function move(next:number){setStep(next);setConfirmed(false);setMessage('');requestAnimationFrame(()=>heading.current?.focus());}
 function validate(all=false){
  clearErrors();const parsed=complaintFieldsSchema.safeParse(getValues());
  const relevant=all?Object.keys(emptyComplaint):step===0?['categoryId','subject','description']:['locationId','locationClarification'];
  const issues=parsed.success?[]:parsed.error.issues.filter(issue=>relevant.includes(String(issue.path[0])));
  for(const issue of issues)setError(issue.path[0] as keyof ComplaintFields,{message:issue.message});
  if(issues.length){const first=issues[0].path[0] as keyof ComplaintFields;if(all)setStep(['categoryId','subject','description'].includes(first)?0:1);setMessage(c.validation);setTimeout(()=>setFocus(first),0);return false;}return true;
 }
 async function refreshChoices(){try{const choices=await reloadComplaintCatalogues();setCatalogues(choices);if(!choices)setMessage(c.catalogue);}catch{setMessage(c.catalogue);}}
 function goToResult(reference:string){finished.current=true;memory.write(null);router.replace(`/${locale}/citizen/complaints/${reference}`);}
 async function recover(){
  if(locked.current)return;locked.current=true;setPending(true);
  try{const result=await recoverComplaintAction(commandKey);if(result.reference){goToResult(result.reference);return;}if(result.error)setMessage(result.error==='session'?c.session:c.uncertain);else{setUncertain(false);setMessage(c.retry);}}
  catch{setMessage(c.uncertain);}finally{locked.current=false;setPending(false);}
 }
 async function submit(){
  if(locked.current||!validate(true))return;if(!confirmed){setMessage(c.confirmation);return;}
  locked.current=true;setPending(true);setMessage('');
  try{
   const result=await submitComplaintAction({...getValues(),locale,commandKey,confirmed:true});
   if('reference' in result&&result.reference){goToResult(result.reference);return;}
   const error='error' in result?result.error:'uncertain';
   if(error==='category'||error==='location'){setStep(error==='category'?0:1);setConfirmed(false);await refreshChoices();setMessage(error==='category'?c.categoryError:c.locationError);}
   else if(error==='session')setMessage(c.session);
   else if(error==='throttled')setMessage(c.throttled);
   else if(error==='validation')setMessage(c.validation);
   else {setUncertain(true);setMessage(error==='conflict'?c.conflict:c.uncertain);}
  }catch{setUncertain(true);setMessage(c.uncertain);}finally{locked.current=false;setPending(false);}
 }
 function errorText(field:keyof ComplaintFields){const key=errors[field]?.message;return key==='tooLong'?c.tooLong:key==='tooShort'?c.tooShort:key==='invalidText'?c.invalidText:c.required;}
 function error(field:keyof ComplaintFields){return errors[field]&&<span className="field-error" id={`${field}-error`}>{errorText(field)}</span>;}
 const category=catalogues?.categories.find(item=>item.id===fields.categoryId),locationItem=catalogues?.locations.find(item=>item.id===fields.locationId);
 return <section className="complaint-page"><span className="eyebrow">{c.new}</span><h1>{c.title}</h1><p className="complaint-intro">{c.intro}</p>
 <ol className="complaint-progress">{c.steps.map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={index<=step?'complete':''}><span>{index<step?'✓':index+1}</span>{label}</li>)}</ol>
 <form className="complaint-panel" onSubmit={event=>{event.preventDefault();if(step<2){if(validate())move(step+1);}else void submit();}}>
 <h2 ref={heading} tabIndex={-1}>{c.steps[step]}</h2>
 {message&&<div role="alert" className="form-result error">{message}{message===c.session&&<a href={`/${locale}/login`}>{c.signIn}</a>}</div>}
 {!catalogues?<div role="status"><p>{c.catalogue}</p><button type="button" className="btn" onClick={refreshChoices}>{c.retry}</button></div>:<>
 <fieldset disabled={pending||uncertain} hidden={step!==0}>
 <label htmlFor="categoryId">{c.category} *</label><select id="categoryId" aria-required="true" {...register('categoryId')} aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId?'categoryId-error':undefined}><option value="">{c.choose}</option>{sortedCatalogue(catalogues.categories,locale).map(item=>{const label=catalogueLabel(item,locale);return <option key={item.id} value={item.id} lang={label.language}>{label.text}</option>;})}</select>{error('categoryId')}
 <label htmlFor="subject">{c.subject} *</label><input id="subject" aria-required="true" dir="auto" {...register('subject')} aria-invalid={Boolean(errors.subject)} aria-describedby="subject-help subject-error"/><small id="subject-help">{codePoints(fields.subject)} / 150 {c.count}</small>{error('subject')}
 <label htmlFor="description">{c.description} *</label><textarea id="description" aria-required="true" dir="auto" rows={7} {...register('description')} aria-invalid={Boolean(errors.description)} aria-describedby="description-help description-error"/><small id="description-help">{codePoints(fields.description)} / 2000 {c.count} · 20–2000</small>{error('description')}
 </fieldset>
 <fieldset disabled={pending||uncertain} hidden={step!==1}><aside className="callout">{c.scope}</aside>
 <label htmlFor="locationId">{c.location} *</label><select id="locationId" aria-required="true" {...register('locationId')} lang="ar" dir="rtl" aria-invalid={Boolean(errors.locationId)} aria-describedby={errors.locationId?'locationId-error':undefined}><option value="" lang={locale}>{c.choose}</option>{sortedCatalogue(catalogues.locations,locale).map(item=><option key={item.id} value={item.id} lang="ar" dir="rtl">{item.labels.ar}</option>)}</select>{error('locationId')}
 <label htmlFor="locationClarification">{c.clarification}</label><input id="locationClarification" dir="auto" {...register('locationClarification')} aria-invalid={Boolean(errors.locationClarification)} aria-describedby="locationClarification-help locationClarification-error"/><small id="locationClarification-help">{codePoints(fields.locationClarification)} / 300 {c.count}</small>{error('locationClarification')}
 </fieldset>
 {step===2&&category&&locationItem&&<><ComplaintFacts locale={locale} values={{...fields,location_clarification:fields.locationClarification||null,category_labels:category.labels,location_labels:locationItem.labels}}/><label className="complaint-confirm"><input type="checkbox" checked={confirmed} disabled={pending||uncertain} onChange={event=>setConfirmed(event.target.checked)}/>{c.confirm}</label></>}
 <div className="complaint-buttons">{step>0&&<button className="btn ghost" type="button" disabled={pending||uncertain} onClick={()=>move(step-1)}>{c.back}</button>}{uncertain?<button type="button" className="btn" disabled={pending} onClick={recover}>{c.recover}</button>:<button className="btn" disabled={pending} type="submit">{pending?c.pending:step===2?c.submit:c.next}</button>}</div>
 </>}
 <span className="sr-only" role="status">{pending?c.pending:''}</span>
 </form></section>;
}
