import {createHash} from 'node:crypto';
import {test,type APIRequestContext,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';
import {expect,fillPassword} from '../support/private-password-input';
import {disposablePassword} from '../support/disposable-password';
import {complaintCopy} from '../../src/features/complaints/copy';
import {canonicalCategories,canonicalLocations} from '../../fixtures/canonical-catalogue';
import {localDatabaseUrl} from '../../scripts/local-target';
test.use({trace:'off',screenshot:'off',video:'off'});
const email=`notifications-${Date.now()}@example.test`,password=disposablePassword();
async function mail(request:APIRequestContext,predicate:(html:string)=>boolean){
 for(let attempt=0;attempt<60;attempt++){
  const list=await (await request.get('http://127.0.0.1:54324/api/v1/messages')).json();
  for(const item of list.messages??[]){if(!item.To?.some((to:{Address:string})=>to.Address===email))continue;const detail=await (await request.get(`http://127.0.0.1:54324/api/v1/message/${item.ID}`)).json();const html=(detail.HTML??'').replaceAll('&amp;','&');if(predicate(html))return html;}
  await new Promise(resolve=>setTimeout(resolve,300));
 }throw new Error('Expected local email was not received');
}
async function login(page:Page){await page.goto('/en/login');await page.getByLabel('Email address').fill(email);await fillPassword(page.locator('input[name="password"]'),password);await page.locator('form').filter({has:page.locator('input[name="password"]')}).locator('button[type="submit"]').click();await expect(page).toHaveURL('/en/citizen');}
async function submit(page:Page,subject:string,description:string){const c=complaintCopy.en;await page.goto('/en/citizen/complaints/new');const category=page.locator('#categoryId');await expect.poll(()=>category.evaluate(element=>Object.keys(element).some(key=>key.startsWith('__reactProps$')))).toBe(true);await category.selectOption(canonicalCategories[0].id);await page.locator('#subject').fill(subject);await page.locator('#description').fill(description);await page.getByRole('button',{name:c.next,exact:true}).click();await expect(page.locator('#locationId')).toBeVisible();await page.locator('#locationId').selectOption(canonicalLocations[0].id);await page.getByRole('button',{name:c.next,exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:c.submit,exact:true}).click();await expect(page).toHaveURL(/\/en\/citizen\/complaints\/AB-/);return page.url().match(/AB-[A-Z2-9-]+/)![0];}

test.describe.serial('DEV-04B Citizen notification and receipt email',()=>{
 test.setTimeout(120_000);
 test.beforeAll(async({browser,request})=>{const page=await browser.newPage({baseURL:'http://127.0.0.1:3000'});try{await page.goto('/en/register');await page.getByLabel('Full name').fill('Notification Review Citizen');await page.getByLabel('Email address').fill(email);await fillPassword(page.locator('input[name="password"]'),password);await page.getByRole('checkbox').check();await page.locator('form').filter({has:page.locator('input[name="password"]')}).locator('button[type="submit"]').click();await expect(page).toHaveURL('/en/check-email');const signup=await mail(request,html=>html.includes('type=signup'));const link=signup.match(/href=["']([^"']+type=signup[^"']*)["']/)![1];await page.goto(link);await page.getByRole('button',{name:'Confirm email',exact:true}).click();await expect(page).toHaveURL(/state=verified/);}finally{await page.close();}});
 test('empty center, durable receipt, unread badge, read transition and private email link',async({page,request})=>{
  await login(page);await page.goto('/en/citizen/notifications');await expect(page.getByText('You do not have any notifications yet.')).toBeVisible();
  const privateBody='Private e2e complaint body that must never appear in receipt email.',reference=await submit(page,'Private e2e subject',privateBody);
  await expect(page.getByRole('link',{name:'1 unread notification'})).toBeVisible();await page.getByRole('link',{name:'1 unread notification'}).click();await expect(page.locator('.notification-item')).toHaveCount(1);await expect(page.locator('.notification-state',{hasText:'Unread'})).toBeVisible();
  await page.locator('.notification-item').click();await expect(page).toHaveURL(`/en/citizen/complaints/${reference}`);
  await expect(page.locator('.citizen-bell')).toHaveAttribute('aria-label','Notifications');await page.goto('/en/citizen/notifications');await expect(page.locator('.notification-state',{hasText:'Read'})).toBeVisible();
  const receipt=await mail(request,html=>html.includes(reference));expect(receipt).toContain(reference);expect(receipt).toContain('Status: Received');expect(receipt).not.toContain(privateBody);expect(receipt).not.toContain('Private e2e subject');const link=receipt.match(/href=["']([^"']+returnTo=[^"']*)["']/)![1];await page.goto(link);await expect(page).toHaveURL(`/en/citizen/complaints/${reference}`);
 });
 test('mark all, locale direction, responsive reflow, accessibility, and passive polling',async({page})=>{
  await login(page);await submit(page,'Second receipt notification','Another sufficiently detailed private complaint body.');await page.goto('/en/citizen/notifications');await expect(page.getByRole('button',{name:'Mark all as read'})).toBeVisible();
  const secret=(await page.context().cookies()).find(cookie=>cookie.name==='abaynou_app_session')!.value,digest=createHash('sha256').update(secret).digest(),db=postgres(localDatabaseUrl(),{max:1});
  try{const [before]=await db`select last_user_activity_at from app.application_sessions where secret_digest=${digest}`;await page.evaluate(()=>fetch('/en/citizen/notifications/poll',{headers:{'x-abaynou-passive':'notification-poll'}}));const [after]=await db`select last_user_activity_at from app.application_sessions where secret_digest=${digest}`;expect(new Date(after.last_user_activity_at).getTime()).toBe(new Date(before.last_user_activity_at).getTime());}finally{await db.end();}
  await expect(page.getByRole('link',{name:'1 unread notification'})).toBeVisible();await page.getByRole('button',{name:'Mark all as read'}).click();await expect(page.getByRole('button',{name:'Mark all as read'})).toHaveCount(0);await expect(page.locator('.notification-state',{hasText:'Unread'})).toHaveCount(0);await expect(page.locator('.citizen-bell')).toHaveAttribute('aria-label','Notifications');
  for(const locale of ['ar','fr','en'] as const){await page.goto(`/${locale}/citizen/notifications`);await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');for(const size of [{width:1440,height:1000},{width:820,height:1180},{width:390,height:844},{width:320,height:844}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.citizen-bell')).toBeVisible();}}
  await page.setViewportSize({width:390,height:844});expect((await new AxeBuilder({page}).include('.notification-page').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(item=>item.id)).toEqual([]);
 });
});
