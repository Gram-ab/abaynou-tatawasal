// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {ComplaintList,ComplaintPagination,ComplaintTimeline,StatusBadge} from '../../src/features/complaints/components/tracking';
vi.mock('@/shared/i18n/navigation',()=>({Link:({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}));
afterEach(cleanup);
const item={reference:'AB-2345-6789-ABCD',category_labels:{ar:'الطرق',fr:'Voirie',en:'Roads'},location_labels:{ar:'دوار أباينو'},subject:'حفرة في الطريق',status:'SUBMITTED' as const,submitted_at:new Date('2026-09-27T10:00:00Z'),updated_at:new Date('2026-09-27T10:00:00Z'),revision:1,citizen_name:'Test Citizen'};
describe('DEV-05 complaint tracking UI',()=>{
 it('renders direction-safe references and Arabic fallback labels',()=>{render(<ComplaintList locale="fr" items={[item]}/>);expect(screen.getByText(item.reference)).toHaveAttribute('dir','ltr');expect(screen.getByText('دوار أباينو')).toHaveAttribute('lang','ar');expect(screen.getByText('Reçue')).toBeVisible();});
 it('uses the Commune detail destination and Citizen name only in staff list',()=>{render(<ComplaintList locale="en" items={[item]} staff/>);expect(screen.getByRole('link',{name:'View details'})).toHaveAttribute('href',`/commune/complaints/${item.reference}`);expect(screen.getByText('Test Citizen')).toBeVisible();expect(screen.queryByText(/@/)).toBeNull();});
 it('uses semantic table columns so row values share consistent alignment',()=>{render(<ComplaintList locale="en" items={[item]} staff/>);expect(screen.getByRole('table',{name:'Complaints'})).toBeVisible();expect(screen.getAllByRole('columnheader').map(cell=>cell.textContent)).toEqual(['Subject','Citizen','Location','Submitted','Status','View details']);});
 it('offers previous, next, and direct page selection for the Commune inbox',()=>{render(<ComplaintPagination locale="en" page={2} pageCount={4} params={{q:'road',status:'SUBMITTED',location:''}}/>);expect(screen.getByRole('link',{name:'Previous'})).toHaveAttribute('href',expect.stringContaining('page=1'));expect(screen.getByRole('link',{name:'Next'})).toHaveAttribute('href',expect.stringContaining('page=3'));expect(screen.getByRole('combobox',{name:'Page'})).toHaveValue('2');expect(screen.getByRole('button',{name:'Go'})).toBeVisible();});
 it('projects immutable events as a localized timeline',()=>{render(<ComplaintTimeline locale="en" events={[{revision:1,event_type:'SUBMITTED',previous_status:null,new_status:'SUBMITTED',occurred_at:item.submitted_at},{revision:2,event_type:'STATE_CHANGED',previous_status:'SUBMITTED',new_status:'UNDER_REVIEW',occurred_at:item.updated_at}]}/>);expect(screen.getByText('Complaint submitted')).toBeVisible();expect(screen.getByText('Under review')).toBeVisible();});
 it('exposes status text instead of color alone',()=>{render(<StatusBadge locale="ar" status="WITHDRAWN"/>);expect(screen.getByText('تم السحب')).toBeVisible();});
});
