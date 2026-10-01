import {beforeEach,describe,expect,it,vi} from 'vitest';
import {randomBytes,randomUUID} from 'node:crypto';
import {disposablePassword} from '../support/disposable-password';
import {initialCitizenAdminState} from '@/features/citizen-admin/model';

const m=vi.hoisted(()=>({admin:vi.fn(),signIn:vi.fn(),signOut:vi.fn(),setStatus:vi.fn(),read:vi.fn(),provider:vi.fn(),revalidate:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
vi.mock('@/server/auth/application-user',()=>({requireAdmin:m.admin}));
vi.mock('@/server/auth/provider',()=>({isolatedProviderClient:()=>({auth:{signInWithPassword:m.signIn,signOut:m.signOut}})}));
vi.mock('@/server/auth/staff-admin-provider',()=>({setProviderEnabled:m.provider}));
vi.mock('@/server/citizen-admin/repository',()=>({setCitizenStatus:m.setStatus,readCitizen:m.read}));
import {changeCitizenStatus,retryCitizenProviderSync} from '@/features/citizen-admin/actions';
const id=randomUUID(),password=disposablePassword();
function form(values:Record<string,string>={}){const data=new FormData();for(const [key,value] of Object.entries({locale:'en',profileId:id,revision:'3',status:'DISABLED',reason:'Security review',key:randomUUID(),currentPassword:password,...values}))data.set(key,value);return data;}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('COMMAND_FINGERPRINT_SECRET',randomBytes(32).toString('hex'));m.admin.mockResolvedValue({authUserId:randomUUID(),email:'admin@example.invalid'});m.signIn.mockImplementation(async()=>({data:{user:{id:(await m.admin.mock.results[0].value).authUserId}},error:null}));m.signOut.mockResolvedValue({error:null});m.setStatus.mockResolvedValue({authUserId:randomUUID(),status:'DISABLED',revision:4,replayed:false});m.read.mockResolvedValue({authUserId:randomUUID(),status:'DISABLED',revision:4});m.provider.mockResolvedValue({error:null});});
describe('DEV-10 Citizen status actions',()=>{
 it('validates, reauthenticates Admin, commits status, and synchronizes provider',async()=>{
  expect(await changeCitizenStatus(initialCitizenAdminState,form())).toEqual({status:'success',code:'success',revision:4});
  expect(m.setStatus).toHaveBeenCalledOnce();expect(m.provider).toHaveBeenCalledWith(expect.any(String),false);
 });
 it('returns a typed provider warning without rolling back authoritative status',async()=>{
  m.provider.mockResolvedValue({error:new Error('unavailable')});
  expect(await changeCitizenStatus(initialCitizenAdminState,form())).toEqual({status:'warning',code:'providerSync',revision:4});
  expect(m.setStatus).toHaveBeenCalledOnce();
 });
 it('rejects bad reason before auth and invalid Admin password before mutation',async()=>{
  expect((await changeCitizenStatus(initialCitizenAdminState,form({reason:' '}))).code).toBe('invalid');expect(m.admin).not.toHaveBeenCalled();
  m.signIn.mockResolvedValue({data:{user:null},error:new Error('invalid')});
  expect((await changeCitizenStatus(initialCitizenAdminState,form())).code).toBe('reauth');expect(m.setStatus).not.toHaveBeenCalled();
 });
 it('reconciles provider to the current database status',async()=>{
  m.read.mockResolvedValue({authUserId:randomUUID(),status:'ACTIVE',revision:5});
  const request=new FormData();request.set('locale','en');request.set('profileId',id);
  expect((await retryCitizenProviderSync(initialCitizenAdminState,request)).status).toBe('success');
  expect(m.provider).toHaveBeenCalledWith(expect.any(String),true);
 });
});
