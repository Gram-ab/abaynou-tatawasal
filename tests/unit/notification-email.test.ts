import {describe,expect,it,vi} from 'vitest';
import {notificationCopy} from '../../src/features/notifications/copy';
import {notificationCursorSchema,notificationIdSchema} from '../../src/features/notifications/model';
import {receiptEmail} from '../../src/server/email/templates';
import {deliveryFailure,smtpTransport} from '../../src/server/email/smtp';

describe('DEV-04B notification and receipt-email model',()=>{
 it('provides localized notification copy in Arabic, French, and English',()=>{for(const locale of ['ar','fr','en'] as const){expect(notificationCopy[locale].received).toBeTruthy();expect(notificationCopy[locale].unread(2)).toContain('2');}});
 it('accepts safe sequence cursors and UUID notification identifiers',()=>{expect(notificationCursorSchema.parse('42')).toBe(42);expect(notificationCursorSchema.safeParse('0').success).toBe(false);expect(notificationIdSchema.safeParse('not-an-id').success).toBe(false);});
 for(const language of ['ar','fr','en'] as const)it(`${language} receipt is localized, minimal, and deep-links through authentication`,()=>{
  const email=receiptEmail({language,reference:'AB-2345-6789-ABCD',origin:'http://127.0.0.1:3000'});
  expect(email.html).toContain(`lang="${language}"`);expect(email.html).toContain(language==='ar'?'dir="rtl"':'dir="ltr"');
  expect(email.text).toContain('AB-2345-6789-ABCD');expect(email.link).toContain(`/${language}/login?returnTo=`);expect(decodeURIComponent(email.link)).toContain(`/${language}/citizen/complaints/AB-2345-6789-ABCD`);
  for(const privateValue of ['private complaint description','private subject','location clarification','+212600000000'])expect(email.html+email.text).not.toContain(privateValue);
 });
 it('classifies permanent and uncertain SMTP failures without exposing payloads',()=>{expect(deliveryFailure({responseCode:550})).toEqual({retryable:false,uncertain:false});expect(deliveryFailure({code:'ETIMEDOUT'})).toEqual({retryable:true,uncertain:true});expect(deliveryFailure({command:'DATA'})).toEqual({retryable:true,uncertain:true});});
 it('uses the provider-independent SMTP adapter',async()=>{
  const sendMail=vi.fn().mockResolvedValue({messageId:'accepted'}),close=vi.fn();
  const createTransport=vi.spyOn((await import('nodemailer')).default,'createTransport').mockReturnValue({sendMail,close} as never);
  try{const transport=smtpTransport({host:'127.0.0.1',port:54325,secure:false});await transport.send({to:'citizen@example.test',from:'no-reply@example.test',subject:'Receipt',text:'Text',html:'<p>Text</p>',messageId:'<fixed@example.test>'});transport.close?.();expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({pool:true}));expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({messageId:'<fixed@example.test>'}));expect(close).toHaveBeenCalled();}finally{createTransport.mockRestore();}
 });
});
