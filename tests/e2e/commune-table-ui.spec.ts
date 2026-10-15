import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {test,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';
import {expect,fillPassword} from '../support/private-password-input';
import {localFixtureAuth} from '../support/local-fixtures';
import {bootstrapLocalStaff} from '../../scripts/local-staff';
import {runtimeDatabaseUrl} from '../database/target';
import {canonicalCategories,canonicalLocations} from '../../fixtures/canonical-catalogue';

test.use({trace:'off',screenshot:'off',video:'off'});
const run=randomUUID(),email=`table-agent-${run}@example.test`,password=randomBytes(32).toString('base64url'),query=`Table review ${run}`;
async function login(page:Page){await page.goto('/en/commune/login');await page.locator('input[name="email"]').fill(email);await fillPassword(page.locator('input[name="password"]'),password);await page.locator('.commune-form button').click();await expect(page).toHaveURL('/en/commune');}

test.describe.serial('Commune optimized table and shared dropdown presentation',()=>{
 test.setTimeout(120_000);
 test.beforeAll(async()=>{
  await bootstrapLocalStaff({email,password,fullName:'Table Review Agent',role:'AGENT',language:'en'});
  const auth=localFixtureAuth(),db=postgres(runtimeDatabaseUrl(),{max:1,onnotice:()=>{}});
  try{
   const [legal]=await db`select * from app.read_signup_legal('en')`;
   // Stay within the real per-Citizen submission limit; do not disable rate checks.
   for(let citizen=0;citizen<6;citizen++){
    const created=await auth.auth.admin.createUser({email:`table-citizen-${citizen}-${run}@example.test`,password:randomBytes(32).toString('base64url'),email_confirm:true});
    if(created.error||!created.data.user)throw Error('Disposable Citizen unavailable');
    const id=created.data.user.id,provider=randomUUID(),digest=randomBytes(32);
    await db`select * from app.provision_citizen(${id},'Table Review Citizen',null,'en',${legal.terms_version_id},${legal.privacy_version_id})`;
    await db`select * from app.create_application_session(${id},${provider},${digest},'CITIZEN')`;
    for(let n=0;n<(citizen===5?1:10);n++)await db`select * from app.submit_complaint(${id},${provider},${digest},${randomUUID()},${randomBytes(32)},${canonicalCategories[0].id},${canonicalLocations[0].id},${query+' '+(citizen*10+n)},'A synthetic complaint with enough detail to verify stable table pagination.',null,true)`;
   }
  }finally{await db.end();}
 });
 test('numbered links preserve filters, totals, stable rows and browser history',async({page})=>{
  await login(page);await page.goto(`/en/commune/complaints?q=${encodeURIComponent(query)}&status=SUBMITTED&location=${canonicalLocations[0].id}`);
  const nav=page.getByRole('navigation',{name:'Complaint pagination'});
  await expect(page.locator('.tracking-table tbody tr')).toHaveCount(20);
  await expect(nav.getByLabel('Page 1')).toHaveAttribute('aria-current','page');
  await expect(nav.getByText('51',{exact:true})).toBeVisible();
  const references=await page.locator('.tracking-table .complaint-reference').allTextContents();
  await page.evaluate(()=>{(window as unknown as {tableNavigationMarker:string}).tableNavigationMarker='preserved';});
  await nav.getByRole('link',{name:'Page 2',exact:true}).click();
  await expect(page).toHaveURL(url=>url.searchParams.get('page')==='2'&&url.searchParams.get('q')===query&&url.searchParams.get('status')==='SUBMITTED'&&url.searchParams.get('location')===canonicalLocations[0].id);
  await expect(nav.getByLabel('Page 2')).toHaveAttribute('aria-current','page');
  expect(await page.evaluate(()=>(window as unknown as {tableNavigationMarker:string}).tableNavigationMarker)).toBe('preserved');
  expect((await page.locator('.tracking-table .complaint-reference').allTextContents()).some(reference=>references.includes(reference))).toBe(false);
  await nav.getByRole('link',{name:'Page 3',exact:true}).click();await expect(page).toHaveURL(url=>url.searchParams.get('page')==='3');
  await expect(page.locator('.tracking-table tbody tr')).toHaveCount(11);expect(await nav.getByRole('link',{name:'Next'}).count()).toBe(0);
  await page.goBack();await expect(page).toHaveURL(url=>url.searchParams.get('page')==='2');await expect(page.locator('.tracking-table tbody tr')).toHaveCount(20);
 });
 test('AR/FR/EN responsive pagination, keyboard dropdowns and visible focus',async({page})=>{
  await login(page);mkdirSync('.local/quality/screenshots',{recursive:true});
  for(const locale of ['ar','fr','en'] as const){
   await page.goto(`/${locale}/commune/complaints?q=${encodeURIComponent(query)}`);
   await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
   for(const width of [1440,820,390,320]){
    await page.setViewportSize({width,height:width>1000?1000:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const pagination=page.locator('.tracking-pagination');await pagination.scrollIntoViewIfNeeded();
    const rect=await pagination.boundingBox();expect(Boolean(rect&&rect.x>=0&&rect.x+rect.width<=width)).toBe(true);
    if(width===1440||width===390)await page.screenshot({path:`.local/quality/screenshots/table-${locale}-${width}.png`,fullPage:false});
   }
   await page.setViewportSize({width:390,height:844});
   const select=page.locator('select[name="status"]');await select.focus();
   expect(await select.evaluate(element=>getComputedStyle(element).outlineStyle)).toBe('solid');
   // Once open, focus belongs to native options; do not refocus the select per key.
   for(const key of ['Space','ArrowDown','Enter'])await page.keyboard.press(key);
   expect(await select.inputValue()).toBe('SUBMITTED');
   expect(await select.evaluate(element=>getComputedStyle(element).borderRadius)).toBe('7px');
   if(await page.evaluate(()=>CSS.supports('appearance','base-select'))){
    await select.click();await expect(page.locator('select:open')).toHaveCount(1);
    if(locale==='ar')await page.screenshot({path:'.local/quality/screenshots/dropdown-ar-390.png'});
    await page.keyboard.press('Escape');await expect(page.locator('select:open')).toHaveCount(0);
   }
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(`/en/commune/complaints?q=${encodeURIComponent(query)}`);
  expect((await new AxeBuilder({page}).include('.tracking-page').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(({id})=>id)).toEqual([]);
 });
});
