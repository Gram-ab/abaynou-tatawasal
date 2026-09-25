import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({resolve:vi.fn(),identity:vi.fn(),secret:vi.fn(),headers:vi.fn()}));
vi.mock('server-only',()=>({}));vi.mock('next/headers',()=>({headers:mocks.headers}));vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`);}}));
vi.mock('@/server/auth/provider',()=>({verifiedProviderIdentity:mocks.identity}));vi.mock('@/server/sessions/cookie',()=>({readSessionSecret:mocks.secret,digestSessionSecret:()=>Buffer.alloc(32)}));vi.mock('@/server/identity/repository',()=>({resolveUserSession:mocks.resolve}));
import {currentApplicationUser,requireCitizen,requireCommuneStaff,requireAdmin,redirectAuthenticatedUser} from '../../src/server/auth/application-user';
const row={state:'VALID',role:'AGENT',session_id:'s',profile_id:'p',full_name:'Agent',preferred_language:'en',profile_revision:1,absolute_expires_at:'2026-09-22T22:00:00Z'};
beforeEach(()=>{vi.resetAllMocks();mocks.identity.mockResolvedValue({authUserId:'a',providerSessionId:'s',email:'local@example.test'});mocks.secret.mockResolvedValue('secret');mocks.headers.mockResolvedValue(new Headers());mocks.resolve.mockResolvedValue(row);});
describe('independent server-side role boundaries',()=>{
 it('does not accept provider authentication without application cookie',async()=>{mocks.secret.mockResolvedValue(null);await expect(requireCommuneStaff('en')).rejects.toThrow('REDIRECT:/en/commune/login');expect(mocks.resolve).not.toHaveBeenCalled();});
 it('does not accept a cookie without verified provider identity',async()=>{mocks.identity.mockResolvedValue(null);expect(await currentApplicationUser()).toBeNull();});
 it('denies Citizen before activity refresh',async()=>{mocks.resolve.mockResolvedValue({...row,role:'CITIZEN'});await expect(requireCommuneStaff('en',true)).rejects.toThrow('access-denied');expect(mocks.resolve).toHaveBeenCalledTimes(1);expect(mocks.resolve.mock.calls[0][3]).toBe(false);});
 it('redirects staff away from Citizen routes',async()=>{await expect(requireCitizen('fr')).rejects.toThrow('REDIRECT:/fr/commune');});
 it('rejects Agent at the Admin boundary',async()=>{await expect(requireAdmin('en')).rejects.toThrow('access-denied');});
 it('accepts actual database Admin role',async()=>{mocks.resolve.mockResolvedValue({...row,role:'ADMIN'});expect((await requireAdmin('en')).role).toBe('ADMIN');});
 for(const state of ['DISABLED','EXPIRED','REVOKED','STALE'])it(`fails closed for ${state}`,async()=>{mocks.resolve.mockResolvedValue({...row,state});await expect(requireCommuneStaff('ar')).rejects.toThrow('REDIRECT:/ar/commune/auth/end-session');});
 for(const header of ['purpose','sec-purpose','next-router-prefetch'])it(`does not refresh activity for ${header}`,async()=>{mocks.headers.mockResolvedValue(new Headers({[header]:header==='next-router-prefetch'?'1':'prefetch'}));await currentApplicationUser(true);expect(mocks.resolve.mock.calls[0][3]).toBe(false);});
 it('background resolution does not renew activity',async()=>{await currentApplicationUser();expect(mocks.resolve.mock.calls[0][3]).toBe(false);});
 it('rechecks invalidation during activity renewal',async()=>{mocks.resolve.mockResolvedValueOnce(row).mockResolvedValue({...row,state:'DISABLED'});await expect(requireCommuneStaff('en',true)).rejects.toThrow('end-session');});
});

describe('authenticated entry redirects',()=>{
 for(const role of ['CITIZEN','AGENT','ADMIN'])it(`redirects valid ${role} to its own space without renewing activity`,async()=>{mocks.resolve.mockResolvedValue({...row,role});await expect(redirectAuthenticatedUser('fr')).rejects.toThrow(`REDIRECT:/fr/${role==='CITIZEN'?'citizen':'commune'}`);expect(mocks.resolve.mock.calls[0][3]).toBe(false);});
 for(const state of ['DISABLED','EXPIRED','REVOKED','STALE','INCOMPLETE'])it(`does not redirect or revive ${state} sessions`,async()=>{mocks.resolve.mockResolvedValue({...row,state});await expect(redirectAuthenticatedUser('en')).resolves.toBeUndefined();expect(mocks.resolve.mock.calls[0][3]).toBe(false);});
 it('leaves anonymous visitors on the login page',async()=>{mocks.secret.mockResolvedValue(null);await expect(redirectAuthenticatedUser('ar')).resolves.toBeUndefined();expect(mocks.identity).not.toHaveBeenCalled();});
 it('does not trust provider identity without an application session',async()=>{mocks.resolve.mockResolvedValue(null);await expect(redirectAuthenticatedUser('en')).resolves.toBeUndefined();});
 it('fails closed if session verification fails',async()=>{mocks.resolve.mockRejectedValue(new Error('Database unavailable'));await expect(redirectAuthenticatedUser('en')).rejects.toThrow('Database unavailable');});
});
