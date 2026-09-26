// @vitest-environment jsdom
import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {NextIntlClientProvider} from 'next-intl';
import {messages} from '../../src/shared/i18n/messages';
import {State,Callout} from '../../src/shared/ui/primitives';
import {Header} from '../../src/shared/ui/header';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('@/shared/i18n/navigation',()=>({usePathname:()=>'/faq',Link:({href,children,locale,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>&{locale?:string})=><a href={`/${locale??'en'}${href}`} {...props}>{children}</a>}));
vi.mock('@/features/commune-auth/actions',()=>({staffLogout:vi.fn()}));
vi.mock('@/features/auth/actions',()=>({logoutAction:vi.fn()}));
afterEach(cleanup);
describe('public components',()=>{
 it('renders a semantic failure state without interpreting HTML',()=>{
  render(<State title="Unavailable"><p>{'<script>alert(1)</script>'}</p></State>);
  expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Unavailable');
  expect(document.querySelector('script')).toBeNull();
 },30000);
 it('renders callout as complementary information',()=>{render(<Callout>Development information</Callout>);expect(screen.getByRole('complementary')).toHaveTextContent('Development information');});
 for(const locale of ['ar','fr','en'] as const)it(`provides localized navigation and language links: ${locale}`,()=>{
  render(<NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Africa/Casablanca"><Header/></NextIntlClientProvider>);
  expect(screen.getByText(messages[locale].skip)).toHaveAttribute('href','#main');
  expect(screen.getByRole('navigation',{name:messages[locale].languages})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Français'})).toHaveAttribute('href','/fr/faq');
  const menu=screen.getByRole('button',{name:messages[locale].menu});
  fireEvent.click(menu);
  expect(menu).toHaveAttribute('aria-expanded','true');
  fireEvent.keyDown(document.getElementById('public-mobile-menu')!,{key:'Escape'});
  expect(menu).toHaveAttribute('aria-expanded','false');
 },30000);
});
