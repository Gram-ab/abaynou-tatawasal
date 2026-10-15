import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({factory:vi.fn(),query:vi.fn(),end:vi.fn(),send:vi.fn(),close:vi.fn()}));
vi.mock('postgres',()=>({default:m.factory}));
import {createEmailOutboxDrainer} from '../../src/server/email/outbox';
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('APP_ENV','local');vi.stubEnv('MAILER_DATABASE_URL','postgres://app_mailer@127.0.0.1:54322/postgres');
 vi.stubEnv('APP_ORIGIN','http://127.0.0.1:3000');vi.stubEnv('SMTP_HOST','127.0.0.1');vi.stubEnv('SMTP_PORT','54325');vi.stubEnv('MAIL_FROM','no-reply@example.test');
 m.factory.mockReturnValue(Object.assign(m.query,{end:m.end}));m.query.mockResolvedValue([]);
});
describe('reusable outbox worker',()=>{
 it('reuses one connection and closes resources once after multiple idle drains',async()=>{
  const worker=createEmailOutboxDrainer({transport:{send:m.send,close:m.close}});
  await worker.drain();await worker.drain();expect(m.factory).toHaveBeenCalledOnce();expect(m.query).toHaveBeenCalledTimes(2);
  expect(m.end).not.toHaveBeenCalled();await worker.close();expect(m.end).toHaveBeenCalledOnce();expect(m.close).toHaveBeenCalledOnce();
 });
 it('preserves completion fencing when a lease is no longer current',async()=>{
  m.query.mockResolvedValueOnce([{id:'job',event_type:'RECEIPT',language:'en',target_email:'citizen@example.test',reference:'AB-2345-6789-ABCD',lease_token:'lease'}]).mockResolvedValueOnce([{completed:false}]);
  const worker=createEmailOutboxDrainer({transport:{send:m.send,close:m.close}});
  try{expect(await worker.drain()).toMatchObject({claimed:1,sent:0,stale:1});}finally{await worker.close();}
 });
});
