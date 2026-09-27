import {beforeEach,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
const redirectError=(url:string)=>Object.assign(new Error(url),{url});
const m=vi.hoisted(()=>({actor:vi.fn(),open:vi.fn(),markAll:vi.fn(),redirect:vi.fn((url:string)=>{throw Object.assign(new Error(url),{url});}),revalidate:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({redirect:m.redirect}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
vi.mock('@/server/auth/application-user',()=>({currentApplicationUser:m.actor}));
vi.mock('@/server/notifications/repository',()=>({openOwnNotification:m.open,markAllOwnNotificationsRead:m.markAll}));
import {markAllNotificationsReadAction,openNotificationAction} from '../../src/features/notifications/actions';

const form=(id:string=randomUUID())=>{const value=new FormData();value.set('locale','fr');value.set('notification',id);return value;};
beforeEach(()=>{vi.resetAllMocks();m.redirect.mockImplementation((url:string)=>{throw redirectError(url);});m.actor.mockResolvedValue({state:'VALID',role:'CITIZEN'});});
describe('notification action boundaries',()=>{
 it('validates notification identifiers before lookup',async()=>{await expect(openNotificationAction(form('invalid'))).rejects.toMatchObject({url:'/fr/citizen/notifications?state=unavailable'});expect(m.open).not.toHaveBeenCalled();});
 for(const role of ['AGENT','ADMIN'])it(`denies ${role} from Citizen notification actions`,async()=>{m.actor.mockResolvedValue({state:'VALID',role});await expect(openNotificationAction(form())).rejects.toMatchObject({url:'/fr/login?reason=authentication-required'});expect(m.open).not.toHaveBeenCalled();});
 it('marks the owned notification, refreshes shared state, and uses its authorized complaint reference',async()=>{m.open.mockResolvedValue({reference:'AB-2345-6789-ABCD',changed:true});await expect(openNotificationAction(form())).rejects.toMatchObject({url:'/fr/citizen/complaints/AB-2345-6789-ABCD'});expect(m.open).toHaveBeenCalledOnce();expect(m.revalidate).toHaveBeenCalledWith('/fr/citizen','layout');});
 it('does not navigate to a guessed notification',async()=>{m.open.mockResolvedValue(null);await expect(openNotificationAction(form())).rejects.toMatchObject({url:'/fr/citizen/notifications?state=unavailable'});});
 it('marks all, refreshes shared state, and returns to the center',async()=>{await expect(markAllNotificationsReadAction(form())).rejects.toMatchObject({url:'/fr/citizen/notifications'});expect(m.markAll).toHaveBeenCalledOnce();expect(m.revalidate).toHaveBeenCalledWith('/fr/citizen','layout');});
});
