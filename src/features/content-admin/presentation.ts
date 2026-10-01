import {contentAdminCopy} from './copy';
import type {ContentAdminLocale} from './model';
export const settingsPresentation={
 ar:{unknown:'هوية الناشر غير متاحة',history:'سجل تغييرات الإعدادات',help:'يسجل هذا السجل من عدّل الإعدادات ومتى والحقول المعدلة. لا يحتفظ بنسخ كاملة من القيم السابقة.',nameHelp:'يظهر الاسم المحفوظ حسب اللغة في ترويسات الموقع والفضاءات وفي تذييل الموقع. لا يغيّر صورة الشعار أو النصوص المنشورة سابقاً.'},
 fr:{unknown:'Identité de publication indisponible',history:'Historique des modifications',help:'Cet historique indique qui a modifié les paramètres, quand et quels champs. Il ne conserve pas de copie complète des anciennes valeurs.',nameHelp:'Le nom enregistré apparaît dans les en-têtes du site et des espaces, ainsi que dans le pied de page, selon la langue. Il ne modifie ni l’image du logo ni les textes déjà publiés.'},
 en:{unknown:'Publisher identity unavailable',history:'Settings change history',help:'This history records who changed settings, when, and which fields changed. It does not retain complete snapshots of previous values.',nameHelp:'The saved name appears in site and account-space headers and the public footer for the selected language. It does not alter the logo image or previously published text.'}
};
export function publisherLabel(locale:ContentAdminLocale,name:string|null,actorType:string){return name??(actorType==='SYSTEM'?contentAdminCopy[locale].system:settingsPresentation[locale].unknown);}
const fieldLabels={
 ar:{contact_phone:'الهاتف العام',contact_email:'البريد الإلكتروني العام',chikaya_url:'رابط شكاية',commune_name:'اسم الجماعة/المنصة',public_address:'العنوان العام',opening_hours:'أوقات العمل'},
 fr:{contact_phone:'Téléphone public',contact_email:'Courriel public',chikaya_url:'Lien Chikaya',commune_name:'Nom Commune/plateforme',public_address:'Adresse publique',opening_hours:'Horaires d’ouverture'},
 en:{contact_phone:'Public phone',contact_email:'Public email',chikaya_url:'Chikaya link',commune_name:'Commune/platform name',public_address:'Public address',opening_hours:'Opening hours'}
};
const localeLabels={ar:{ar:'العربية',fr:'الفرنسية',en:'الإنجليزية'},fr:{ar:'arabe',fr:'français',en:'anglais'},en:{ar:'Arabic',fr:'French',en:'English'}};
export function settingsFieldLabel(locale:ContentAdminLocale,field:string){const [first,second]=field.split('.');if(second&&first in localeLabels[locale]&&second in fieldLabels[locale])return `${fieldLabels[locale][second as keyof typeof fieldLabels['en']]} (${localeLabels[locale][first as ContentAdminLocale]})`;return fieldLabels[locale][field as keyof typeof fieldLabels['en']]??field;}
