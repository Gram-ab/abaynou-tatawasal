import {expect,request as playwrightRequest,test,type APIRequestContext,type Browser,type Page} from '@playwright/test';

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
async function login(page:Page,email:string,password:string){await page.goto('/en/login');await page.getByLabel('Email address').fill(email);await page.locator('input[name="password"]').fill(password);await submit(page);}
async function assertOldEmailWorks(browser:Browser,email:string,password:string){const context=await browser.newContext({baseURL:'http://127.0.0.1:3000'}),page=await context.newPage();await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await context.close();}

test.describe.serial('Citizen identity and account access',()=>{
 test.setTimeout(90_000);
 const stamp=Date.now();const email=`citizen-${stamp}@example.test`,changed=`citizen-changed-${stamp}@example.test`;
 let password='onlyletterspassphrase';const newPassword='newletterspassphrase';

 test('signup preserves errors, uses Check Your Email, and verifies only on explicit action',async({page,request})=>{
  await page.goto('/en/register');
  await page.getByLabel('Full name').fill('Test Citizen');await page.getByLabel('Email address').fill(email);await page.getByLabel('Phone (optional)').fill('00 212 600-000-001');await page.locator('input[name="password"]').fill('123456789');await page.getByRole('checkbox').check();await submit(page);
  await expect(page.locator('.auth-notice.error-notice')).toContainText('10 characters');await expect(page.getByLabel('Full name')).toHaveValue('Test Citizen');await expect(page.getByLabel('Email address')).toHaveValue(email);await expect(page.getByLabel('Phone (optional)')).toHaveValue('00 212 600-000-001');await expect(page.locator('input[name="password"]')).toHaveValue('123456789');await expect(page.getByRole('checkbox')).toBeChecked();
  await page.locator('input[name="password"]').fill(password);await submit(page);
  await expect(page).toHaveURL(/\/en\/check-email$/,{timeout:30_000});await expect(page.getByRole('heading',{name:'Check your email'})).toBeVisible();await expect(page.getByText(new RegExp(`c.*@example\\.test`))).toBeVisible();await page.getByRole('button',{name:'Resend verification email'}).click();await expect(page.getByRole('status')).toContainText('new email');
  const link=await emailLink(request,email,'signup');const scannerContext=await playwrightRequest.newContext();const scanner=await scannerContext.get(link);expect(scanner.ok()).toBe(true);await scannerContext.dispose();
  await login(page,email,password);await expect(page.locator('.auth-notice')).toContainText('Unable to sign in');await expect(page.getByLabel('Email address')).toHaveValue(email);await expect(page.locator('input[name="password"]')).toHaveValue(password);
  await page.goto(link);await expect(page).toHaveURL(/\/en\/verify-email\?action=confirm$/);await expect(page.getByRole('heading',{name:'Confirm your email'})).toBeVisible();await page.getByRole('button',{name:'Confirm email'}).click();
  await expect(page).toHaveURL(/\/en\/verify-email\?state=verified$/);await expect(page.getByRole('heading',{name:'Email verified successfully'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Email verified successfully'})).toBeVisible();
  await page.goto(link);await page.getByRole('button',{name:'Confirm email'}).click();await expect(page.locator('.auth-notice.error-notice')).toContainText('invalid');await expect(page.getByRole('link',{name:'Sign in'})).toBeVisible();
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await expect(page.getByRole('heading',{name:/Welcome Test Citizen/})).toBeVisible();
  const cookies=await page.context().cookies();expect(cookies.find(cookie=>cookie.name==='abaynou_app_session')?.httpOnly).toBe(true);expect(cookies.filter(cookie=>cookie.name.startsWith('abaynou-provider')).every(cookie=>cookie.httpOnly)).toBe(true);
 });

 test('profile fields survive an error and language changes the same account route immediately',async({page})=>{
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await page.goto('/en/citizen/account');
  await page.getByLabel('Full name').fill('Preserved Citizen');await page.getByLabel('Phone (optional)').fill('invalid phone');await page.getByLabel('Preferred language').selectOption('ar');await submit(page);
  await expect(page.locator('.form-result.error')).toBeVisible();await expect(page.getByLabel('Full name')).toHaveValue('Preserved Citizen');await expect(page.getByLabel('Phone (optional)')).toHaveValue('invalid phone');await expect(page.getByLabel('Preferred language')).toHaveValue('ar');
  await page.getByLabel('Full name').fill('Updated Citizen');await page.getByLabel('Phone (optional)').fill('');await page.getByLabel('Preferred language').selectOption('fr');await submit(page);
  await expect(page).toHaveURL(/\/fr\/citizen\/account\?state=saved$/);await expect(page.locator('html')).toHaveAttribute('lang','fr');await expect(page.locator('html')).toHaveAttribute('dir','ltr');await expect(page.getByRole('heading',{name:'Mon compte'})).toBeVisible();await expect(page.getByLabel('Nom complet')).toHaveValue('Updated Citizen');await expect(page.getByRole('status')).toContainText('Modification enregistrée');
  await expect(page.locator('.account-nav')).not.toContainText('Langue préférée');await page.goto('/fr/citizen/account/language');await expect(page).toHaveURL(/\/fr\/citizen\/account$/);
 });

 test('password change applies the 10-character policy and preserves normal errors',async({page})=>{
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await page.goto('/en/citizen/account/password');
  await page.locator('input[name="currentPassword"]').fill('wrong password');await page.locator('input[name="password"]').fill(newPassword);await page.locator('input[name="confirmation"]').fill(newPassword);await submit(page);
  await expect(page.locator('.form-result.error')).toContainText('current password');await expect(page.locator('input[name="currentPassword"]')).toHaveValue('wrong password');await expect(page.locator('input[name="password"]')).toHaveValue(newPassword);
  await page.locator('input[name="currentPassword"]').fill(password);await submit(page);await expect(page.getByRole('status')).toContainText('Change saved');password=newPassword;
  await page.getByRole('button',{name:'Sign out'}).click();await expect(page).toHaveURL(/\/en$/);await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);
 });

 test('email change requires reauthentication and only the new address confirmation',async({page,request,browser})=>{
  await login(page,email,password);await expect(page).toHaveURL(/\/en\/citizen$/);await page.goto('/en/citizen/account/email');await page.getByLabel('New email address').fill(changed);await page.locator('input[name="currentPassword"]').fill('wrong password');await submit(page);
  await expect(page.locator('.form-result.error')).toContainText('current password');await expect(page.getByLabel('New email address')).toHaveValue(changed);await expect(page.locator('input[name="currentPassword"]')).toHaveValue('wrong password');
  await page.locator('input[name="currentPassword"]').fill(password);await submit(page);await expect(page.getByRole('status')).toContainText('one confirmation link');
  expect(await hasEmailLink(request,email,'email_change')).toBe(false);const newLink=await emailLink(request,changed,'email_change');await assertOldEmailWorks(browser,email,password);
  const scannerContext=await playwrightRequest.newContext();expect((await scannerContext.get(newLink)).ok()).toBe(true);await scannerContext.dispose();await assertOldEmailWorks(browser,email,password);
  await page.goto(newLink);await expect(page.getByRole('heading',{name:'Confirm your email'})).toBeVisible();await page.getByRole('button',{name:'Confirm email'}).click();await expect(page).toHaveURL(/\/en\/verify-email\?state=email-changed$/);await expect(page.getByRole('heading',{name:'Email changed successfully'})).toBeVisible();
  await page.goto('/en/citizen');await expect(page).toHaveURL(/\/en\/login\?reason=authentication-required$/);await login(page,email,password);await expect(page.locator('.auth-notice')).toContainText('Unable to sign in');await expect(page.getByLabel('Email address')).toHaveValue(email);await login(page,changed,password);await expect(page).toHaveURL(/\/en\/citizen$/);
 });

 test('recovery and reset complete safely with the 10-character policy',async({page,request})=>{
  await page.goto('/en/forgot-password');await page.getByLabel('Email address').fill(changed);await submit(page);await expect(page.getByRole('status')).toContainText('recovery email');
  const recovery=await emailLink(request,changed,'recovery');await page.goto(recovery);await submit(page);await expect(page).toHaveURL(/\/en\/reset-password$/);
  await page.locator('input[name="password"]').fill('123456789');await page.locator('input[name="confirmation"]').fill('123456789');await submit(page);await expect(page.locator('.auth-notice.error-notice')).toContainText('10 characters');await expect(page.locator('input[name="password"]')).toHaveValue('123456789');
  const resetPassword='finalletters';await page.locator('input[name="password"]').fill(resetPassword);await page.locator('input[name="confirmation"]').fill(resetPassword);await submit(page);await expect(page).toHaveURL(/\/en\/login\?state=password-reset$/);await login(page,changed,resetPassword);await expect(page).toHaveURL(/\/en\/citizen$/);
 });
});

for(const locale of ['ar','fr','en'])test(`DEV-02 account entry reflows and uses ${locale} direction`,async({page})=>{await page.setViewportSize({width:320,height:844});await page.goto(`/${locale}/login`);await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.getByLabel(locale==='ar'?'إظهار كلمة المرور':locale==='fr'?'Afficher le mot de passe':'Show password').click();await expect(page.locator('input[name="password"]')).toHaveAttribute('type','text');});
