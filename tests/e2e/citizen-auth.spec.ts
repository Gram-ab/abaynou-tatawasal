import {disposablePassword} from '../support/disposable-password';
import {expect,fillPassword,expectPassword} from '../support/private-password-input';
import {request as playwrightRequest,test,type APIRequestContext,type Browser,type Page} from '@playwright/test';

test.use({trace:'off',screenshot:'off',video:'off'});
// Intentionally invalid nine-character input exercises rejection, never a valid account password.
const invalidShortPassword=disposablePassword(9),wrongPassword=disposablePassword();
const mailpit='http://127.0.0.1:54324';
async function messages(request:APIRequestContext,address:string){
 const response=await request.get(`${mailpit}/api/v1/messages`),data=await response.json() as {messages?:Array<{ID:string;To?:Array<{Address:string}>}>};
 return data.messages?.filter(message=>message.To?.some(to=>to.Address.toLowerCase()===address.toLowerCase()))??[];
}
async function emailLink(request:APIRequestContext,address:string,type:string){
 for(let attempt=0;attempt<30;attempt++){
  for(const match of await messages(request,address)){const response=await request.get(`${mailpit}/api/v1/message/${match.ID}`),message=await response.json() as {HTML?:string;Text?:string};const source=(message.HTML??message.Text??'').replaceAll('&amp;','&');const link=source.match(new RegExp(`href=["']([^"']+type=${type}[^"']*)["']`))?.[1];if(link)return link;}
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 throw new Error(`No ${type} message for ${address}`);
}
async function hasEmailLink(request:APIRequestContext,address:string,type:string){
 for(const match of await messages(request,address)){const response=await request.get(`${mailpit}/api/v1/message/${match.ID}`),message=await response.json() as {HTML?:string;Text?:string};if((message.HTML??message.Text??'').includes(`type=${type}`))return true;}return false;
}
async function submit(page:Page){await page.locator('form').filter({has:page.locator('button[type="submit"]')}).last().locator('button[type="submit"]').click();}
async function login(page:Page,email:string,password:string){await page.goto('/en/login');await page.getByLabel('Email address').fill(email);await fillPassword(page.locator('input[name="password"]'),password);await submit(page);}
async function assertOldEmailWorks(browser:Browser,email:string,password:string){const context=await browser.newContext({baseURL:'http://127.0.0.1:3000'}),page=await context.newPage();await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await context.close();}

test.describe.serial('Citizen identity and account access',()=>{
 test.setTimeout(90_000);
 const stamp=Date.now();const email=`citizen-${stamp}@example.test`,changed=`citizen-changed-${stamp}@example.test`;
 let password=disposablePassword();const newPassword=disposablePassword();

 test('signup preserves errors, uses Check Your Email, and verifies only on explicit action',async({page,request})=>{
  await page.goto('/en/register');
  await page.getByLabel('Full name').fill('Test Citizen');await page.getByLabel('Email address').fill(email);await page.getByLabel('Phone (optional)').fill('00 212 600-000-001');await fillPassword(page.locator('input[name="password"]'),invalidShortPassword);await page.getByRole('checkbox').check();await submit(page);
  await expect(page.locator('.auth-notice.error-notice')).toContainText('10 characters');await expect(page.getByLabel('Full name')).toHaveValue('Test Citizen');await expect(page.getByLabel('Email address')).toHaveValue(email);await expect(page.getByLabel('Phone (optional)')).toHaveValue('00 212 600-000-001');await expectPassword(page.locator('input[name="password"]'),invalidShortPassword);await expect(page.getByRole('checkbox')).toBeChecked();
  await fillPassword(page.locator('input[name="password"]'),password);await submit(page);
  await expect(page).toHaveURL(/\/en\/check-email$/,{timeout:30_000});await expect(page.getByRole('heading',{name:'Check your email'})).toBeVisible();await expect(page.getByText(new RegExp(`c.*@example\\.test`))).toBeVisible();await page.getByRole('button',{name:'Resend verification email'}).click();await expect(page.getByRole('status')).toContainText('new email');
  const link=await emailLink(request,email,'signup');const scannerContext=await playwrightRequest.newContext();const scanner=await scannerContext.get(link);expect(scanner.ok()).toBe(true);await scannerContext.dispose();
  await login(page,email,password);await expect(page.locator('.auth-notice')).toContainText('Unable to sign in');await expect(page.getByLabel('Email address')).toHaveValue(email);await expectPassword(page.locator('input[name="password"]'),password);
  await page.goto(link);await expect(page).toHaveURL(/\/en\/verify-email\?action=confirm$/);await expect(page.getByRole('heading',{name:'Confirm your email'})).toBeVisible();await page.getByRole('button',{name:'Confirm email'}).click();
  await expect(page).toHaveURL(/\/en\/verify-email\?state=verified$/);await expect(page.getByRole('heading',{name:'Email verified successfully'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Email verified successfully'})).toBeVisible();
  await page.goto(link);await page.getByRole('button',{name:'Confirm email'}).click();await expect(page.locator('.auth-notice.error-notice')).toContainText('invalid');await expect(page.getByRole('link',{name:'Sign in'})).toBeVisible();
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await expect(page.getByRole('heading',{name:/Welcome Test Citizen/})).toBeVisible();
  const cookies=await page.context().cookies();expect(cookies.find(cookie=>cookie.name==='abaynou_app_session')?.httpOnly).toBe(true);expect(cookies.filter(cookie=>cookie.name.startsWith('abaynou-provider')).every(cookie=>cookie.httpOnly)).toBe(true);
 });

 test('active Citizen session skips entry forms and personalizes public navigation',async({page})=>{
  const stale=await page.context().newPage();await stale.goto('/en/commune/login');await stale.locator('input[name="email"]').fill('other-staff@example.test');await fillPassword(stale.locator('input[name="password"]'),disposablePassword());
  await login(page,email,password);await expect(page).toHaveURL('/en/citizen');
  const sessionBefore=(await page.context().cookies()).find(c=>c.name==='abaynou_app_session')?.value;await stale.locator('.commune-form button').click();await expect(stale).toHaveURL('/en/citizen');expect((await page.context().cookies()).find(c=>c.name==='abaynou_app_session')?.value===sessionBefore).toBe(true);await stale.close();
  await page.locator('.citizen-header .brand').click();await expect(page).toHaveURL('/en');
  await expect(page.locator('.head-actions a[href="/en/citizen/account"]')).toHaveText('Test Citizen');await expect(page.locator('.public-header a[href="/en/login"]')).toHaveCount(0);await expect(page.locator('.public-header a[href="/en/register"]')).toHaveCount(0);
  await page.locator('.head-actions a[href="/en/citizen/account"]').click();await expect(page).toHaveURL('/en/citizen/account');await page.locator('.citizen-header .brand').click();await page.locator('.desktop-nav a[href="/en/faq"]').click();await expect(page.locator('.head-actions')).toContainText('Test Citizen');
  for(const locale of ['ar','fr','en']){for(const entry of ['login','commune/login','register']){await page.goto(`/${locale}/${entry}?returnTo=https://example.invalid`);await expect(page).toHaveURL(`/${locale}/citizen`);}await page.goto(`/${locale}`);await expect(page.locator('.head-actions')).toContainText('Test Citizen');await expect(page.locator('.commune-footer-link')).toHaveCount(0);}
  await page.setViewportSize({width:390,height:844});await page.locator('.public-header .hamb').click();await expect(page.locator('.mobile-nav a[href="/en/citizen/account"]')).toHaveText('Test Citizen');await page.locator('.mobile-nav a[href="/en/citizen/account"]').click();await expect(page).toHaveURL('/en/citizen/account');await page.locator('.citizen-header .brand').click();await expect(page).toHaveURL('/en');await page.locator('.public-header .hamb').click();await expect(page.locator('.mobile-nav form button')).toBeVisible();await page.locator('.mobile-nav form button').click();await expect(page).toHaveURL('/en');
  await expect(page.locator('.public-header')).not.toContainText('Test Citizen');if(await page.locator('.hamb').getAttribute('aria-expanded')==='false')await page.locator('.hamb').click();await expect(page.locator('.mobile-nav a[href="/en/login"]')).toBeVisible();await expect(page.locator('.mobile-nav a[href="/en/register"]')).toBeVisible();await expect(page.locator('.public-header')).not.toContainText('Test Citizen');
  await expect(page.locator('.commune-footer-link')).toBeVisible();await page.goto('/en/login');await expect(page.locator('input[name="email"]')).toBeVisible();
 });

 test('profile fields survive an error and language changes the same account route immediately',async({page})=>{
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await page.goto('/en/citizen/account');
  await page.getByLabel('Full name').fill('Preserved Citizen');await page.getByLabel('Phone (optional)').fill('invalid phone');await page.getByLabel('Preferred language').selectOption('ar');await submit(page);
  await expect(page.locator('.form-result.error')).toBeVisible();await expect(page.getByLabel('Full name')).toHaveValue('Preserved Citizen');await expect(page.getByLabel('Phone (optional)')).toHaveValue('invalid phone');await expect(page.getByLabel('Preferred language')).toHaveValue('ar');
  await page.getByLabel('Full name').fill('Updated Citizen');await page.getByLabel('Phone (optional)').fill('');await page.getByLabel('Preferred language').selectOption('fr');await submit(page);
  await expect(page).toHaveURL(/\/fr\/citizen\/account\?state=saved$/);await expect(page.locator('html')).toHaveAttribute('lang','fr');await expect(page.locator('html')).toHaveAttribute('dir','ltr');await expect(page.getByRole('heading',{name:'Mon compte'})).toBeVisible();await expect(page.getByLabel('Nom complet')).toHaveValue('Updated Citizen');await expect(page.getByRole('status')).toContainText('Modification enregistrée');
  await page.setViewportSize({width:390,height:844});const menu=page.locator('.citizen-head>.hamb'),panel=page.locator('.citizen-mobile');await menu.click();await expect(panel).toBeVisible();await page.locator('main').click({position:{x:5,y:650}});await expect(panel).toBeHidden();await menu.click();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(panel).toBeHidden();await page.emulateMedia({reducedMotion:'reduce'});await menu.click();expect(await panel.evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');await page.keyboard.press('Escape');await expect(page.locator('.account-nav')).not.toContainText('Langue préférée');await page.goto('/fr/citizen/account/language');await expect(page).toHaveURL(/\/fr\/citizen\/account$/);
 });

 test('password change applies the 10-character policy and preserves normal errors',async({page})=>{
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await page.goto('/en/citizen/account/password');
  await fillPassword(page.locator('input[name="currentPassword"]'),wrongPassword);await fillPassword(page.locator('input[name="password"]'),newPassword);await fillPassword(page.locator('input[name="confirmation"]'),newPassword);await submit(page);
  await expect(page.locator('.form-result.error')).toContainText('current password');await expectPassword(page.locator('input[name="currentPassword"]'),wrongPassword);await expectPassword(page.locator('input[name="password"]'),newPassword);
  await fillPassword(page.locator('input[name="currentPassword"]'),password);await submit(page);await expect(page.getByRole('status')).toContainText('Change saved');password=newPassword;
  await page.locator('.citizen-user .citizen-disclosure-trigger').click();await page.getByRole('button',{name:'Sign out'}).click();await expect(page).toHaveURL(/\/en$/);await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);
 });

 test('email change requires reauthentication and only the new address confirmation',async({page,request,browser})=>{
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await page.goto('/en/citizen/account/email');await page.getByLabel('New email address').fill(changed);await fillPassword(page.locator('input[name="currentPassword"]'),wrongPassword);await submit(page);
  await expect(page.locator('.form-result.error')).toContainText('current password');await expect(page.getByLabel('New email address')).toHaveValue(changed);await expectPassword(page.locator('input[name="currentPassword"]'),wrongPassword);
  await fillPassword(page.locator('input[name="currentPassword"]'),password);await submit(page);await expect(page.getByRole('status')).toContainText('one confirmation link');
  expect(await hasEmailLink(request,email,'email_change')).toBe(false);const newLink=await emailLink(request,changed,'email_change');await assertOldEmailWorks(browser,email,password);
  const scannerContext=await playwrightRequest.newContext();expect((await scannerContext.get(newLink)).ok()).toBe(true);await scannerContext.dispose();await assertOldEmailWorks(browser,email,password);
  await page.goto(newLink);await expect(page.getByRole('heading',{name:'Confirm your email'})).toBeVisible();await page.getByRole('button',{name:'Confirm email'}).click();await expect(page).toHaveURL(/\/en\/verify-email\?state=email-changed$/);await expect(page.getByRole('heading',{name:'Email changed successfully'})).toBeVisible();
  await page.goto('/en/citizen');await expect(page).toHaveURL(/\/en\/login\?reason=authentication-required$/);await login(page,email,password);await expect(page.locator('.auth-notice')).toContainText('Unable to sign in');await expect(page.getByLabel('Email address')).toHaveValue(email);await login(page,changed,password);await expect(page).toHaveURL(/\/en\/citizen$/);
 });

 test('recovery and reset complete safely with the 10-character policy',async({page,request})=>{
  await page.goto('/en/forgot-password');await page.getByLabel('Email address').fill(changed);await submit(page);await expect(page.getByRole('status')).toContainText('recovery email');
  const recovery=await emailLink(request,changed,'recovery');await page.goto(recovery);await submit(page);await expect(page).toHaveURL(/\/en\/reset-password$/);
  await fillPassword(page.locator('input[name="password"]'),invalidShortPassword);await fillPassword(page.locator('input[name="confirmation"]'),invalidShortPassword);await submit(page);await expect(page.locator('.auth-notice.error-notice')).toContainText('10 characters');await expectPassword(page.locator('input[name="password"]'),invalidShortPassword);
  const resetPassword=disposablePassword();await fillPassword(page.locator('input[name="password"]'),resetPassword);await fillPassword(page.locator('input[name="confirmation"]'),resetPassword);await submit(page);await expect(page).toHaveURL(/\/en\/login\?state=password-reset$/);await login(page,changed,resetPassword);await expect(page).toHaveURL(/\/en\/citizen$/);
 });
});

for(const locale of ['ar','fr','en'])test(`DEV-02 account entry reflows and uses ${locale} direction`,async({page})=>{await page.setViewportSize({width:320,height:844});await page.goto(`/${locale}/login`);await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.getByLabel(locale==='ar'?'إظهار كلمة المرور':locale==='fr'?'Afficher le mot de passe':'Show password').click();await expect(page.locator('input[name="password"]')).toHaveAttribute('type','text');});
