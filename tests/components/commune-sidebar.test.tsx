// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {NextIntlClientProvider} from 'next-intl';
import {messages} from '../../src/shared/i18n/messages';
import {CommuneShell} from '../../src/features/commune-auth/shell';

let pathname='/commune';
vi.mock('@/shared/i18n/navigation',()=>({
 usePathname:()=>pathname,
 Link:({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>
}));
vi.mock('@/shared/ui/header',()=>({Brand:()=> <span>Brand</span>}));
vi.mock('@/features/notifications/components/bell',()=>({NotificationBell:()=>null}));
vi.mock('@/features/commune-auth/actions',()=>({staffLogout:vi.fn()}));
afterEach(cleanup);

const notifications={changeRevision:0,lastSequence:0,unreadCount:0};
function activeLink(role:'ADMIN'|'AGENT',path:string,locale:'ar'|'fr'|'en'){
 pathname=path;
 const {container,unmount}=render(
  <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Africa/Casablanca">
   <CommuneShell name="Test Staff" role={role} notifications={notifications}><p>Page</p></CommuneShell>
  </NextIntlClientProvider>
 );
 const active=Array.from(container.querySelectorAll('.commune-sidebar nav a[aria-current="page"]'));
 const hrefs=active.map(link=>link.getAttribute('href'));
 unmount();
 return hrefs;
}

describe('Commune sidebar active route',()=>{
 it('marks only the current Admin section, including detail pages',()=>{
  for(const [path,expected] of [
   ['/commune','/commune'],
   ['/commune/complaints','/commune/complaints'],
   ['/commune/complaints/AB-1234-5678-ABCD','/commune/complaints'],
   ['/commune/staff/member','/commune/staff'],
   ['/commune/citizens/member','/commune/citizens'],
   ['/commune/catalogues/categories/item','/commune/catalogues/categories'],
   ['/commune/catalogues/locations/item','/commune/catalogues/locations'],
   ['/commune/settings/pages/HOME','/commune/settings'],
   ['/commune/account/password','/commune/account']
  ])expect(activeLink('ADMIN',path,'ar'),path).toEqual([expected]);
 });
 it('marks only the current Agent section and selects the nested password link',()=>{
  for(const [path,expected] of [
   ['/commune','/commune'],
   ['/commune/complaints/AB-1234-5678-ABCD','/commune/complaints'],
   ['/commune/account','/commune/account'],
   ['/commune/account/password','/commune/account/password']
  ])expect(activeLink('AGENT',path,'fr'),path).toEqual([expected]);
 });
});