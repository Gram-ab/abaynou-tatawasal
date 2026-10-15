import {readFileSync} from 'node:fs';
import {localDatabaseUrl as verifiedLocalUrl} from '../../scripts/local-target';
import {e2eTarget} from '../../scripts/e2e-target';
function isolatedPath(url:string){
 const target=new URL(url),name=process.env.DEV04A_VERIFICATION_DATABASE;
 if(name){if(!/^dev04a_verify_[a-f0-9]{32}$/.test(name))throw new Error('Invalid isolated verification database');target.pathname='/'+name;}
 return target.href;
}
export function localDatabaseUrl(){return isolatedPath(verifiedLocalUrl());}
export function runtimeDatabaseUrl(){
 if(process.env.ABAYNOU_E2E_TARGET!==undefined){
  const target=e2eTarget(),runtime=new URL(target.adminDatabaseUrl);
  const password=process.env.E2E_APP_DATABASE_PASSWORD;
  if(!password)throw new Error('STOP: isolated app database credential missing');
  runtime.username='app_web';runtime.password=password;
  return runtime.href;
 }
 const value=readFileSync('.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)?.[1];
 if(!value)throw new Error('Local runtime configuration unavailable');
 const runtime=new URL(value),admin=new URL(verifiedLocalUrl());
 if(runtime.hostname!==admin.hostname||runtime.port!==admin.port||runtime.username!=='app_web'||runtime.pathname!=='/postgres')throw new Error('Unexpected runtime database target');
 return isolatedPath(value);
}
