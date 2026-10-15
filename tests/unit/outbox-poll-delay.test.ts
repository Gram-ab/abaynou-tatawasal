import {expect,it} from 'vitest';
import {outboxPollDelay} from '../../src/server/email/poll-delay';
it('backs off idle work to one minute and returns to five seconds after activity',()=>{
 let delay=2500;
 expect(Array.from({length:6},()=>delay=outboxPollDelay(delay,0))).toEqual([10000,20000,40000,60000,60000,60000]);
 expect(outboxPollDelay(delay,1)).toBe(5000);
 expect(outboxPollDelay(10000,0,5000)).toBe(5000);
});
