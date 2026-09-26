import {complaintCopy} from '../copy';
import {catalogueLabel,type Labels} from '../model';
export function ComplaintFacts({locale,values}:{locale:'ar'|'fr'|'en';values:{subject:string;description:string;location_clarification:string|null;category_labels:Labels;location_labels:Labels}}){
 const c=complaintCopy[locale],category=catalogueLabel({labels:values.category_labels},locale),location=catalogueLabel({labels:values.location_labels},locale);
 return <dl className="complaint-facts"><div><dt>{c.category}</dt><dd lang={category.language} dir={category.language==='ar'?'rtl':'ltr'}>{category.text}</dd></div><div><dt>{c.subject}</dt><dd dir="auto">{values.subject}</dd></div><div><dt>{c.description}</dt><dd dir="auto">{values.description}</dd></div><div><dt>{c.location}</dt><dd lang={location.language} dir={location.language==='ar'?'rtl':'ltr'}>{location.text}</dd></div>{values.location_clarification&&<div><dt>{c.clarification}</dt><dd dir="auto">{values.location_clarification}</dd></div>}</dl>;
}
