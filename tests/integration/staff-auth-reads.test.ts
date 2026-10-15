import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({query:vi.fn(),getUserById:vi.fn(),listUsers:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/server/auth/provider',()=>({staffAdminConfiguration:()=>({url:'http://127.0.0.1:55321',key:'disposable-test-key'})}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{admin:{getUserById:m.getUserById,listUsers:m.listUsers}}})}));
vi.mock('@/shared/db/public',()=>({publicDatabase:()=>m.query}));
import {findStaffByEmail,findInvitedStaff,staffActivationStates} from '../../src/server/auth/staff-admin-provider';
import type {ApplicationUser} from '../../src/server/auth/application-user';
const actor={authUserId:'admin',providerSessionId:'session',digest:Buffer.alloc(32)} as ApplicationUser;
beforeEach(()=>vi.resetAllMocks());
describe('targeted Admin Auth reads',()=>{
 it('uses the exact guarded identity beyond any Auth listing page',async()=>{
  m.query.mockResolvedValue([{auth_user_id:'late-staff-id'}]);m.getUserById.mockResolvedValue({data:{user:{id:'late-staff-id'}},error:null});
  expect((await findStaffByEmail(actor,'staff@example.test'))?.id).toBe('late-staff-id');
  expect(m.getUserById).toHaveBeenCalledWith('late-staff-id');expect(m.listUsers).not.toHaveBeenCalled();
 });
 it('fails closed before provider access when Admin authorization fails',async()=>{
  m.query.mockRejectedValue(new Error('Denied'));
  await expect(findStaffByEmail(actor,'staff@example.test')).rejects.toThrow('Denied');
  expect(m.getUserById).not.toHaveBeenCalled();
 });
 it('does not reinterpret unrelated Auth accounts as staff invitations',async()=>{
  m.query.mockResolvedValue([{auth_user_id:'citizen'}]);m.getUserById.mockResolvedValue({data:{user:{id:'citizen',user_metadata:{}}},error:null});
  expect(await findInvitedStaff(actor,'citizen@example.test')).toBeNull();
 });
 it('does no directory work for an empty staff page',async()=>{
  expect(await staffActivationStates(actor,[])).toEqual(new Map());expect(m.query).not.toHaveBeenCalled();expect(m.listUsers).not.toHaveBeenCalled();
 });
});
