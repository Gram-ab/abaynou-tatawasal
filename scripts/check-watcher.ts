import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
async function main(){
 const path='src/styles/globals.css';const original=readFileSync(path,'utf8');const browser=await chromium.launch();
 try{
  writeFileSync(path,original+'\n:root{--devwatch-proof:before}\n');
  const page=await browser.newPage();await page.goto('http://127.0.0.1:3001/ar',{timeout:120000});
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--devwatch-proof').trim()==='before');
  writeFileSync(path,original+'\n:root{--devwatch-proof:after}\n');
  await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--devwatch-proof').trim()==='after',{},{timeout:30000});
  console.log('PASS OneDrive Next.js watcher: live CSS update received without page reload.');
 }finally{writeFileSync(path,original);await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
