// @vitest-environment jsdom
import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {NextIntlClientProvider} from 'next-intl';
import {messages} from '../../src/shared/i18n/messages';
import {CitizenHeader} from '../../src/features/citizen-account/components/citizen-header';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('@/shared/i18n/navigation',()=>({usePathname:()=>'/citizen',Link:({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}));
vi.mock('@/features/auth/actions',()=>({logoutAction:vi.fn()}));
vi.mock('@/features/commune-auth/actions',()=>({staffLogout:vi.fn()}));
afterEach(cleanup);
function mount(locale:'ar'|'fr'|'en'='fr'){return render(<NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Africa/Casablanca"><CitizenHeader name="Review Citizen"/></NextIntlClientProvider>);}
describe('Citizen dashboard header',()=>{
 for(const locale of ['ar','fr','en'] as const)it(`${locale}: only approved active navigation, clickable account name`,()=>{const {container}=mount(locale);const nav=container.querySelector('.citizen-nav')!;expect(nav.querySelectorAll('a')).toHaveLength(3);expect(nav.querySelector('a[href="/citizen/account"]')).toBeNull();const trigger=screen.getByRole('button',{name:'Review Citizen'});expect(trigger).toHaveAttribute('aria-expanded','false');fireEvent.click(trigger);expect(trigger).toHaveAttribute('aria-expanded','true');const panel=document.getElementById(trigger.getAttribute('aria-controls')!)!;expect(within(panel).getByRole('link')).toHaveAttribute('href','/citizen/account');expect(within(panel).getByRole('button')).toHaveAttribute('type','submit');expect(nav.querySelector('a[href="/citizen/complaints"]')).toBeNull();});
 it('Escape closes account disclosure and returns focus',()=>{mount();const trigger=screen.getByRole('button',{name:'Review Citizen'});fireEvent.click(trigger);fireEvent.keyDown(document,{key:'Escape'});expect(trigger).toHaveAttribute('aria-expanded','false');expect(trigger).toHaveFocus();});
 it('outside pointer and focus leaving dismiss dropdown',()=>{mount();const trigger=screen.getByRole('button',{name:'Review Citizen'});fireEvent.click(trigger);fireEvent.pointerDown(document.body);expect(trigger).toHaveAttribute('aria-expanded','false');fireEvent.click(trigger);fireEvent.blur(trigger,{relatedTarget:document.body});expect(trigger).toHaveAttribute('aria-expanded','false');});
 it('language links remain available in the compact control',()=>{mount();const trigger=screen.getByRole('button',{name:'Langue'});fireEvent.click(trigger);const panel=document.getElementById(trigger.getAttribute('aria-controls')!)!;expect(within(panel).getAllByRole('link')).toHaveLength(3);});
 it('mobile menu supports Escape, outside click and account-name link',()=>{const {container}=mount();const trigger=container.querySelector('.hamb')!;fireEvent.click(trigger);expect(trigger).toHaveAttribute('aria-expanded','true');expect(container.querySelector('.citizen-mobile-account')).toHaveTextContent('Review Citizen');fireEvent.keyDown(document,{key:'Escape'});expect(trigger).toHaveAttribute('aria-expanded','false');expect(trigger).toHaveFocus();fireEvent.click(trigger);fireEvent.pointerDown(document.body);expect(trigger).toHaveAttribute('aria-expanded','false');});
});
