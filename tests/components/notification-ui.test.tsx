// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {NextIntlClientProvider} from 'next-intl';
import {NotificationBell} from '../../src/features/notifications/components/bell';
import {NotificationCenter} from '../../src/features/notifications/components/center';
import {messages} from '../../src/shared/i18n/messages';
vi.mock('@/shared/i18n/navigation',()=>({usePathname:()=>'/citizen',useRouter:()=>({refresh:vi.fn()}),Link:({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}));
vi.mock('@/features/notifications/actions',()=>({openNotificationAction:vi.fn(),markAllNotificationsReadAction:vi.fn()}));
afterEach(cleanup);
const provider=(child:React.ReactNode,locale:'ar'|'fr'|'en'='en')=><NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Africa/Casablanca">{child}</NextIntlClientProvider>;
describe('notification UI',()=>{
 it('announces unread count while keeping the numeric badge decorative',()=>{const {container}=render(provider(<NotificationBell initial={{changeRevision:1,lastSequence:4,unreadCount:4}}/>));expect(screen.getByRole('link',{name:'4 unread notifications'})).toHaveAttribute('href','/citizen/notifications');expect(container.querySelector('.notification-badge')).toHaveAttribute('aria-hidden','true');});
 it('renders an explicit empty state',()=>{render(<NotificationCenter locale="en" items={[]} unread={0}/>);expect(screen.getByText('You do not have any notifications yet.')).toBeVisible();expect(screen.queryByRole('button',{name:'Mark all as read'})).toBeNull();});
 it('distinguishes read and unread without relying on color',()=>{render(<NotificationCenter locale="en" unread={1} items={[{id:'b4b1142b-53cb-4558-8779-195ae135c4c1',type:'COMPLAINT_RECEIVED',reference:'AB-2345-6789-ABCD',recipientSequence:1,createdAt:new Date('2026-09-26T12:00:00Z'),readAt:null},{id:'72886069-c40e-479e-9711-a562b6b4ad04',type:'COMPLAINT_RECEIVED',reference:'AB-2345-6789-ABCE',recipientSequence:2,createdAt:new Date('2026-09-26T12:01:00Z'),readAt:new Date('2026-09-26T12:02:00Z')}]}/>);expect(screen.getByText('Unread')).toBeVisible();expect(screen.getByText('Read')).toBeVisible();expect(screen.getByRole('button',{name:'Mark all as read'})).toBeVisible();});
 it('renders the localized retry state',()=>{render(<NotificationCenter locale="ar" items={[]} unread={0} error/>);expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل الإشعارات');expect(screen.getByRole('link',{name:'إعادة المحاولة'})).toHaveAttribute('href','/citizen/notifications');});
 it('renders staff event copy and Commune deep-link actions',()=>{render(<NotificationCenter locale="en" area="commune" unread={2} items={[{id:'b4b1142b-53cb-4558-8779-195ae135c4c1',type:'NEW_COMPLAINT',reference:'AB-2345-6789-ABCD',recipientSequence:1,createdAt:new Date('2026-09-27T12:00:00Z'),readAt:null},{id:'72886069-c40e-479e-9711-a562b6b4ad04',type:'COMPLAINT_WITHDRAWN',reference:'AB-2345-6789-ABCE',recipientSequence:2,createdAt:new Date('2026-09-27T12:01:00Z'),readAt:null}]}/>);expect(screen.getByText('New complaint')).toBeVisible();expect(screen.getByText('Complaint withdrawn')).toBeVisible();expect(screen.getAllByRole('button',{name:/Open complaint/})).toHaveLength(2);});
});
