import {describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {citizenStatusSchema} from '@/features/citizen-admin/model';
import {citizenAdminCopy} from '@/features/citizen-admin/copy';
import {disposablePassword} from '../support/disposable-password';

describe('DEV-10 Citizen administration model',()=>{
 const valid=()=>({locale:'ar',profileId:randomUUID(),revision:1,status:'DISABLED',reason:'سبب إداري',key:randomUUID(),currentPassword:disposablePassword()});
 it('requires a bounded Unicode-aware administrative reason and current password',()=>{
  expect(citizenStatusSchema.safeParse(valid()).success).toBe(true);
  expect(citizenStatusSchema.safeParse({...valid(),reason:'  '}).success).toBe(false);
  expect(citizenStatusSchema.safeParse({...valid(),reason:'🙂🙂🙂'}).success).toBe(true);
  expect(citizenStatusSchema.safeParse({...valid(),reason:'a'.repeat(1001)}).success).toBe(false);
  expect(citizenStatusSchema.safeParse({...valid(),currentPassword:''}).success).toBe(false);
 });
 it('accepts only status transitions and rejects bad identifiers',()=>{
  expect(citizenStatusSchema.safeParse({...valid(),status:'DELETED'}).success).toBe(false);
  expect(citizenStatusSchema.safeParse({...valid(),profileId:'wrong'}).success).toBe(false);
 });
 it('contains accessible action, confirmation, and warning copy in every locale',()=>{
  for(const locale of ['ar','fr','en'] as const){const copy=citizenAdminCopy[locale];expect([copy.disable,copy.enable,copy.confirmDisable,copy.confirmEnable,copy.providerSync,copy.retry].every(Boolean)).toBe(true);}
 });
});
