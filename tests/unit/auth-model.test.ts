import {describe,expect,it} from 'vitest';
import {normalizePhone,safeReturnTo,signupSchema} from '../../src/features/auth/model';

const base={fullName:'Citizen',email:'citizen@example.test',phone:'',locale:'en',termsVersionId:'11111111-1111-4111-8111-111111111111',privacyVersionId:'22222222-2222-4222-8222-222222222222',accepted:'on'};
describe('Citizen authentication input policy',()=>{
 it('accepts 10 Unicode characters without composition rules',()=>{
  expect(signupSchema.safeParse({...base,password:'عبارة عربية'}).success).toBe(true);
  expect(signupSchema.safeParse({...base,password:'onlyletters'}).success).toBe(true);
  expect(signupSchema.safeParse({...base,password:'مساحة آمنة'}).success).toBe(true);
 });
 it('rejects nine Unicode characters and extremely obvious passwords',()=>{
  expect(signupSchema.safeParse({...base,password:'123456789'}).success).toBe(false);
  for(const value of ['1234567890','qwerty12345','password'])expect(signupSchema.safeParse({...base,password:value}).success).toBe(false);
 });
 it('normalizes explicit international phone forms without guessing a country',()=>{
  expect(normalizePhone('00 212 600-000-001')).toBe('+212600000001');
  expect(normalizePhone('٠٦ ٠٠ ٠٠ ٠٠ ٠١')).toBe('0600000001');
  expect(normalizePhone('')).toBeNull();
 });
 it('allows only locale-scoped Citizen return destinations',()=>{
  expect(safeReturnTo('/en/citizen/account','en')).toBe('/en/citizen/account');
  for(const value of ['https://evil.test','//evil.test','/fr/citizen','/%2f%2fevil.test'])expect(safeReturnTo(value,'en')).toBe('/en/citizen');
 });
});
