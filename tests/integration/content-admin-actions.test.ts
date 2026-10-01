import {beforeEach,describe,expect,it,vi} from 'vitest';
import {randomBytes,randomUUID} from 'node:crypto';
import {developmentPages,developmentSettings} from '../../fixtures/public-content';
import {initialContentAdminState} from '../../src/features/content-admin/model';
const m=vi.hoisted(()=>({admin:vi.fn(),publish:vi.fn(),settings:vi.fn(),revalidate:vi.fn()}));
vi.mock('server-only',()=>({}));vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));vi.mock('@/server/auth/application-user',()=>({requireAdmin:m.admin}));vi.mock('@/server/content-admin/repository',()=>({publishAdminPage:m.publish,updateAdminSettings:m.settings}));
import {publishPageAction,updateSettingsAction} from '../../src/features/content-admin/actions';
const form=(values:Record<string,string>)=>{const data=new FormData();for(const [key,value] of Object.entries(values))data.set(key,value);return data;};
const pageForm=()=>{const values:Record<string,string>={locale:'en',pageKey:'HOME',revision:'2',commandKey:randomUUID()};for(const language of ['ar','fr','en'] as const){values[`${language}Title`]=developmentPages.HOME[language].title;values[`${language}Body`]=developmentPages.HOME[language].body;}return form(values);};
const settingsForm=()=>{const values:Record<string,string>={locale:'en',revision:'1',commandKey:randomUUID(),contactPhone:'+212 500 000 000',contactEmail:'public@example.invalid',chikayaUrl:'https://chikaya.ma/'};for(const language of ['ar','fr','en'] as const){values[`${language}CommuneName`]=developmentSettings[language].commune_name;values[`${language}PublicAddress`]=developmentSettings[language].public_address;values[`${language}OpeningHours`]=developmentSettings[language].opening_hours;}return form(values);};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('COMMAND_FINGERPRINT_SECRET',randomBytes(32).toString('hex'));m.admin.mockResolvedValue({role:'ADMIN'});});
describe('DEV-09 Server Actions',()=>{
 it('authorizes, publishes the complete bundle, and narrowly revalidates public routes',async()=>{m.publish.mockResolvedValue({revision:3});expect(await publishPageAction(initialContentAdminState,pageForm())).toEqual({status:'success',code:'success'});expect(m.admin).toHaveBeenCalledWith('en');expect(m.publish.mock.calls[0][1].bundle).toEqual(developmentPages.HOME);expect(m.revalidate).toHaveBeenCalledWith('/en');});
 it('maps stale publication without leaking database details',async()=>{m.publish.mockRejectedValue({code:'P0812',message:'private detail'});expect(await publishPageAction(initialContentAdminState,pageForm())).toEqual({status:'error',code:'conflict'});});
 it('updates only validated settings and maps unsafe input locally',async()=>{m.settings.mockResolvedValue({revision:2});expect((await updateSettingsAction(initialContentAdminState,settingsForm())).status).toBe('success');const unsafe=settingsForm();unsafe.set('chikayaUrl','javascript:alert(1)');expect(await updateSettingsAction(initialContentAdminState,unsafe)).toEqual({status:'error',code:'settingsInvalid'});expect(m.settings).toHaveBeenCalledTimes(1);});
});
