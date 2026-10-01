import {describe,expect,it} from 'vitest';
import {developmentPages,developmentSettings} from '../../fixtures/public-content';
import {adminPublicationBundleSchema,updateSettingsSchema} from '../../src/features/content-admin/model';
import {randomUUID} from 'node:crypto';
describe('DEV-09 content administration validation',()=>{
 it('requires a complete safe three-language publication',()=>{expect(adminPublicationBundleSchema.safeParse(developmentPages.HOME).success).toBe(true);const missing={...developmentPages.HOME,en:undefined};expect(adminPublicationBundleSchema.safeParse(missing).success).toBe(false);expect(adminPublicationBundleSchema.safeParse({...developmentPages.HOME,en:{title:'Title',body:'<script>x</script>'}}).success).toBe(false);});
 it('counts Unicode code points and permits only level-two heading syntax',()=>{const title='😀'.repeat(200);expect(adminPublicationBundleSchema.safeParse({ar:{title,body:'فقرة'},fr:{title,body:'Texte'},en:{title,body:'Text\n\n## Heading\n\nParagraph'}}).success).toBe(true);expect(adminPublicationBundleSchema.safeParse({ar:{title,body:'# عنوان'},fr:{title,body:'Texte'},en:{title,body:'Text'}}).success).toBe(false);});
 it('accepts only complete settings and official Chikaya destinations',()=>{const base={locale:'en',revision:1,commandKey:randomUUID(),contactPhone:'+212 500 000 000',contactEmail:'public@example.invalid',chikayaUrl:'https://chikaya.ma/',bundle:developmentSettings};expect(updateSettingsSchema.safeParse(base).success).toBe(true);expect(updateSettingsSchema.safeParse({...base,chikayaUrl:'https://chikaya.ma.evil.test/'}).success).toBe(false);expect(updateSettingsSchema.safeParse({...base,bundle:{...developmentSettings,fr:{...developmentSettings.fr,opening_hours:''}}}).success).toBe(false);});
});
