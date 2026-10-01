// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
vi.mock('next-intl',()=>({useLocale:()=> 'en'}));
vi.mock('@/shared/i18n/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/features/content-admin/actions',()=>({publishPageAction:vi.fn(),updateSettingsAction:vi.fn()}));
vi.mock('@/shared/ui/confirmation-dialog',()=>({ConfirmationDialog:()=>null}));
import {SafePreview} from '../../src/features/content-admin/components';
afterEach(cleanup);
describe('DEV-09 safe content preview',()=>{
 it('uses RTL for Arabic and renders only the constrained structure',()=>{render(<SafePreview language="ar" title="عنوان" body={'مقدمة\n\n## قسم\n\nنص آمن'}/>);const preview=screen.getByRole('article');expect(preview).toHaveAttribute('dir','rtl');expect(screen.getByRole('heading',{level:2,name:'عنوان'})).toBeVisible();expect(screen.getByRole('heading',{level:3,name:'قسم'})).toBeVisible();});
 it('escapes text rather than creating executable markup',()=>{render(<SafePreview language="en" title="Preview" body={'<script>window.bad=true</script>'}/>);expect(screen.getByText('<script>window.bad=true</script>')).toBeVisible();expect(document.querySelector('script')).toBeNull();});
});
