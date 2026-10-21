import {test,type Page} from '@playwright/test';
import {expect,fillPassword} from '../support/private-password-input';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import postgres from 'postgres';
import AxeBuilder from '@axe-core/playwright';
import {bootstrapLocalStaff} from '../../scripts/local-staff';
import {e2eTarget} from '../../scripts/e2e-target';
import {disposablePassword} from '../support/disposable-password';
import {staffPromotionCopy} from '../../src/features/staff-admin/promotion-copy';
import {staffAdminCopy} from '../../src/features/staff-admin/copy';
import {staffFeedbackCopy} from '../../src/features/staff-admin/feedback-copy';

test.use({trace:'off',screenshot:'off',video:'off'});
test.describe.serial('Dashboard Admin promotion',()=>{
 test.setTimeout(120_000);
 const admin={email:`promotion-admin-${randomUUID()}@example.test`,password:disposablePassword()};
 const agents=Object.fromEntries((['ar','fr','en'] as const).map(locale=>[locale,{email:`promotion-agent-${randomUUID()}@example.test`,password:disposablePassword(),profileId:''}])) as Record<'ar'|'fr'|'en',{email:string;password:string;profileId:string}>;
 async function login(page:Page,email:string,password:string,locale:string){await page.goto(`/${locale}/commune/login`);await page.locator('[name=email]').fill(email);await fillPassword(page.locator('[name=password]'),password);await page.locator('.commune-form button').click();await expect(page).toHaveURL(`/${locale}/commune`,{timeout:30_000});}
 test.beforeAll(async()=>{
  process.env.PATH=join(process.env.LOCALAPPDATA??'','Programs','Podman')+';'+process.env.PATH;process.env.DOCKER_HOST='npipe:////./pipe/podman-machine-default';
  await bootstrapLocalStaff({...admin,fullName:'Promotion Reviewer',role:'ADMIN',language:'en'});
  for(const locale of ['ar','fr','en'] as const){const target=agents[locale],result=await bootstrapLocalStaff({...target,fullName:`Promotion Agent ${locale}`,role:'AGENT',language:locale});target.profileId=result.profileId;}
 });
 for(const locale of ['ar','fr','en'] as const)test(`${locale}: confirmation, password proof, audited promotion and renewed permissions`,async({page,browser})=>{
  const target=agents[locale],copy=staffPromotionCopy[locale],common=staffAdminCopy[locale],feedback=staffFeedbackCopy[locale];
  const memberContext=await browser.newContext(),member=await memberContext.newPage();
  try{
   await login(member,target.email,target.password,locale);await member.goto(`/${locale}/commune/staff`);await expect(member).toHaveURL(`/${locale}/commune/access-denied`);
   await login(page,admin.email,admin.password,locale);await page.goto(`/${locale}/commune/staff/${target.profileId}`);
   await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
   const form=page.locator('form').filter({has:page.getByRole('heading',{name:copy.title,exact:true})});
   for(const width of [1440,820,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(form.getByRole('button',{name:copy.title})).toBeVisible();}
   await form.locator('[name=reason]').fill('Owner-approved delegated account administration');
   await fillPassword(form.locator('[name=currentPassword]'),disposablePassword());
   await form.getByRole('checkbox').check();await form.getByRole('button',{name:copy.title}).click();
   let dialog=page.getByRole('dialog',{name:copy.title});await expect(dialog).toContainText(target.email);await dialog.locator('.btn.ghost').click();await expect(form).toBeVisible();
   await form.getByRole('button',{name:copy.title}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:copy.title})).toBeHidden();
   await form.getByRole('button',{name:copy.title}).click();await page.getByRole('dialog',{name:copy.title}).getByRole('button',{name:copy.title,exact:true}).click();await expect(form.getByRole('alert')).toContainText(common.reauth);
   await form.locator('[name=reason]').fill('Owner-approved delegated account administration');await fillPassword(form.locator('[name=currentPassword]'),admin.password);await form.getByRole('checkbox').check();
   await form.getByRole('button',{name:copy.title}).click();dialog=page.getByRole('dialog',{name:copy.title});expect((await new AxeBuilder({page}).include('dialog[open]').analyze()).violations.map(v=>v.id)).toEqual([]);
   await dialog.getByRole('button',{name:copy.title,exact:true}).click();await expect(page.getByRole('dialog',{name:feedback.successTitle})).toContainText(copy.success);await page.getByRole('dialog',{name:feedback.successTitle}).getByRole('button',{name:feedback.close}).click();await expect(page.locator('.commune-details')).toContainText(common.admin);await expect(page.getByRole('heading',{name:copy.title,exact:true})).toHaveCount(0);
   const db=postgres(e2eTarget().adminDatabaseUrl,{max:1});
   try{const [audit]=await db`select count(*)::int count from app.audit_events where resource_id=${target.profileId}::uuid and action='ROLE_CHANGED' and reason=${'Owner-approved delegated account administration'} and change_summary->>'command'='PROMOTE'`;expect(audit.count).toBe(1);}finally{await db.end();}
   await member.goto(`/${locale}/commune/account`);await expect(member).not.toHaveURL(`/${locale}/commune/account`);await memberContext.clearCookies();await login(member,target.email,target.password,locale);await member.goto(`/${locale}/commune/staff`);await expect(member.getByRole('heading',{name:common.title,exact:true})).toBeVisible();
  }finally{await memberContext.close();}
 });
});
