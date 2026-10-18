import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
const m=vi.hoisted(()=>({factory:vi.fn(),query:vi.fn(),end:vi.fn(),smtp:vi.fn()}));
vi.mock('postgres',()=>({default:m.factory}));vi.mock('nodemailer',()=>({default:{createTransport:m.smtp}}));
import {checkWithRetry,failureCategory,probeLocalDatabase,type ProbeResult} from '../../src/server/monitoring/database';
import {assertLocalHealthConfiguration,localHealthAlertTransport} from '../../src/server/monitoring/local';
const database='postgres://app_web@127.0.0.1:54322/postgres';
const config='project_id = "Abaynou_Tatawasal"\n[db]\nport = 54322\n[local_smtp]\nsmtp_port = 54325';
const result=(status:'PASS'|'FAIL'):ProbeResult=>({status,category:status==='PASS'?'AVAILABLE':'UNREACHABLE',checkedAt:'2026-10-16T12:00:00.000Z',durationMs:5});
beforeEach(()=>{vi.resetAllMocks();m.factory.mockReturnValue(Object.assign(m.query,{end:m.end}));m.query.mockResolvedValue([{ready:true}]);m.end.mockResolvedValue(undefined);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
describe('local readiness probe',()=>{
 it('uses a single restricted, read-only connection and returns no settings payload',async()=>{
  const output=await probeLocalDatabase(database);expect(output.status).toBe('PASS');
  expect(m.factory).toHaveBeenCalledWith(database,expect.objectContaining({max:1,connect_timeout:3,connection:{application_name:'abaynou_local_health',statement_timeout:2000,default_transaction_read_only:true}}));
  expect(m.query).toHaveBeenCalledTimes(1);expect(m.query.mock.calls[0][0][0]).toBe("select current_setting('transaction_read_only')='on' and exists(select 1 from app.read_public_settings('ar')) as ready");
  expect(m.end).toHaveBeenCalledWith({timeout:1});expect(Object.keys(output).sort()).toEqual(['category','checkedAt','durationMs','status']);
 });
 it('reports missing canonical public settings as not ready',async()=>{m.query.mockResolvedValue([{ready:false}]);expect((await probeLocalDatabase(database)).category).toBe('NOT_READY');});
 it('classifies errors without exposing their credential-like message',async()=>{
  const privateValue=randomBytes(32).toString('hex');m.query.mockRejectedValue(Object.assign(new Error(privateValue),{code:'28P01'}));
  const output=await probeLocalDatabase(database);expect(output.category).toBe('AUTHORIZATION');expect(JSON.stringify(output).includes(privateValue)).toBe(false);
  expect(failureCategory({code:'57014'})).toBe('TIMEOUT');expect(failureCategory({code:'ECONNREFUSED'})).toBe('UNREACHABLE');expect(failureCategory(new Error(privateValue))).toBe('CHECK_FAILED');
 });
 it('destroys a stalled connection at the hard deadline',async()=>{
  vi.useFakeTimers();let rejectQuery!:(error:unknown)=>void;m.query.mockImplementation(()=>new Promise((_,reject)=>{rejectQuery=reject;}));
  m.end.mockImplementation(async()=>{rejectQuery({code:'CONNECTION_DESTROYED'});});
  const pending=probeLocalDatabase(database);await vi.advanceTimersByTimeAsync(6000);expect((await pending).category).toBe('TIMEOUT');expect(m.end).toHaveBeenCalledWith({timeout:0});
 });
 it('does not retry a successful read',async()=>{const probe=vi.fn().mockResolvedValue(result('PASS')),wait=vi.fn();expect((await checkWithRetry(probe,wait)).attempts).toBe(1);expect(probe).toHaveBeenCalledTimes(1);expect(wait).not.toHaveBeenCalled();});
 it('retries once and reports transient recovery without a false incident',async()=>{const probe=vi.fn().mockResolvedValueOnce(result('FAIL')).mockResolvedValueOnce(result('PASS')),wait=vi.fn();expect(await checkWithRetry(probe,wait)).toMatchObject({status:'PASS',attempts:2});expect(wait).toHaveBeenCalledWith(1000);expect(probe).toHaveBeenCalledTimes(2);});
 it('stops after two failed attempts',async()=>{const probe=vi.fn().mockResolvedValue(result('FAIL'));expect(await checkWithRetry(probe,vi.fn())).toMatchObject({status:'FAIL',attempts:2});expect(probe).toHaveBeenCalledTimes(2);});
});
describe('local-only execution boundary',()=>{
 it('accepts only the verified normal local restricted target',()=>{expect(assertLocalHealthConfiguration({APP_ENV:'local',DATABASE_URL:database},config,false)).toBe(database);});
 it('refuses hosted, owner-role, E2E, linked, overridden and wrong-database targets',()=>{
  for(const value of [database.replace('127.0.0.1','remote.invalid'),database.replace('app_web','postgres'),database.replace('54322','55322'),database+'?host=remote.invalid',database.replace('/postgres','/other')])expect(()=>assertLocalHealthConfiguration({APP_ENV:'local',DATABASE_URL:value},config,false)).toThrow('LOCAL_HEALTH_CONFIGURATION_INVALID');
  expect(()=>assertLocalHealthConfiguration({APP_ENV:'production',DATABASE_URL:database},config,false)).toThrow('LOCAL_HEALTH_CONFIGURATION_INVALID');
  expect(()=>assertLocalHealthConfiguration({APP_ENV:'local',DATABASE_URL:database},config,true)).toThrow('LOCAL_HEALTH_CONFIGURATION_INVALID');
  expect(()=>assertLocalHealthConfiguration({APP_ENV:'local',DATABASE_URL:database},config.replace('54325','587'),false)).toThrow('LOCAL_HEALTH_CONFIGURATION_INVALID');
 });
 it('ignores external SMTP configuration and uses bounded local Mailpit only',()=>{
  vi.stubEnv('SMTP_HOST','external.invalid');m.smtp.mockReturnValue({sendMail:vi.fn(),close:vi.fn()});const transport=localHealthAlertTransport();
  expect(m.smtp).toHaveBeenCalledWith(expect.objectContaining({host:'127.0.0.1',port:54325,connectionTimeout:3000,greetingTimeout:3000,socketTimeout:5000}));transport.close?.();
 });
});
