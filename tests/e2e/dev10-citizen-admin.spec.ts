import {randomUUID} from 'node:crypto';
import {test,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';
import {expect,fillPassword} from '../support/private-password-input';
import {disposablePassword} from '../support/disposable-password';
import {localFixtureAuth} from '../support/local-fixtures';
import {bootstrapLocalStaff} from '../../scripts/local-staff';
import {runtimeDatabaseUrl} from '../database/target';

test.use({trace:'off',screenshot:'off',video:'off'});
const adminEmail=`dev10-admin-${randomUUID()}@example.test`,adminPassword=disposablePassword();
const agentEmail=`dev10-agent-${randomUUID()}@example.test`,agentPassword=disposablePassword();
const citizenEmail=`dev10-citizen-${randomUUID()}@example.test`,citizenPassword=disposablePassword();
let citizenId='';

async function staffLogin(page:Page,email:string,password:string){
 await page.goto('/en/commune/login');await page.locator('[name=email]').fill(email);
 await fillPassword(page.locator('[name=password]'),password);
 await page.locator('.commune-form button').click();await expect(page).toHaveURL('/en/commune');
}
async function citizenLogin(page:Page){
 await page.goto('/en/login');await page.getByLabel('Email address').fill(citizenEmail);
 await fillPassword(page.locator('[name=password]'),citizenPassword);
 await page.locator('form').filter({has:page.locator('[name=password]')}).locator('button[type=submit]').click();
}

test.describe.serial('DEV-10 Citizen account administration',()=>{
 test.setTimeout(120_000);
 test.beforeAll(async()=>{
  await bootstrapLocalStaff({email:adminEmail,password:adminPassword,fullName:'DEV10 Review Admin',role:'ADMIN',language:'en'});
  await bootstrapLocalStaff({email:agentEmail,password:agentPassword,fullName:'DEV10 Review Agent',role:'AGENT',language:'en'});
  const auth=localFixtureAuth(),created=await auth.auth.admin.createUser({email:citizenEmail,password:citizenPassword,email_confirm:true});
  expect(created.error).toBeNull();
  const db=postgres(runtimeDatabaseUrl(),{max:1,onnotice:()=>{}});
  try{const [legal]=await db`select * from app.read_signup_legal('en')`;
   const [profile]=await db`select * from app.provision_citizen(${created.data.user!.id},'DEV10 Review Citizen',null,'en',${legal.terms_version_id},${legal.privacy_version_id})`;
   citizenId=profile.profile_id;
  }finally{await db.end();}
 });
 test('Admin disables and reactivates; old Citizen session remains unusable',async({browser})=>{
  const adminContext=await browser.newContext(),citizenContext=await browser.newContext();
  const admin=await adminContext.newPage(),citizen=await citizenContext.newPage();
  try{
   await staffLogin(admin,adminEmail,adminPassword);
   await citizenLogin(citizen);await expect(citizen).toHaveURL('/en/citizen');
   await admin.goto('/en/commune/citizens');
   await expect(admin.getByRole('heading',{name:'Citizen accounts'})).toBeVisible();
   await admin.locator('[name=q]').fill(citizenEmail);await admin.getByRole('button',{name:'Apply'}).click();
   await expect(admin.locator('.citizen-admin-table')).toContainText(citizenEmail);
   await admin.getByRole('link',{name:'View details'}).click();
   await expect(admin).toHaveURL(`/en/commune/citizens/${citizenId}`);
   const disable=admin.locator('.citizen-admin-action');
   await disable.locator('[name=reason]').fill('Administrative access review');
   await fillPassword(disable.locator('[name=currentPassword]'),adminPassword);
   await disable.getByRole('button',{name:'Disable account'}).click();
   await admin.getByRole('dialog',{name:'Disable account'}).getByRole('button',{name:'Confirm'}).click();
   await expect(admin.locator('.commune-details')).toContainText('Disabled');
   await citizen.goto('/en/citizen/account');await expect(citizen).not.toHaveURL('/en/citizen/account');
   await citizenContext.clearCookies();await citizenLogin(citizen);
   await expect(citizen).not.toHaveURL('/en/citizen');
   const enable=admin.locator('.citizen-admin-action');
   await enable.locator('[name=reason]').fill('Administrative review completed');
   await fillPassword(enable.locator('[name=currentPassword]'),adminPassword);
   await enable.getByRole('button',{name:'Reactivate account'}).click();
   await admin.getByRole('dialog',{name:'Reactivate account'}).getByRole('button',{name:'Confirm'}).click();
   await expect(admin.locator('.commune-details')).toContainText('Active');
   await citizenContext.clearCookies();await citizenLogin(citizen);await expect(citizen).toHaveURL('/en/citizen');
  }finally{await citizenContext.close();await adminContext.close();}
 });
 test('Agent denied; AR/FR/EN and compact layout remain accessible',async({page})=>{
  await staffLogin(page,agentEmail,agentPassword);await page.goto('/en/commune/citizens');
  await expect(page).toHaveURL('/en/commune/access-denied');
  await page.context().clearCookies();await staffLogin(page,adminEmail,adminPassword);
  for(const locale of ['ar','fr','en'] as const){
   await page.goto(`/${locale}/commune/citizens/${citizenId}`);
   await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar'?'rtl':'ltr');
   await page.setViewportSize({width:320,height:844});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:1440,height:1000});
  expect((await new AxeBuilder({page}).include('.citizen-admin').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id)).toEqual([]);
 });
});
