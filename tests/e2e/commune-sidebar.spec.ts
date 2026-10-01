import {test,type Page} from '@playwright/test';
import {expect,fillPassword} from '../support/private-password-input';
import {randomUUID} from 'node:crypto';
import {bootstrapLocalStaff} from '../../scripts/local-staff';
import {disposablePassword} from '../support/disposable-password';
import {communeCopy} from '../../src/features/commune-auth/copy';
test.use({trace:'off',screenshot:'off',video:'off'});
const email=`sidebar-${randomUUID()}@example.test`,password=disposablePassword();
test.beforeAll(async()=>{await bootstrapLocalStaff({email,password,fullName:'Sidebar Review Administrator',role:'ADMIN',language:'en'});});
async function inViewport(page:Page,selector:string){await expect(page.locator(selector)).toBeVisible();await expect.poll(async()=>{const box=await page.locator(selector).boundingBox(),size=page.viewportSize()!;return Boolean(box&&box.y>=0&&box.y+box.height<=size.height+1&&box.x>=-1&&box.x+box.width<=size.width+1);}).toBe(true);}
test('Commune sidebar keeps role and logout visible across short desktops and mobile drawers',async({page})=>{
 test.setTimeout(180_000);
 await page.goto('/en/commune/login');await page.locator('[name=email]').fill(email);await fillPassword(page.locator('[name=password]'),password);await page.locator('.commune-form button').click();await expect(page).toHaveURL('/en/commune');
 for(const locale of ['ar','fr','en'] as const){
  await page.goto(`/${locale}/commune/settings`);await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
  for(const size of [{width:1440,height:900},{width:1366,height:600},{width:1280,height:480},{width:820,height:1180},{width:844,height:390},{width:390,height:844},{width:320,height:568}]){
   await page.setViewportSize(size);const mobile=size.width<=1100;
   if(mobile)await page.getByRole('button',{name:communeCopy[locale].menu,exact:true}).click();
   await expect(page.locator('.commune-identity')).toContainText(communeCopy[locale].admin);await inViewport(page,'.commune-identity');await inViewport(page,'.commune-identity button');
   const logout=page.locator('.commune-identity button');await logout.focus();await expect(logout).toBeFocused();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(mobile){await page.keyboard.press('Escape');await expect(page.locator('.commune-menu')).toBeFocused();}
  }
  await page.setViewportSize({width:1366,height:600});await expect(page.locator('.commune-sidebar a[href$="/account/password"]')).toHaveCount(0);
  await page.locator('.settings-cards a[href$="/account/password"]').click();await expect(page).toHaveURL(`/${locale}/commune/account/password`);
 }
});
