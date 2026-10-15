import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {localDatabaseUrl} from '../../scripts/local-target';
import {e2eTarget} from '../../scripts/e2e-target';
export function localFixtureAuth(){
 if(process.env.ABAYNOU_E2E_TARGET!==undefined){const target=e2eTarget();return createClient(target.apiUrl,target.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});}
 localDatabaseUrl();const status=JSON.parse(execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),'status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));const url=new URL(status.API_URL);if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54321')throw new Error('Local fixture Auth target required');return createClient(status.API_URL,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
