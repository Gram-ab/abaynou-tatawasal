import {describe,it,expect,vi} from 'vitest';
import {initialMonitorState,localAlertEmail,observeHealth,recordNoticeAccepted,type MonitorState} from '../../src/server/monitoring/alerts';
import {runLocalMonitor} from '../../src/server/monitoring/run';
import type {HealthResult} from '../../src/server/monitoring/database';
import type {MonitorStore} from '../../src/server/monitoring/store';
const check=(status:'PASS'|'FAIL',time='2026-10-16T12:00:00.000Z'):HealthResult=>({status,category:status==='PASS'?'AVAILABLE':'UNREACHABLE',checkedAt:time,durationMs:10,attempts:status==='PASS'?1:2});
function memoryStore(){let state=initialMonitorState();return {read:vi.fn(async()=>state),write:vi.fn(async(next:MonitorState)=>{state=structuredClone(next);}),append:vi.fn(async()=>{})} satisfies MonitorStore;}
describe('independent local incident handling',()=>{
 it('queues one failure and does not duplicate it on repeated failures',()=>{const first=observeHealth(initialMonitorState(),check('FAIL')),again=observeHealth(first,check('FAIL'));expect(first.pending.map(item=>item.kind)).toEqual(['FAILURE']);expect(again.pending).toEqual(first.pending);});
 it('allows at most one accepted reminder per 24 hours and one recovery notice',()=>{
  let state=observeHealth(initialMonitorState(),check('FAIL'));state=recordNoticeAccepted(state,state.pending[0].id,'2026-10-16T12:00:00.000Z');
  expect(observeHealth(state,check('FAIL','2026-10-17T11:59:59.000Z')).pending).toHaveLength(0);
  state=observeHealth(state,check('FAIL','2026-10-17T12:00:00.000Z'));expect(state.pending.map(item=>item.kind)).toEqual(['REMINDER']);
  expect(observeHealth(state,check('FAIL','2026-10-17T13:00:00.000Z')).pending).toHaveLength(1);
  state=recordNoticeAccepted(state,state.pending[0].id,'2026-10-17T13:00:00.000Z');expect(observeHealth(state,check('FAIL','2026-10-18T12:59:59.000Z')).pending).toHaveLength(0);
  state=observeHealth(state,check('PASS','2026-10-18T13:00:00.000Z'));expect(state.incident).toBeNull();expect(state.pending.map(item=>item.kind)).toEqual(['RECOVERY']);
  expect(observeHealth(state,check('PASS','2026-10-18T14:00:00.000Z')).pending).toEqual(state.pending);
 });
 it('drops obsolete failure and reminder emails after recovery',()=>{
  const unsent=observeHealth(initialMonitorState(),check('FAIL'));expect(observeHealth(unsent,check('PASS')).pending).toEqual([]);
  let sent=recordNoticeAccepted(unsent,unsent.pending[0].id,'2026-10-16T12:00:00.000Z');sent=observeHealth(sent,check('FAIL','2026-10-17T13:00:00.000Z'));
  expect(observeHealth(sent,check('PASS','2026-10-17T14:00:00.000Z')).pending.map(item=>item.kind)).toEqual(['RECOVERY']);
 });
 it('sends nothing without the explicit local transport',async()=>{const store=memoryStore(),output=await runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('FAIL')),wait:vi.fn()});expect(output.alerts).toBe('disabled');expect(output.accepted).toEqual([]);expect((await store.read()).pending).toHaveLength(1);});
 it('can send a local failure while the database probe is unavailable',async()=>{
  const store=memoryStore(),send=vi.fn().mockResolvedValue(undefined),output=await runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('FAIL')),wait:vi.fn(),transport:{send},now:()=>new Date('2026-10-16T12:00:00.000Z')});
  expect(output).toMatchObject({alerts:'accepted',accepted:['FAILURE']});expect(send).toHaveBeenCalledOnce();expect(send.mock.calls[0][0]).toMatchObject({to:'operator@abaynou.test'});expect((await store.read()).pending).toEqual([]);
  await runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('FAIL')),wait:vi.fn(),transport:{send}});expect(send).toHaveBeenCalledOnce();
 });
 it('sends one recovery after an accepted failure and suppresses later success mail',async()=>{
  const store=memoryStore(),send=vi.fn().mockResolvedValue(undefined),transport={send};
  await runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('FAIL')),wait:vi.fn(),transport,now:()=>new Date('2026-10-16T12:00:00.000Z')});
  expect((await runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('PASS','2026-10-16T13:00:00.000Z')),transport})).accepted).toEqual(['RECOVERY']);
  expect((await runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('PASS','2026-10-16T14:00:00.000Z')),transport})).alerts).toBe('not-needed');expect(send).toHaveBeenCalledTimes(2);
 });
 it('retains a failed SMTP notice and retries with its persisted message ID',async()=>{
  const store=memoryStore(),probe=vi.fn().mockResolvedValue(check('FAIL')),send=vi.fn().mockRejectedValueOnce(new Error('private transport diagnostic')).mockResolvedValue(undefined);
  expect((await runLocalMonitor({store,probe,wait:vi.fn(),transport:{send}})).alerts).toBe('failed');const pending=(await store.read()).pending[0];
  expect((await runLocalMonitor({store,probe,wait:vi.fn(),transport:{send}})).alerts).toBe('accepted');expect(send.mock.calls[0][0].messageId).toBe(send.mock.calls[1][0].messageId);expect(pending.id).toBeTruthy();
 });
 it('does not send unless planned notification state has been persisted',async()=>{
  const store=memoryStore(),send=vi.fn();store.write.mockRejectedValue(new Error('private filesystem diagnostic'));
  await expect(runLocalMonitor({store,probe:vi.fn().mockResolvedValue(check('FAIL')),wait:vi.fn(),transport:{send}})).rejects.toThrow();expect(send).not.toHaveBeenCalled();
 });
 it('recovers without sending an incident when the immediate retry succeeds',async()=>{const store=memoryStore(),send=vi.fn(),probe=vi.fn().mockResolvedValueOnce(check('FAIL')).mockResolvedValueOnce(check('PASS'));expect((await runLocalMonitor({store,probe,wait:vi.fn(),transport:{send}})).alerts).toBe('not-needed');expect(send).not.toHaveBeenCalled();});
 it('produces privacy-minimal local templates and stable retry identities',()=>{
  const notice=observeHealth(initialMonitorState(),check('FAIL')).pending[0],email=localAlertEmail(notice);expect(email.to).toBe('operator@abaynou.test');expect(email.subject).toContain('[LOCAL]');expect(email.messageId).toBe(localAlertEmail(notice).messageId);expect(email.text).toContain('UNREACHABLE');expect(email.text).not.toContain('postgres://');
 });
});
