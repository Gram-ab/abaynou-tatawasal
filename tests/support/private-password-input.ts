import {expect as playwrightExpect,type Locator} from '@playwright/test';

// Do not capture DOM snapshots containing revealed password inputs on failure.
process.env.PLAYWRIGHT_NO_COPY_PROMPT='1';

/** Native input events, without passing plaintext to Playwright's fill call log. */
export async function fillPassword(input:Locator,value:string){
 // Wait for React to attach the controlled input handler before dispatching input.
 await playwrightExpect.poll(()=>input.evaluate(element=>Object.keys(element).some(key=>key.startsWith('__reactProps$')))).toBe(true);
 await input.focus();
 await input.evaluate((element,value)=>{
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
  setter.call(element,value);
  element.dispatchEvent(new Event('input',{bubbles:true}));
  element.dispatchEvent(new Event('change',{bubbles:true}));
 },value);
}

/** A failed assertion reports only a boolean, never either password value. */
export async function expectPassword(input:Locator,value:string){
 await playwrightExpect.poll(async()=>await input.inputValue()===value).toBe(true);
}

const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();
const matches=(actual:string|null,expected:string|RegExp)=>actual!==null&&(typeof expected==='string'?normalize(actual)===normalize(expected):expected.test(actual));
const matchesExact=(actual:string|null,expected:string|RegExp)=>actual!==null&&(typeof expected==='string'?actual===expected:expected.test(actual));

/** Locator failures normally embed a whole-page ARIA snapshot, including password values.
 * Poll the same observable conditions but report only booleans in these credential specs. */
function privateLocatorExpect(locator:Locator,negated=false){
 const check=(condition:()=>Promise<boolean>,options?:{timeout?:number})=>playwrightExpect.poll(condition,{timeout:options?.timeout??10_000}).toBe(!negated);
 return {
  get not(){return privateLocatorExpect(locator,!negated);},
  toBeVisible:(options?:{timeout?:number})=>check(()=>locator.isVisible(),options),
  toBeHidden:(options?:{timeout?:number})=>check(()=>locator.isHidden(),options),
  toBeEnabled:(options?:{timeout?:number})=>check(()=>locator.isEnabled(),options),
  toBeChecked:(options?:{timeout?:number})=>check(()=>locator.isChecked(),options),
  toBeFocused:(options?:{timeout?:number})=>check(()=>locator.evaluate(element=>element===document.activeElement),options),
  toHaveCount:(count:number,options?:{timeout?:number})=>check(async()=>await locator.count()===count,options),
  toHaveValue:(value:string|RegExp,options?:{timeout?:number})=>check(async()=>matchesExact(await locator.inputValue(),value),options),
  toHaveAttribute:(name:string,value:string|RegExp,options?:{timeout?:number})=>check(async()=>matchesExact(await locator.getAttribute(name),value),options),
  toHaveText:(value:string|RegExp,options?:{timeout?:number})=>check(async()=>await locator.count()===1&&matches(await locator.textContent(),value),options),
  toContainText:(value:string|RegExp,options?:{timeout?:number})=>check(async()=>{
   if(await locator.count()!==1)return false;
   const actual=normalize(await locator.textContent()??'');
   return typeof value==='string'?actual.includes(normalize(value)):value.test(actual);
  },options),
 };
}
export const expect=Object.assign((actual:unknown,...rest:unknown[])=>{
 if(actual&&typeof actual==='object'&&'count' in actual&&'inputValue' in actual)return privateLocatorExpect(actual as Locator);
 return playwrightExpect(actual,...rest as [string?]);
},playwrightExpect) as typeof playwrightExpect;
