import {developmentPages} from '../../fixtures/public-content';
import type {PageKey} from '../../src/features/public-content/model';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {pageRoutes} from '../../src/features/public-content/model';
for(const locale of ['ar','fr','en']){
 for(const [key,route] of Object.entries(pageRoutes))test(`${locale} ${key} renders safe published content`,async({page})=>{
  const response=await page.goto(`/${locale}/${route}`);expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang',locale);
  await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
  await expect(page.locator('h1')).toHaveText(developmentPages[key as PageKey][locale as 'ar'|'fr'|'en'].title);
  expect(await page.locator('main').innerText()).not.toMatch(/audit_event_id|DATABASE_URL|security_epoch|PostgresError/);
  expect(await page.locator('main').innerText()).not.toContain('We could not load');
  if(key==='FAQ'){const disclosure=page.locator('main details').first();await disclosure.locator('summary').focus();await page.keyboard.press('Enter');await expect(disclosure).not.toHaveAttribute('open','');}
 });
}
test('locale switching preserves page and root honors saved locale',async({page,context})=>{
 await page.goto('/ar/faq');await page.getByRole('link',{name:'Français',exact:true}).click();await expect(page).toHaveURL(/\/fr\/faq$/);
 await page.goto('/');await expect(page).toHaveURL(/\/fr$/);
 await context.clearCookies();await page.goto('/');await expect(page).toHaveURL(/\/ar$/);
});
test('unknown routes and unavailable CTA are usable',async({page})=>{
 const response=await page.goto('/en/unknown-page');expect(response?.status()).toBe(404);await expect(page.getByRole('heading',{name:'Page not found'})).toBeVisible();
 await page.goto('/en');await page.getByRole('link',{name:'Start a complaint'}).click();await expect(page.getByRole('heading',{name:'Create a citizen account'})).toBeVisible();await expect(page.locator('#auth-notice')).toContainText('not yet enabled');
});
for(const width of [375,768,1440])for(const locale of ['ar','fr','en'])test(`responsive and accessibility ${locale} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(`/${locale}`);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 if(width<=820){const menu=page.locator('.hamb');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');}
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations).toEqual([]);
 await page.screenshot({path:`test-results/home-${locale}-${width}.png`,fullPage:true});
 await page.goto(`/${locale}/contact`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('all internal public links resolve and Chikaya stays external',async({page,request})=>{
 await page.goto('/en');const links=await page.locator('a[href]').evaluateAll(elements=>[...new Set(elements.map(e=>e.getAttribute('href')!))]);
 for(const href of links.filter(h=>h.startsWith('/')&&!h.startsWith('//'))){const response=await request.get(href);expect(response.status(),href).toBe(200);}
 await page.goto('/en/contact');const chikaya=page.locator('a[href="https://chikaya.ma/"]');await expect(chikaya).toBeVisible();await expect(chikaya).toHaveAttribute('rel',/noopener/);
});
test('keyboard skip link moves to main content',async({page})=>{await page.goto('/en');await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#main')).toBeFocused();});
for(const locale of ['ar','fr','en'])for(const route of ['faq','privacy','user-guide'])test(`reading and disclosure accessibility ${locale}/${route}`,async({page})=>{
 await page.setViewportSize({width:320,height:800});await page.goto(`/${locale}/${route}`);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 if(route==='faq'){await page.locator('main summary').first().focus();await page.keyboard.press('Enter');await expect(page.locator('main details').first()).not.toHaveAttribute('open','');}
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations).toEqual([]);
});
test('unsupported locale fails with a not-found page',async({page})=>{const response=await page.goto('/es/faq');expect(response?.status()).toBe(404);});
