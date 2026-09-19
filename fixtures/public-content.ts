import {pageRoutes, type PageKey} from '../src/features/public-content/model';
import {designContent} from './public-design-content';
function copy(row: string[]) {
 const [title,intro,...sections]=row;
 return {title,body:intro+'\n\n'+sections.map((text,i)=>i%2===0?'## '+text:text).join('\n\n')};
}
export const developmentPages = Object.fromEntries((Object.keys(pageRoutes) as PageKey[]).map((key)=>[key,{ar:copy(designContent.ar[key]),fr:copy(designContent.fr[key]),en:copy(designContent.en[key])}])) as Record<PageKey,Record<'ar'|'fr'|'en',{title:string;body:string}>>;
export const developmentSettings = {
 ar: {commune_name:'أباينو تتواصل — نسخة تجريبية',public_address:'عنوان تجريبي غير رسمي — في انتظار الاعتماد',opening_hours:'أوقات تجريبية غير رسمية — في انتظار الاعتماد'},
 fr: {commune_name:'Abaynou Tatawasal — démonstration',public_address:'Adresse de démonstration non officielle — à approuver',opening_hours:'Horaires de démonstration non officiels — à approuver'},
 en: {commune_name:'Abaynou Tatawasal — development preview',public_address:'Non-official demonstration address — approval pending',opening_hours:'Non-official demonstration hours — approval pending'}
};
