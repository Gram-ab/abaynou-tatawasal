import {chromium} from '@playwright/test';
import {e2eTarget} from './e2e-target';
import {messages} from '../src/shared/i18n/messages';

async function main(){
 const target=e2eTarget();
 const browser=await chromium.launch();
 try{const page=await browser.newPage();
  for(const locale of ['ar','fr','en'] as const){
   const response=await page.goto(`${target.appOrigin}/${locale}/unavailable`);
   if(response?.status()!==200||await page.locator('h1').innerText()!==messages[locale].unavailableTitle||!(await page.locator('main').innerText()).includes(messages[locale].unavailable)||await page.locator('html').getAttribute('dir')!==(locale==='ar'?'rtl':'ltr'))throw new Error(`Unavailable route failed in ${locale}`);
  }
 }finally{await browser.close();}
 console.log('Temporary unavailable page passed AR/FR/EN browser and direction checks.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Unavailable route check failed');process.exitCode=1;});
