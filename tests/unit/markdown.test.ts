import {describe,it,expect} from 'vitest';
import {parsePublicBody} from '../../src/features/public-content/markdown';
import {developmentPages} from '../../fixtures/public-content';
import {publicationSchema} from '../../src/features/public-content/model';
describe('constrained publication content',()=>{
 it('separates introductory copy and FAQ sections',()=>{
  expect(parsePublicBody('Intro\n\n## Question?\n\nAnswer.')).toEqual({introduction:['Intro'],sections:[{heading:'Question?',paragraphs:['Answer.']}]});
 });
 it('keeps executable-looking content as plain text for escaped rendering',()=>{
  expect(parsePublicBody('[x](javascript:alert(1))').introduction).toEqual(['[x](javascript:alert(1))']);
 });
 it('validates all nine development bundles',()=>{
  expect(Object.keys(developmentPages)).toHaveLength(9);
  for(const bundle of Object.values(developmentPages))expect(publicationSchema.safeParse(bundle).success).toBe(true);
 });
});
