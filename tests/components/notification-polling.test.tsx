// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,render} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {NextIntlClientProvider} from 'next-intl';
import {NotificationBell} from '../../src/features/notifications/components/bell';
import {messages} from '../../src/shared/i18n/messages';
const m=vi.hoisted(()=>({router:{refresh:vi.fn()}}));
vi.mock('@/shared/i18n/navigation',()=>({usePathname:()=>'/citizen',useRouter:()=>m.router,Link:({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('coalesces simultaneous focus events, updates the badge, and aborts on unmount',async()=>{
 vi.spyOn(document,'hidden','get').mockReturnValue(false);
 let finish!:(value:Response)=>void;
 const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 const {container,unmount}=render(<NextIntlClientProvider locale="en" messages={messages.en} timeZone="Africa/Casablanca"><NotificationBell initial={{changeRevision:1,lastSequence:2,unreadCount:2}}/></NextIntlClientProvider>);
 act(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'));});
 expect(fetcher).toHaveBeenCalledOnce();
 await act(async()=>{finish({ok:true,json:async()=>({changeRevision:2,lastSequence:2,unreadCount:1})} as Response);});
 expect(container.querySelector('.notification-badge')).toHaveTextContent('1');
 const signal=(fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].signal;
 unmount();expect(signal?.aborted).toBe(true);
});
it('does not poll hidden pages or extend application activity',()=>{
 vi.spyOn(document,'hidden','get').mockReturnValue(true);
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 render(<NextIntlClientProvider locale="en" messages={messages.en} timeZone="Africa/Casablanca"><NotificationBell initial={{changeRevision:0,lastSequence:0,unreadCount:0}}/></NextIntlClientProvider>);
 act(()=>window.dispatchEvent(new Event('focus')));expect(fetcher).not.toHaveBeenCalled();
});
