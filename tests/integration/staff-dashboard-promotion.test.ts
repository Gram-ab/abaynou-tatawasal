import {beforeEach,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {disposablePassword} from '../support/disposable-password';
const m=vi.hoisted(()=>({admin:vi.fn(),signin:vi.fn(),signout:vi.fn(),promote:vi.fn(),revalidate:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
vi.mock('@/server/auth/application-user',()=>({requireAdmin:m.admin}));
vi.mock('@/server/auth/provider',()=>({isolatedProviderClient:()=>({auth:{signInWithPassword:m.signin,signOut:m.signout}})}));
vi.mock('@/server/staff/promotion',()=>({promoteAgentAuthority:m.promote}));
import {promoteAgent} from '@/features/staff-admin/promotion-actions';
const actor={authUserId:randomUUID(),profileId:randomUUID(),sessionId:randomUUID(),email:'admin@example.test'},target=randomUUID();
function form(changes:Record<string,string>={}){const value=new FormData();Object.entries({locale:'en',profileId:target,revision:'4',email:'agent@example.test',reason:'Approved account administration responsibilities',currentPassword:disposablePassword(),confirmed:'on',...changes}).forEach(([k,v])=>value.set(k,v));return value;}
const submit=(changes?:Record<string,string>)=>promoteAgent({status:'idle'},form(changes));
beforeEach(()=>{vi.resetAllMocks();m.admin.mockResolvedValue(actor);m.signin.mockResolvedValue({error:null,data:{session:{},user:{id:actor.authUserId,email_confirmed_at:new Date().toISOString()}}});m.signout.mockResolvedValue({error:null});m.promote.mockResolvedValue(undefined);});
describe('dashboard promotion security boundary',()=>{
 it('requires a reason, acknowledgement and valid target before authentication',async()=>{for(const changes of ([{confirmed:''},{reason:'x'},{profileId:'invalid'},{revision:'0'}] as Record<string,string>[]))expect((await submit(changes)).code).toBe('invalid');expect(m.admin).not.toHaveBeenCalled();expect(m.promote).not.toHaveBeenCalled();});
 it('does not accept a caller-supplied actor email or authority',async()=>{const input=form();input.set('actorEmail','intruder@example.test');input.set('role','ADMIN');expect((await promoteAgent({status:'idle'},input)).status).toBe('success');expect(m.signin.mock.calls[0][0].email==='admin@example.test').toBe(true);expect(m.promote).toHaveBeenCalledWith(actor,{id:target,email:'agent@example.test',revision:4,reason:'Approved account administration responsibilities'});expect(m.signout).toHaveBeenCalledWith({scope:'local'});expect(m.revalidate).toHaveBeenCalledWith('/en/commune/staff');});
 it('refuses a non-Admin session before password verification',async()=>{m.admin.mockRejectedValue(new Error('denied'));await expect(submit()).rejects.toThrow('denied');expect(m.signin).not.toHaveBeenCalled();expect(m.promote).not.toHaveBeenCalled();});
 it('rejects self-targeting',async()=>{expect((await submit({profileId:actor.profileId})).code).toBe('ineligible');expect(m.signin).not.toHaveBeenCalled();});
 it('rejects a wrong password without changing permissions',async()=>{m.signin.mockResolvedValue({error:{},data:{session:null,user:null}});expect((await submit()).code).toBe('reauth');expect(m.promote).not.toHaveBeenCalled();});
 it.each(['wrong-user','unconfirmed','no-session'])('rejects incomplete or mismatched password proof: %s',async mode=>{m.signin.mockResolvedValue({error:null,data:{session:mode==='no-session'?null:{},user:{id:mode==='wrong-user'?randomUUID():actor.authUserId,email_confirmed_at:mode==='unconfirmed'?null:'confirmed'}}});expect((await submit()).code).toBe('reauth');expect(m.promote).not.toHaveBeenCalled();if(mode!=='no-session')expect(m.signout).toHaveBeenCalledWith({scope:'local'});});
 it('sanitizes provider failures',async()=>{m.signin.mockRejectedValue(new Error('private provider diagnostic'));expect(await submit()).toEqual({status:'error',code:'reauth'});});
 it('fails closed if reauthentication-session cleanup fails',async()=>{m.signout.mockResolvedValue({error:{}});expect((await submit()).code).toBe('failed');expect(m.promote).not.toHaveBeenCalled();});
 it('rechecks Admin authorization after reauthentication',async()=>{m.admin.mockResolvedValueOnce(actor).mockRejectedValueOnce(new Error('revoked'));await expect(submit()).rejects.toThrow('revoked');expect(m.signout).toHaveBeenCalled();expect(m.promote).not.toHaveBeenCalled();});
 it('rejects a different application session after reauthentication',async()=>{m.admin.mockResolvedValueOnce(actor).mockResolvedValueOnce({...actor,sessionId:randomUUID()});expect((await submit()).code).toBe('conflict');expect(m.promote).not.toHaveBeenCalled();});
 it.each([['40001','conflict'],['23514','ineligible'],['42501','failed'],['unknown','failed']])('sanitizes mutation errors %s',async(code,expected)=>{m.promote.mockRejectedValue(Object.assign(new Error('private detail'),{code}));expect(await submit()).toEqual({status:'error',code:expected});expect(m.revalidate).not.toHaveBeenCalled();expect(m.promote).toHaveBeenCalledTimes(1);});
});
