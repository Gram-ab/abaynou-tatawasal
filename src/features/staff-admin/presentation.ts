import {staffAdminCopy,type StaffAdminLocale} from './copy';
export function staffStatusLabel(locale:StaffAdminLocale,staff:{access_status:string;email_confirmed_at:Date|null;activation_pending?:boolean}) {
 const c=staffAdminCopy[locale];
 return staff.access_status==='DISABLED'?c.disabled:staff.email_confirmed_at&&!staff.activation_pending?c.active:c.unused;
}
const auditLabels={
 ar:{AUDIT_ACCESSED:'تم الاطلاع على السجل',STAFF_CREATED:'تم إنشاء حساب الموظف',STAFF_UPDATED:'تم تحديث بيانات الموظف',ROLE_CHANGED:'تم تغيير الصلاحية',ACCOUNT_DISABLED:'تم تعطيل الحساب',ACCOUNT_ENABLED:'تم إعادة تنشيط الحساب',ACCOUNT_SECURITY_CHANGED:'تم تحديث أمان الحساب',RECOVERY_INITIATED:'تم طلب استعادة الحساب',INVITATION_EMAIL_CORRECTED:'تم تصحيح بريد الدعوة',EMAIL_CHANGE:'تم تغيير البريد الإلكتروني'},
 fr:{AUDIT_ACCESSED:'Consultation du dossier',STAFF_CREATED:'Compte du personnel créé',STAFF_UPDATED:'Profil du personnel modifié',ROLE_CHANGED:'Rôle modifié',ACCOUNT_DISABLED:'Compte désactivé',ACCOUNT_ENABLED:'Compte réactivé',ACCOUNT_SECURITY_CHANGED:'Sécurité du compte modifiée',RECOVERY_INITIATED:'Récupération demandée',INVITATION_EMAIL_CORRECTED:'Courriel d’invitation corrigé',EMAIL_CHANGE:'Courriel modifié'},
 en:{AUDIT_ACCESSED:'Account record viewed',STAFF_CREATED:'Staff account created',STAFF_UPDATED:'Staff profile updated',ROLE_CHANGED:'Role changed',ACCOUNT_DISABLED:'Account disabled',ACCOUNT_ENABLED:'Account reactivated',ACCOUNT_SECURITY_CHANGED:'Account security updated',RECOVERY_INITIATED:'Recovery requested',INVITATION_EMAIL_CORRECTED:'Invitation email corrected',EMAIL_CHANGE:'Email changed'}
};
export function staffAuditLabel(locale:StaffAdminLocale,action:string,summary?:unknown){
 const operation=summary&&typeof summary==='object'&&'operation' in summary?String(summary.operation):action;
 const labels:Record<string,string>=auditLabels[locale];
 return labels[operation]??labels[action]??labels.ACCOUNT_SECURITY_CHANGED;
}
