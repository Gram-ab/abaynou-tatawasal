import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export const e2eWorkdir=resolve('.local/e2e');
export const e2eAppOrigin='http://127.0.0.1:55300';
export const e2eMailpitOrigin='http://127.0.0.1:55324';
const expected={project:'Abaynou_Tatawasal_E2E',api:'55321',db:'55322',mailpit:'55324',smtp:'55325'};

function port(config:string,section:string){
 const text=config.split(`[${section}]`)[1]?.split('\n[')[0];
 return text?.match(/^port\s*=\s*(\d+)/m)?.[1];
}
function loopback(url:string,protocol:string,portNumber:string){
 const parsed=new URL(url);
 if(parsed.protocol!==protocol||!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.port!==portNumber)throw new Error('STOP: E2E target endpoint mismatch');
 return parsed;
}
export function assertIsolatedE2EConfig(config:string){
 if(!new RegExp(`^project_id = "${expected.project}"$`,'m').test(config)||
    port(config,'api')!==expected.api||port(config,'db')!==expected.db||
    port(config,'local_smtp')!==expected.mailpit||
    !config.includes('smtp_port = 55325')||
    !config.includes(`site_url = "${e2eAppOrigin}"`))throw new Error('STOP: E2E project configuration is not isolated');
}
export function e2eTarget(){
 if(process.env.ABAYNOU_E2E_TARGET!=='disposable')throw new Error('STOP: explicit disposable E2E target required');
 if(existsSync(resolve(e2eWorkdir,'supabase/.temp/project-ref')))throw new Error('STOP: linked E2E project marker exists');
 const config=readFileSync(resolve(e2eWorkdir,'supabase/config.toml'),'utf8');
 assertIsolatedE2EConfig(config);
 const status=JSON.parse(execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'status','--workdir',e2eWorkdir,'-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const api=loopback(status.API_URL,'http:',expected.api);
 const db=loopback(status.DB_URL,'postgresql:',expected.db);
 loopback(status.INBUCKET_URL??status.MAILPIT_URL??e2eMailpitOrigin,'http:',expected.mailpit);
 if(db.pathname!=='/postgres'||!status.SERVICE_ROLE_KEY||!status.ANON_KEY||api.port==='54321'||db.port==='54322')throw new Error('STOP: owner review stack is not an E2E target');
 return {apiUrl:api.href,adminDatabaseUrl:db.href,serviceRoleKey:String(status.SERVICE_ROLE_KEY),anonKey:String(status.ANON_KEY),appOrigin:e2eAppOrigin,mailpitOrigin:e2eMailpitOrigin};
}
