import {randomUUID} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import {disposablePassword} from '../support/disposable-password';
import {PromotionError,promoteHostedStaff,type PromotionTarget} from '../../scripts/hosted-staff-promotion';

function fixture(){
 const proof={authUserId:randomUUID(),providerSessionId:randomUUID(),confirmed:true};
 const target:PromotionTarget={profileId:randomUUID(),authUserId:randomUUID(),email:'agent@example.invalid',fullName:'Synthetic Agent',role:'AGENT',accessStatus:'ACTIVE',revision:3,confirmed:true,activationPending:false};
 const provider={authenticate:vi.fn().mockResolvedValue(proof),signOutLocal:vi.fn().mockResolvedValue(undefined)};
 const store={identity:vi.fn().mockResolvedValue({profileId:randomUUID(),role:'ADMIN',accessStatus:'ACTIVE'}),createSession:vi.fn().mockResolvedValue(true),target:vi.fn().mockImplementation(async()=>({...target})),promote:vi.fn().mockResolvedValue({role:'ADMIN',accessStatus:'ACTIVE',revision:4,authUserId:target.authUserId}),revokeSession:vi.fn().mockResolvedValue(undefined)};
 const confirm=vi.fn().mockResolvedValue(true),input={adminEmail:'admin@example.invalid',targetEmail:target.email,password:disposablePassword(),reason:'Approved additional administrator'};
 const run=()=>promoteHostedStaff(input,{provider,store,confirm});
 return {proof,target,provider,store,confirm,input,run};
}
function errorCode(code:string){return {name:'PromotionError',code};}
describe('hosted Admin promotion orchestration',()=>{
 it('uses the reviewed target/revision, a disposable CLI proof and mandatory reason; cleans up after success',async()=>{
  const f=fixture();expect((await f.run()).status).toBe('promoted');
  const call=f.store.promote.mock.calls[0];expect(call[1].profileId).toBe(f.target.profileId);expect(call[1].revision).toBe(3);expect(call[2]).toBe(f.input.reason);
  expect(f.store.createSession.mock.calls[0][0].digest.length).toBe(32);
  expect(f.store.revokeSession.mock.calls[0][0]===f.store.createSession.mock.calls[0][0]).toBe(true);
  expect(f.provider.signOutLocal.mock.calls.length).toBe(1);expect(f.store.target.mock.calls.length).toBe(2);
 });
 it('does not change a role when confirmation is declined',async()=>{const f=fixture();f.confirm.mockResolvedValue(false);expect((await f.run()).status).toBe('cancelled');expect(f.store.promote.mock.calls.length).toBe(0);expect(f.store.revokeSession.mock.calls.length).toBe(1);expect(f.provider.signOutLocal.mock.calls.length).toBe(1);});
 it('attempts provider cleanup after authentication fails',async()=>{const f=fixture();f.provider.authenticate.mockRejectedValue(new PromotionError('authentication'));await expect(f.run()).rejects.toMatchObject(errorCode('authentication'));expect(f.store.createSession.mock.calls.length).toBe(0);expect(f.provider.signOutLocal.mock.calls.length).toBe(1);});
 it('rejects an unverified provider identity',async()=>{const f=fixture();f.provider.authenticate.mockResolvedValue({...f.proof,confirmed:false});await expect(f.run()).rejects.toMatchObject(errorCode('authentication'));expect(f.store.identity.mock.calls.length).toBe(0);});
 it.each([{role:'CITIZEN',accessStatus:'ACTIVE'},{role:'AGENT',accessStatus:'ACTIVE'},{role:'ADMIN',accessStatus:'DISABLED'}])('rejects unauthorized actor $role/$accessStatus',async identity=>{const f=fixture();f.store.identity.mockResolvedValue(identity);await expect(f.run()).rejects.toMatchObject(errorCode('admin_required'));expect(f.store.createSession.mock.calls.length).toBe(0);expect(f.store.promote.mock.calls.length).toBe(0);});
 it.each([{activationPending:true},{confirmed:false},{accessStatus:'DISABLED'},{role:'ADMIN'},{role:'CITIZEN'}])('rejects an ineligible target %j',async change=>{const f=fixture();Object.assign(f.target,change);await expect(f.run()).rejects.toMatchObject(errorCode('target_ineligible'));expect(f.confirm.mock.calls.length).toBe(0);expect(f.store.promote.mock.calls.length).toBe(0);expect(f.store.revokeSession.mock.calls.length).toBe(1);});
 it('rejects a missing target without creating an account',async()=>{const f=fixture();f.store.target.mockResolvedValue(null);await expect(f.run()).rejects.toMatchObject(errorCode('target_ineligible'));expect(f.store.promote.mock.calls.length).toBe(0);});
 it('rejects changes after confirmation rather than using a new unreviewed revision',async()=>{const f=fixture();f.store.target.mockResolvedValueOnce({...f.target}).mockResolvedValueOnce({...f.target,revision:4});await expect(f.run()).rejects.toMatchObject(errorCode('conflict'));expect(f.store.promote.mock.calls.length).toBe(0);});
 it('rechecks activation after confirmation',async()=>{const f=fixture();f.store.target.mockResolvedValueOnce({...f.target}).mockResolvedValueOnce({...f.target,activationPending:true});await expect(f.run()).rejects.toMatchObject(errorCode('target_ineligible'));expect(f.store.promote.mock.calls.length).toBe(0);});
 it('rejects a confirmation after the fresh authentication window',async()=>{const f=fixture();let now=0;f.confirm.mockImplementation(async()=>{now=300001;return true;});await expect(promoteHostedStaff(f.input,{provider:f.provider,store:f.store,confirm:f.confirm,now:()=>now})).rejects.toMatchObject(errorCode('expired'));expect(f.store.promote.mock.calls.length).toBe(0);});
 it('keeps database revision conflicts fail-closed and does not retry',async()=>{const f=fixture();f.store.promote.mockRejectedValue({code:'40001'});await expect(f.run()).rejects.toMatchObject(errorCode('conflict'));expect(f.store.promote.mock.calls.length).toBe(1);expect(f.store.revokeSession.mock.calls.length).toBe(1);});
 it('cleans up even if application-session creation may have partially succeeded',async()=>{const f=fixture();f.store.createSession.mockRejectedValue(new Error('Synthetic connection failure'));await expect(f.run()).rejects.toMatchObject(errorCode('operation_failed'));expect(f.store.promote.mock.calls.length).toBe(0);expect(f.store.revokeSession.mock.calls.length).toBe(1);expect(f.provider.signOutLocal.mock.calls.length).toBe(1);});
 it('still signs out the provider when application cleanup fails after promotion',async()=>{const f=fixture();f.store.revokeSession.mockRejectedValue(new Error('Synthetic cleanup failure'));await expect(f.run()).rejects.toMatchObject(errorCode('promoted_cleanup_failed'));expect(f.store.promote.mock.calls.length).toBe(1);expect(f.provider.signOutLocal.mock.calls.length).toBe(1);});
 it('reports provider cleanup failure after cancellation',async()=>{const f=fixture();f.confirm.mockResolvedValue(false);f.provider.signOutLocal.mockRejectedValue(new Error('Synthetic cleanup failure'));await expect(f.run()).rejects.toMatchObject(errorCode('cleanup_failed'));expect(f.store.promote.mock.calls.length).toBe(0);});
 it.each(['short-password','missing-reason','same-email'])('rejects invalid input: %s',async kind=>{const f=fixture();if(kind==='short-password')f.input.password=disposablePassword(10);if(kind==='missing-reason')f.input.reason=' ';if(kind==='same-email')f.input.targetEmail=f.input.adminEmail;await expect(f.run()).rejects.toMatchObject(errorCode('invalid_input'));expect(f.provider.authenticate.mock.calls.length).toBe(0);});
});
