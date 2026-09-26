import {test,type APIRequestContext,type Page} from '@playwright/test';
import {expect,fillPassword} from '../support/private-password-input';
import {disposablePassword} from '../support/disposable-password';
import {complaintCopy} from '../../src/features/complaints/copy';
import {canonicalCategories,canonicalLocations} from '../../fixtures/canonical-catalogue';
import AxeBuilder from '@axe-core/playwright';
test.use({trace:'off',screenshot:'off',video:'off'});
const email=`complaint-${Date.now()}@example.test`,password=disposablePassword();
async function verifyLink(request:APIRequestContext){
 for(let attempt=0;attempt<30;attempt++){
  const data=await (await request.get('http://127.0.0.1:54324/api/v1/messages')).json();
  for(const item of data.messages??[]){
   if(!item.To?.some((to:{Address:string})=>to.Address===email))continue;
   const mail=await (await request.get(`http://127.0.0.1:54324/api/v1/message/${item.ID}`)).json();
   const link=(mail.HTML??'').replaceAll('&amp;','&').match(/href=["']([^"']+type=signup[^"']*)["']/)?.[1];if(link)return link;
  }
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 throw new Error('Synthetic signup email not received');
}
async function login(page:Page){await page.goto('/en/login');await page.getByLabel('Email address').fill(email);await fillPassword(page.locator('input[name="password"]'),password);await page.locator('form').filter({has:page.locator('input[name="password"]')}).locator('button[type="submit"]').click();await expect(page).toHaveURL('/en/citizen');}
test.describe.serial('DEV-04A persisted complaint submission',()=>{
 test.setTimeout(120_000);
 test.beforeAll(async({browser,request})=>{
  const page=await browser.newPage({baseURL:'http://127.0.0.1:3000'});
  try{await page.goto('/en/register');await page.getByLabel('Full name').fill('Complaint Review Citizen');await page.getByLabel('Email address').fill(email);await fillPassword(page.locator('input[name="password"]'),password);await page.getByRole('checkbox').check();await page.locator('form').filter({has:page.locator('input[name="password"]')}).locator('button[type="submit"]').click();await expect(page).toHaveURL('/en/check-email');await page.goto(await verifyLink(request));await page.getByRole('button',{name:'Confirm email',exact:true}).click();await expect(page).toHaveURL(/state=verified/);}finally{await page.close();}
 });
 for(const locale of ['ar','fr','en'] as const)test(`${locale}: all steps, responsive reflow, submit and persisted reload`,async({page})=>{
  const c=complaintCopy[locale];await login(page);await page.goto(`/${locale}/citizen/complaints/new`);await expect(page.locator('#categoryId')).toBeVisible();
  const commandUrl=page.url();await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
  await page.setViewportSize({width:1440,height:1000});
  await expect(page.locator('.citizen-nav a')).toHaveCount(3);await expect(page.locator('.citizen-nav a[href$="/account"]')).toHaveCount(0);
  const userButton=page.locator('.citizen-user > button');await userButton.click();await expect(page.locator('.citizen-user .citizen-dropdown')).toBeVisible();await page.keyboard.press('Tab');await expect(page.locator('.citizen-user .citizen-dropdown a')).toBeFocused();await page.keyboard.press('Escape');await expect(userButton).toBeFocused();await expect(page.locator('.citizen-user .citizen-dropdown')).toBeHidden();await userButton.click();await page.locator('h1').click();await expect(page.locator('.citizen-user .citizen-dropdown')).toBeHidden();
  for(const width of [1440,1200,1101]){await page.setViewportSize({width,height:1000});expect(await page.locator('.citizen-nav a').evaluateAll(links=>links.every(link=>getComputedStyle(link).whiteSpace==='nowrap'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  for(const width of [1100,820,390,320]){await page.setViewportSize({width,height:844});await expect(page.locator('.citizen-nav')).toBeHidden();const toggle=page.locator('.citizen-head>.hamb');await toggle.click();await expect(page.locator('.citizen-mobile-account')).toContainText('Complaint Review Citizen');await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(page.locator('.citizen-mobile')).toBeHidden();}
  await page.getByRole('button',{name:c.next,exact:true}).click();await expect(page.locator('#categoryId')).toBeFocused();
  await page.locator('#categoryId').selectOption(canonicalCategories[0].id);await page.locator('#subject').fill('  طريق تجريبي <plain text>  ');await page.locator('#description').fill('  Synthetic local issue with enough detail.\nالنص الأصلي محفوظ.  ');
  for(let step=0;step<3;step++){
   if(step===1){await page.locator('#locationId').selectOption(canonicalLocations[0].id);await expect(page.locator('#locationId')).toHaveAttribute('lang','ar');await page.locator('#locationClarification').fill('  قرب المسجد  ');}
   for(const [width,height]of [[1440,1000],[820,1180],[390,844],[320,844]]){await page.setViewportSize({width,height});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth?Array.from(document.querySelectorAll('body *')).filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1);}).map(node=>({tag:node.tagName,className:node.className})):[]);expect(overflow,`${locale} step ${step+1} at ${width}px`).toEqual([]);await expect(page.locator('[aria-current="step"]')).toHaveCount(1);if(process.env.DEV04A_VISUAL_REVIEW==='1')await page.screenshot({path:`test-results/complaint-${locale}-${width}-step-${step+1}.png`,fullPage:true});}
   expect((await new AxeBuilder({page}).include('.complaint-page').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(item=>item.id)).toEqual([]);
   if(process.env.DEV04A_VISUAL_REVIEW==='1'){await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:`test-results/complaint-${locale}-step-${step+1}.png`,fullPage:true});}
   if(step<2)await page.getByRole('button',{name:c.next,exact:true}).click();
  }
  await expect(page.getByRole('checkbox')).not.toBeChecked();await page.getByRole('checkbox').check();await page.getByRole('button',{name:c.submit,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/citizen/complaints/AB-`));const detailUrl=page.url();await expect(page.getByRole('heading',{name:c.success})).toBeVisible();await expect(page.locator('.complaint-page')).toContainText(c.received);await expect(page.locator('.complaint-page')).toContainText('دوار أباينو');await page.reload();await expect(page.getByRole('heading',{name:c.success})).toBeVisible();
  await page.goto(commandUrl);await expect(page).toHaveURL(detailUrl);
 });
 test('locale switching retains in-memory text and step',async({page})=>{
  await login(page);await page.goto('/en/citizen/complaints/new');await page.locator('#categoryId').selectOption(canonicalCategories[0].id);await page.locator('#subject').fill('Preserved locale-switch subject');await page.locator('#description').fill('A sufficiently detailed synthetic issue.');await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.locator('.citizen-language > button').click();await page.locator('.citizen-actions .language a[lang="ar"]').click();await expect(page.locator('html')).toHaveAttribute('dir','rtl');await expect(page.locator('#locationId')).toBeVisible();await page.getByRole('button',{name:complaintCopy.ar.back,exact:true}).click();await expect(page.locator('#subject')).toHaveValue('Preserved locale-switch subject');
 });
 test('lost response recovers committed result without resubmission',async({page})=>{
  await login(page);await page.goto('/en/citizen/complaints/new');await page.locator('#categoryId').selectOption(canonicalCategories[0].id);await page.locator('#subject').fill('Synthetic response-loss case');await page.locator('#description').fill('A sufficiently detailed synthetic issue for response recovery.');await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('#locationId').selectOption(canonicalLocations[0].id);await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('checkbox').check();
  let intercepted=false;await page.route('**/citizen/complaints/new?**',async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Confirm and submit',exact:true}).click();await expect(page.getByRole('button',{name:'Check submission result',exact:true})).toBeVisible();await page.getByRole('button',{name:'Check submission result',exact:true}).click();await expect(page).toHaveURL(/\/en\/citizen\/complaints\/AB-/);
 });
});
