import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {canonicalComplaint,catalogueLabel,codePoints,complaintCommandSchema,complaintFieldsSchema,sortedCatalogue} from '../../src/features/complaints/model';
const input=()=>({categoryId:randomUUID(),locationId:randomUUID(),subject:' Original subject ',description:' Original description with sufficient text. ',locationClarification:''});
describe('complaint validation and preservation',()=>{
 it('counts astral characters as single code points',()=>{expect(codePoints('أ😀e\u0301')).toBe(4);expect(complaintFieldsSchema.safeParse({...input(),subject:'😀'.repeat(150)}).success).toBe(true);expect(complaintFieldsSchema.safeParse({...input(),subject:'😀'.repeat(151)}).success).toBe(false);});
 it('rejects blank subjects and short effective descriptions',()=>{expect(complaintFieldsSchema.safeParse({...input(),subject:'\u00a0\uFEFF\n'}).success).toBe(false);expect(complaintFieldsSchema.safeParse({...input(),description:'  '+'أ'.repeat(19)+'  '}).success).toBe(false);});
 it('enforces original rather than trimmed maximums',()=>{expect(complaintFieldsSchema.safeParse({...input(),subject:' '+'a'.repeat(150)}).success).toBe(false);expect(complaintFieldsSchema.safeParse({...input(),description:'😀'.repeat(2000)}).success).toBe(true);expect(complaintFieldsSchema.safeParse({...input(),description:'😀'.repeat(2001)}).success).toBe(false);});
 it('preserves authored whitespace, markup and combining characters',()=>{const value={...input(),subject:' <test> e\u0301 ',locationClarification:'  جنب المسجد  '};expect(canonicalComplaint(complaintFieldsSchema.parse(value))).toEqual(value);});
 it('maps only blank clarification to null',()=>{expect(canonicalComplaint({...input(),locationClarification:'\t\u00a0'}).locationClarification).toBeNull();expect(complaintFieldsSchema.safeParse({...input(),locationClarification:'😀'.repeat(301)}).success).toBe(false);});
 it('rejects text PostgreSQL cannot represent',()=>{for(const subject of ['a\0b','a\uD800b'])expect(complaintFieldsSchema.safeParse({...input(),subject}).success).toBe(false);});
 it('rejects injected authority and requires explicit confirmation',()=>{const value={...input(),commandKey:randomUUID(),locale:'ar',confirmed:true};expect(complaintCommandSchema.safeParse(value).success).toBe(true);expect(complaintCommandSchema.safeParse({...value,citizen_id:randomUUID()}).success).toBe(false);expect(complaintCommandSchema.safeParse({...value,confirmed:false}).success).toBe(false);});
 it('uses Arabic fallback without invented translations',()=>{expect(catalogueLabel({labels:{ar:'دوار أباينو'}},'fr')).toEqual({text:'دوار أباينو',language:'ar'});});
 it('sorts displayed labels with deterministic code ties',()=>{const items=[{id:'2',code:'B',labels:{ar:'ب',en:'Same'}},{id:'1',code:'A',labels:{ar:'أ',en:'Same'}}];expect(sortedCatalogue(items,'en').map(item=>item.code)).toEqual(['A','B']);expect(items[0].code).toBe('B');});
});
