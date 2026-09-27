// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('../../src/features/complaints/actions',()=>({
 startProcessingAction:vi.fn(),issueResponseAction:vi.fn(),notAcceptAction:vi.fn(),correctResponseAction:vi.fn(),closeComplaintAction:vi.fn()
}));

import {LifecycleControls} from '../../src/features/complaints/components/lifecycle';

afterEach(cleanup);

describe('DEV-06 lifecycle confirmations',()=>{
 it('keeps the NOT_ACCEPTED confirmation a required label-connected checkbox',()=>{
  render(<LifecycleControls locale="ar" reference="AB-2345-6789-ABCD" revision={2} status="IN_PROCESSING"/>);
  const form=screen.getByRole('heading',{name:'عدم قبول الشكاية'}).closest('form');
  expect(form).not.toBeNull();
  const checkbox=within(form!).getByRole('checkbox',{name:'أؤكد إرسال هذا النص للمواطن.'});
  expect(checkbox).toBeRequired();
  expect(checkbox).not.toBeChecked();
  fireEvent.click(screen.getAllByText('أؤكد إرسال هذا النص للمواطن.').at(-1)!);
  expect(checkbox).toBeChecked();
  expect(checkbox.closest('label')).toHaveClass('complaint-confirm');
 });
});
