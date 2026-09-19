import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes=['','how-it-works','service-scope','faq','contact','user-guide','privacy','terms','accessibility','login','register','forgot-password'];
const sizes=[{width:1440,height:1000},{width:820,height:1180},{width:390,height:844}];
for(const locale of ['ar','fr','en'])for(const size of sizes)test(`handoff all routes ${locale} ${size.width}`,async({page})=>{
 test.setTimeout(180000);await page.setViewportSize(size);
 for(const route of routes){
  expect((await page.goto(`/${locale}/${route}`))?.status()).toBe(200);
  await page.evaluate(async()=>{await Promise.all([400,500,600,700].map(w=>document.fonts.load(`${w} 16px "IBM Plex Sans Arabic"`,'أباينو')));await document.fonts.ready;});
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
  expect(await page.locator('h1').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('IBM Plex Sans Arabic');
  expect(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('IBM Plex Sans Arabic');
  expect(await page.evaluate(()=>[400,500,600,700].every(w=>document.fonts.check(`${w} 16px "IBM Plex Sans Arabic"`,'أباينو')))).toBe(true);
  if(!['login','register','forgot-password'].includes(route))expect((await page.locator('.public-header').boundingBox())?.height).toBe(size.width<=820?68:78);
  for(const img of await page.locator('main img').all())expect(await img.evaluate(el=>getComputedStyle(el).mixBlendMode)).toBe('normal');
  await page.screenshot({path:`test-results/design/${locale}-${route||'home'}-${size.width}.png`,fullPage:true});
 }
});
for(const locale of ['ar','fr','en'])test(`all routes reflow at 320 ${locale}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:320,height:844});
 for(const route of routes){await page.goto(`/${locale}/${route}`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);}
});
test('homepage regions, assets and dimensions follow handoff',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/ar');
 expect(await page.locator('main>section').evaluateAll(els=>els.map(e=>e.className))).toEqual(['public-hero','principles','how','home-scope','follow-up','home-help']);
 expect((await page.locator('.head').boundingBox())?.width).toBe(1240);expect((await page.locator('.actions .btn').first().boundingBox())?.height).toBe(46);
 expect(await page.locator('.chikaya').evaluate(e=>e.nextElementSibling?.tagName)).toBe('FOOTER');
 await expect(page.locator('.hero-illustration')).toHaveAttribute('src','/assets/abaynou-architecture-transparent.webp');
 expect(await page.locator('.hero-illustration').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await page.goto('/ar/how-it-works');expect((await page.locator('.info-page').boundingBox())?.width).toBe(1160);await expect(page.locator('.process-list article')).toHaveCount(5);
 await page.goto('/ar/faq');await expect(page.locator('.faq details')).toHaveCount(12);
});
test('mobile menu, complete language direction and keyboard focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/ar/faq');await page.locator('.hamb').click();await expect(page.locator('.hamb')).toHaveAttribute('aria-expanded','true');
 await page.locator('.mobile-nav').getByRole('link',{name:'Français',exact:true}).click();await expect(page).toHaveURL(/\/fr\/faq$/);await expect(page.locator('html')).toHaveAttribute('dir','ltr');await expect(page.locator('.mobile-nav')).toHaveCount(0);
 const q=page.locator('.faq summary').nth(1);await q.focus();expect(await q.evaluate(e=>getComputedStyle(e).outlineWidth)).toBe('3px');await page.keyboard.press('Enter');await expect(page.locator('.faq details').nth(1)).toHaveAttribute('open','');
 await page.locator('.hamb').click();await page.locator('.mobile-nav a').first().focus();await page.keyboard.press('Escape');await expect(page.locator('.hamb')).toBeFocused();await expect(page.locator('.hamb')).toHaveAttribute('aria-expanded','false');
});
for(const mode of ['login','register','forgot-password'])test(`authentication preview ${mode} accessibility and honest outcome`,async({page})=>{
 await page.goto(`/fr/${mode}`);await expect(page.locator('input[type=email]')).toHaveCount(1);await expect(page.locator('input[type=file]')).toHaveCount(0);await page.locator('input[type=email]').fill('preview@example.invalid');
 if(mode==='register'){await page.locator('input[name=name]').fill('Test');await expect(page.locator('input[type=tel]')).not.toHaveAttribute('required','');await page.locator('input[type=checkbox]').check();}
 if(mode!=='forgot-password'){await page.locator('input[name=password]').fill('preview-only-123');await page.locator('.password button').click();await expect(page.locator('input[name=password]')).toHaveAttribute('type','text');}
 let mutations=0;page.on('request',r=>{if(r.method()==='POST')mutations++;});await page.locator('button[type=submit]').click();await expect(page.locator('#auth-notice')).toContainText('Aucune information');expect(mutations).toBe(0);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
