import {readFileSync} from 'node:fs';
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

// Public provider trust anchor, not a secret or private key.
const supabaseCa=readFileSync(new URL('../fixtures/supabase-root-ca.crt',import.meta.url),'utf8');
describe('hosted database certificate authority configuration',()=>{
 const target='postgres://app_web.testproject@aws-1-eu.pooler.supabase.com:5432/postgres';
 const env={APP_ENV:'staging',SUPABASE_URL:'https://testproject.supabase.co'};
 it('adds the supplied CA while keeping certificate rejection and pooler restrictions',()=>{
  expect(restrictedDatabaseOptions(target,'app_web',{...env,DATABASE_CA_CERT:supabaseCa})).toMatchObject({ssl:{ca:supabaseCa.trim(),rejectUnauthorized:true},prepare:false,max:5});
  expect(()=>restrictedDatabaseOptions(target.replace('app_web.testproject','postgres.testproject'),'app_web',{...env,DATABASE_CA_CERT:supabaseCa})).toThrow('Restricted');
 });
 it('accepts escaped newlines from protected environment settings',()=>{
  expect(restrictedDatabaseOptions(target,'app_web',{...env,DATABASE_CA_CERT:supabaseCa.replaceAll('\n','\\n')})).toMatchObject({ssl:{ca:supabaseCa.trim(),rejectUnauthorized:true}});
 });
 it('fails closed for malformed, empty, oversized or mixed PEM input without echoing it',()=>{
  for(const value of ['', 'not a certificate', 'x'.repeat(16385), supabaseCa+'unrelated data'])expect(()=>restrictedDatabaseOptions(target,'app_web',{...env,DATABASE_CA_CERT:value})).toThrow(/^Hosted database CA configuration invalid$/);
 });
 it('keeps local and disposable E2E connections unchanged even when a hosted CA is configured',()=>{
  expect(restrictedDatabaseOptions('postgres://app_web@127.0.0.1:54322/postgres','app_web',{APP_ENV:'local',DATABASE_CA_CERT:'unused'})).toMatchObject({ssl:false,prepare:true});
  expect(restrictedDatabaseOptions('postgres://app_mailer@127.0.0.1:55322/postgres','app_mailer',{APP_ENV:'e2e',DATABASE_CA_CERT:supabaseCa})).toMatchObject({ssl:false,max:1});
 });
});