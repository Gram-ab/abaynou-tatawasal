import {describe,it,expect,vi,beforeEach} from 'vitest';
vi.mock('server-only',()=>({}));
const {query}=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('@/shared/db/public',()=>({publicDatabase:()=>query}));
import {readPage,readSettings} from '../../src/features/public-content/repository';
beforeEach(()=>{query.mockReset();});
describe('persistence boundary failure handling',()=>{
 it('returns missing instead of fallback content',async()=>{query.mockResolvedValue([]);expect(await readPage('PRIVACY','fr')).toBeNull();});
 it('rejects internal metadata returned by a misconfigured projection',async()=>{query.mockResolvedValue([{title:'Test',body:'Test',audit_event_id:'private'}]);await expect(readPage('HOME','en')).rejects.toThrow();});
 it('rejects malformed public URL configuration',async()=>{query.mockResolvedValue([{contact_phone:null,contact_email:null,chikaya_url:'javascript:alert(1)',commune_name:'Demo',public_address:null,opening_hours:null}]);await expect(readSettings('en')).rejects.toThrow();});
 it('represents missing optional settings as unavailable',async()=>{query.mockResolvedValue([]);expect(await readSettings('ar')).toBeNull();});
 it('does not silently hide a database read failure with fixture content',async()=>{query.mockImplementation(()=>{throw new Error('Database unavailable');});await expect(readPage('TERMS','en')).rejects.toThrow('Database unavailable');});
 it('rejects unsupported locales before querying',async()=>{await expect(readPage('HOME','es')).rejects.toThrow();expect(query).not.toHaveBeenCalled();});
});
