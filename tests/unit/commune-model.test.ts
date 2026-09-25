import {disposablePassword,lowercasePassphrase,unicodePassword} from '../support/disposable-password';
import {describe,it,expect} from 'vitest';
import {staffPassword,staffResetSchema,staffReturnTo,staffLanguageSchema,isStaff} from '../../src/features/commune-auth/model';
import {signupSchema} from '../../src/features/auth/model';
describe('Commune credential and input boundaries',()=>{
 it('counts Unicode characters, not UTF-16 units',()=>{expect(staffPassword.safeParse(unicodePassword(14)).success).toBe(false);expect(staffPassword.safeParse(unicodePassword(15)).success).toBe(true);});
 it('allows lowercase passphrases and spaces without composition rules',()=>{expect(staffPassword.safeParse(lowercasePassphrase()).success).toBe(true);});
 it('rejects short and excessive passwords',()=>{expect(staffPassword.safeParse(disposablePassword(14)).success).toBe(false);expect(staffPassword.safeParse(disposablePassword(1025)).success).toBe(false);});
 it('requires matching confirmation',()=>{expect(staffResetSchema.safeParse({password:lowercasePassphrase(),confirmation:disposablePassword()}).success).toBe(false);});
 it('permits only explicit staff roles',()=>{expect(isStaff('AGENT')).toBe(true);expect(isStaff('ADMIN')).toBe(true);expect(isStaff('CITIZEN')).toBe(false);expect(isStaff('admin')).toBe(false);});
 it('allowlists return destinations exactly',()=>{for(const path of ['https://evil.test','//evil.test','/en/commune/../citizen','/en/commune?next=https://evil.test','/fr/commune','/en/commune/admin'])expect(staffReturnTo(path,'en')).toBe('/en/commune');expect(staffReturnTo('/en/commune/account','en')).toBe('/en/commune/account');});
 it('accepts only supported language and positive revision',()=>{expect(staffLanguageSchema.safeParse({language:'de',revision:1}).success).toBe(false);expect(staffLanguageSchema.safeParse({language:'fr',revision:0}).success).toBe(false);});
 it('preserves the Citizen ten-character policy',()=>{expect(signupSchema.shape.password.safeParse(disposablePassword(10)).success).toBe(true);});
});
