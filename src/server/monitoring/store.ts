import {randomUUID} from 'node:crypto';
import {mkdir,open,readFile,rename,stat,unlink,appendFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {initialMonitorState,monitorStateSchema,type MonitorState} from './alerts';
import type {HealthResult} from './database';

export class MonitorStorageError extends Error{
 constructor(readonly code:'MONITOR_BUSY'|'MONITOR_STORAGE_UNAVAILABLE'){super(code);}
}
const isMissing=(error:unknown)=>Boolean(error&&typeof error==='object'&&'code' in error&&error.code==='ENOENT');
export type HistoryEntry={check:HealthResult;alerts:'disabled'|'accepted'|'not-needed'|'failed';accepted:number};
export type MonitorStore={read():Promise<MonitorState>;write(state:MonitorState):Promise<void>;append(entry:HistoryEntry):Promise<void>};
export async function withLocalMonitorStore<T>(directory:string,run:(store:MonitorStore)=>Promise<T>):Promise<T>{
 try{await mkdir(directory,{recursive:true,mode:0o700});}catch{throw new MonitorStorageError('MONITOR_STORAGE_UNAVAILABLE');}
 const lock=join(directory,'run.lock');let handle:Awaited<ReturnType<typeof open>>;
 try{handle=await open(lock,'wx',0o600);}catch(error){throw new MonitorStorageError(error&&typeof error==='object'&&'code' in error&&error.code==='EEXIST'?'MONITOR_BUSY':'MONITOR_STORAGE_UNAVAILABLE');}
 const statePath=join(directory,'state.json'),historyPath=join(directory,'history.ndjson');
 const store:MonitorStore={
  async read(){try{
   if((await stat(statePath)).size>32768)throw new Error('Oversized state');
   return monitorStateSchema.parse(JSON.parse(await readFile(statePath,'utf8')));
  }catch(error){if(isMissing(error))return initialMonitorState();throw new MonitorStorageError('MONITOR_STORAGE_UNAVAILABLE');}},
  async write(state){const temporary=join(directory,`.state-${randomUUID()}.tmp`);try{
   await writeFile(temporary,JSON.stringify(monitorStateSchema.parse(state))+'\n',{mode:0o600,flag:'wx'});
   await rename(temporary,statePath);
  }catch{throw new MonitorStorageError('MONITOR_STORAGE_UNAVAILABLE');}finally{await unlink(temporary).catch(()=>{});}},
  async append(entry){try{
   const size=await stat(historyPath).then(value=>value.size).catch(error=>{if(isMissing(error))return 0;throw error;});
   if(size>=262144)await rename(historyPath,join(directory,'history.previous.ndjson'));
   await appendFile(historyPath,JSON.stringify(entry)+'\n',{mode:0o600});
  }catch{throw new MonitorStorageError('MONITOR_STORAGE_UNAVAILABLE');}}
 };
 try{
  await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  return await run(store);
 }finally{await handle.close();await unlink(lock);}
}
