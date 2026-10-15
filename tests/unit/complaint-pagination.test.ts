import {describe,it,expect} from 'vitest';
import {paginationItems} from '../../src/features/complaints/pagination';
describe('Complaint page links',()=>{
 it('offers neighboring, first and last destinations without allocating the whole result set',()=>{
  expect(paginationItems(5000,10000)).toEqual([1,'gap-before',4999,5000,5001,'gap-after',10000]);
  expect(paginationItems(1,10000)).toEqual([1,2,3,4,5,'gap-after',10000]);
  expect(paginationItems(10000,10000)).toEqual([1,'gap-before',9996,9997,9998,9999,10000]);
 });
 it('keeps every destination available for short sets and clamps stale requested pages',()=>{
  expect(paginationItems(3,4)).toEqual([1,2,3,4]);
  expect(paginationItems(99,3)).toEqual([1,2,3]);
  expect(paginationItems(0,0)).toEqual([1]);
 });
});
