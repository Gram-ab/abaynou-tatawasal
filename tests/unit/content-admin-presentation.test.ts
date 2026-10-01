import {describe,it,expect} from 'vitest';
import {publisherLabel,settingsFieldLabel,settingsPresentation} from '../../src/features/content-admin/presentation';
import {contentAdminCopy} from '../../src/features/content-admin/copy';
describe('publication attribution',()=>{
 for(const locale of ['ar','fr','en'] as const)it(`distinguishes system publications and unavailable publishers in ${locale}`,()=>{
  expect(publisherLabel(locale,'Review Admin','USER')).toBe('Review Admin');
  expect(publisherLabel(locale,null,'SYSTEM')).toBe(contentAdminCopy[locale].system);
  expect(publisherLabel(locale,null,'USER')).toBe(settingsPresentation[locale].unknown);
  expect(settingsFieldLabel(locale,'contact_phone')).not.toContain('_');
  expect(settingsFieldLabel(locale,'ar.commune_name')).not.toContain('_');
 });
});
