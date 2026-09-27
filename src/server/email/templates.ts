export type ReceiptLocale='ar'|'fr'|'en';
const text={
 ar:{subject:'تم استلام شكايتك — أباينو تتواصل',heading:'تم استلام شكايتك',body:'تم استلام شكايتك بنجاح. يمكنك الاطلاع على وصلها ومتابعتها بشكل خاص بعد تسجيل الدخول.',status:'الحالة: تم الاستلام',action:'تسجيل الدخول وفتح الشكاية'},
 fr:{subject:'Votre réclamation a été reçue — Abaynou Tatawasal',heading:'Votre réclamation a été reçue',body:'Votre réclamation a bien été reçue. Connectez-vous pour consulter son reçu et la suivre en privé.',status:'Statut : Reçue',action:'Se connecter et ouvrir la réclamation'},
 en:{subject:'Your complaint was received — Abaynou Tatawasal',heading:'Your complaint was received',body:'Your complaint was received successfully. Sign in to view its receipt and follow it privately.',status:'Status: Received',action:'Sign in and open complaint'}
} as const;
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function receiptEmail(input:{language:ReceiptLocale;reference:string;origin:string}){
 const copy=text[input.language],direction=input.language==='ar'?'rtl':'ltr';
 const complaintPath=`/${input.language}/citizen/complaints/${input.reference}`;
 const link=`${input.origin}/${input.language}/login?returnTo=${encodeURIComponent(complaintPath)}`;
 const reference=escapeHtml(input.reference),safeLink=escapeHtml(link);
 return {subject:copy.subject,text:`${copy.heading}\n\n${copy.body}\n${copy.status}\n${input.reference}\n\n${copy.action}: ${link}`,
  html:`<!doctype html><html lang="${input.language}" dir="${direction}"><body style="margin:0;background:#f7f3eb;color:#22302a;font-family:Arial,sans-serif"><main style="max-width:620px;margin:0 auto;padding:32px"><div style="background:#fff;border:1px solid #d9dfdc;padding:32px"><p style="color:#17644d;font-weight:700">Abaynou Tatawasal · أباينو تتواصل</p><h1 style="color:#17644d;font-size:26px">${copy.heading}</h1><p>${copy.body}</p><p><strong>${copy.status}</strong></p><p dir="ltr" style="font:700 18px monospace">${reference}</p><p><a href="${safeLink}" style="display:inline-block;background:#17644d;color:#fff;text-decoration:none;padding:12px 18px">${copy.action}</a></p></div></main></body></html>`,link};
}
