import {disposablePassword} from '../support/disposable-password';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({entry:vi.fn(),provider:vi.fn(),isolated:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/server/auth/application-user',()=>({redirectAuthenticatedUser:m.entry,currentApplicationUser:vi.fn(),requireCommuneStaff:vi.fn()}));
vi.mock('@/server/auth/provider',()=>({providerClient:m.provider,isolatedProviderClient:m.isolated,verifiedProviderIdentity:vi.fn(),appOrigin:()=> 'http://127.0.0.1:3000'}));
import {loginAction,signupAction} from '../../src/features/auth/actions';
import {staffLogin} from '../../src/features/commune-auth/actions';
beforeEach(()=>vi.resetAllMocks());
describe('stale entry forms cannot switch an active application session',()=>{
 for(const role of ['CITIZEN','AGENT','ADMIN'])for(const [name,action] of [['Citizen login',loginAction],['Citizen signup',signupAction],['staff login',staffLogin]] as const)it(`${role}: ${name} stops before provider mutation`,async()=>{
  const destination=role==='CITIZEN'?'/en/citizen':'/en/commune';m.entry.mockImplementation(async()=>{throw new Error(`REDIRECT:${destination}`);});
  const form=new FormData();for(const [key,value]of Object.entries({locale:'en',email:'other@example.test',password:disposablePassword(),fullName:'Other User',phone:'',accepted:'on',termsVersionId:'10000000-0000-4000-8000-000000000001',privacyVersionId:'10000000-0000-4000-8000-000000000002'}))form.set(key,value);
  await expect(action({status:'idle'},form)).rejects.toThrow(`REDIRECT:${destination}`);expect(m.entry).toHaveBeenCalledWith('en');expect(m.provider.mock.calls.length).toBe(0);expect(m.isolated.mock.calls.length).toBe(0);
 });
});
