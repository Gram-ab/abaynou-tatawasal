import {afterEach,describe,it,expect} from 'vitest';
import {mkdtemp,rm,writeFile,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {withLocalMonitorStore} from '../../src/server/monitoring/store';
import {initialMonitorState} from '../../src/server/monitoring/alerts';
const directories:string[]=[];
async function temporary(){const directory=await mkdtemp(join(tmpdir(),'abaynou-health-'));directories.push(directory);return directory;}
afterEach(async()=>{for(const directory of directories.splice(0)){if(!resolve(directory).startsWith(resolve(tmpdir())+sep+'abaynou-health-'))throw new Error('Unsafe test cleanup target');await rm(directory,{recursive:true,force:true});}});
describe('local monitor persistence and concurrency',()=>{
 it('persists independent state and releases its lock after a run',async()=>{
  const directory=await temporary();await withLocalMonitorStore(directory,async store=>{expect(await store.read()).toEqual(initialMonitorState());await store.write(initialMonitorState());});
  await withLocalMonitorStore(directory,async store=>expect(await store.read()).toEqual(initialMonitorState()));
 });
 it('rejects overlapping runs before invoking their probe or sender',async()=>{
  const directory=await temporary();let release!:()=>void,entered!:()=>void;const started=new Promise<void>(resolve=>{entered=resolve;});
  const first=withLocalMonitorStore(directory,async()=>{entered();await new Promise<void>(resolve=>{release=resolve;});});await started;
  try{await expect(withLocalMonitorStore(directory,async()=>{throw new Error('Must not enter');})).rejects.toMatchObject({code:'MONITOR_BUSY'});}finally{release();await first;}
 });
 it('fails closed on malformed state instead of silently losing incident history',async()=>{
  const directory=await temporary();await writeFile(join(directory,'state.json'),'{broken');
  await expect(withLocalMonitorStore(directory,store=>store.read())).rejects.toMatchObject({code:'MONITOR_STORAGE_UNAVAILABLE'});expect(await readFile(join(directory,'state.json'),'utf8')).toBe('{broken');
 });
 it('bounds private history growth by rotating the previous log',async()=>{
  const directory=await temporary();await writeFile(join(directory,'history.ndjson'),'x'.repeat(262144));
  await withLocalMonitorStore(directory,store=>store.append({check:{status:'PASS',category:'AVAILABLE',checkedAt:'2026-10-16T12:00:00.000Z',durationMs:5,attempts:1},alerts:'disabled',accepted:0}));
  expect((await stat(join(directory,'history.previous.ndjson'))).size).toBe(262144);expect((await stat(join(directory,'history.ndjson'))).size).toBeLessThan(1024);
 });
});
