import {describe,it,expect} from 'vitest';
import {restrictedDatabaseOptions} from '../../src/shared/db/options';
describe('restricted database connections',()=>{
 it('retains local restricted roles and bounded pools',()=>{
  expect(restrictedDatabaseOptions('postgres://app_web@127.0.0.1:54322/postgres','app_web',{APP_ENV:'local'})).toMatchObject({max:5,ssl:false,prepare:true});
  expect(restrictedDatabaseOptions('postgres://app_mailer@127.0.0.1:55322/postgres','app_mailer',{APP_ENV:'e2e'})).toMatchObject({max:1,ssl:false});
 });
 it('accepts only the configured project role through the shared session pooler',()=>{
  const env={SUPABASE_URL:'https://testproject.supabase.co'};
  expect(restrictedDatabaseOptions('postgres://app_web.testproject@aws-1-eu.pooler.supabase.com:5432/postgres','app_web',env)).toMatchObject({ssl:'verify-full',prepare:false});
  expect(()=>restrictedDatabaseOptions('postgres://app_web.other@aws-1-eu.pooler.supabase.com:5432/postgres','app_web',env)).toThrow('Restricted');
 });
 it('rejects privileged identities and remote local/E2E targets',()=>{
  expect(()=>restrictedDatabaseOptions('postgres://postgres@127.0.0.1:54322/postgres','app_web',{})).toThrow('Restricted');
  expect(()=>restrictedDatabaseOptions('postgres://app_web@db.example.test:5432/postgres','app_web',{APP_ENV:'e2e'})).toThrow('loopback');
  expect(()=>restrictedDatabaseOptions('postgres://app_web@127.0.0.1:54322/postgres','app_web',{APP_ENV:'e2e'})).toThrow('port mismatch');
 });
 it('fails safely for the documented unsupported shared transaction mode',()=>{
  expect(()=>restrictedDatabaseOptions('postgres://app_web.testproject@aws-1-eu.pooler.supabase.com:6543/postgres','app_web',{SUPABASE_URL:'https://testproject.supabase.co'})).toThrow('transaction pooling');
 });
});
