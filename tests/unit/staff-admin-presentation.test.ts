import {describe,it,expect} from 'vitest';
import {staffStatusLabel,staffAuditLabel} from '@/features/staff-admin/presentation';
describe('staff display state and localized audit',()=>{
 it('keeps unverified invitations pending and disabled accounts disabled',()=>{
  expect(staffStatusLabel('en',{access_status:'ACTIVE',email_confirmed_at:null})).toBe('Invitation pending');
  expect(staffStatusLabel('en',{access_status:'ACTIVE',email_confirmed_at:new Date(),activation_pending:true})).toBe('Invitation pending');
  expect(staffStatusLabel('en',{access_status:'ACTIVE',email_confirmed_at:new Date()})).toBe('Active');
  expect(staffStatusLabel('en',{access_status:'DISABLED',email_confirmed_at:null})).toBe('Disabled');
 });
 it('localizes audit actions and security operations without exposing raw codes',()=>{
  expect(staffAuditLabel('ar','STAFF_CREATED')).toBe('تم إنشاء حساب الموظف');
  expect(staffAuditLabel('ar','AUDIT_ACCESSED')).toBe('تم الاطلاع على السجل');
  expect(staffAuditLabel('fr','ACCOUNT_SECURITY_CHANGED',{operation:'INVITATION_EMAIL_CORRECTED'})).toBe('Courriel d’invitation corrigé');
 });
});
