import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {assertIsolatedE2EConfig,e2eTarget} from '../../scripts/e2e-target';

describe('disposable E2E target guard',()=>{
 it('rejects the owner review project configuration',()=>{
  expect(()=>assertIsolatedE2EConfig(readFileSync('supabase/config.toml','utf8'))).toThrow('not isolated');
 });
 it('rejects missing explicit target selection before reading credentials',()=>{
  const previous=process.env.ABAYNOU_E2E_TARGET;delete process.env.ABAYNOU_E2E_TARGET;
  try{expect(()=>e2eTarget()).toThrow('explicit disposable E2E target required');}
  finally{if(previous===undefined)delete process.env.ABAYNOU_E2E_TARGET;else process.env.ABAYNOU_E2E_TARGET=previous;}
 });
 it('accepts only the dedicated project identity and ports',()=>{
  const original=readFileSync('supabase/config.toml','utf8');
  const isolated=original.replace('project_id = "Abaynou_Tatawasal"','project_id = "Abaynou_Tatawasal_E2E"').replaceAll('54321','55321').replaceAll('54322','55322').replaceAll('54324','55324').replaceAll('54325','55325').replaceAll('3000','55300');
  expect(()=>assertIsolatedE2EConfig(isolated)).not.toThrow();
  expect(()=>assertIsolatedE2EConfig(isolated.replace('port = 55322','port = 54322'))).toThrow('not isolated');
 });
});
