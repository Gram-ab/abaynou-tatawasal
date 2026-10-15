import {cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {e2eWorkdir} from './e2e-target';

const destination=resolve(e2eWorkdir,'supabase');
mkdirSync(destination,{recursive:true});
const original=readFileSync('supabase/config.toml','utf8');
let config=original.replace('project_id = "Abaynou_Tatawasal"','project_id = "Abaynou_Tatawasal_E2E"');
for(const [from,to] of [['54321','55321'],['54322','55322'],['54320','55320'],['54323','55323'],['54324','55324'],['54325','55325'],['54326','55326'],['54327','55327'],['54329','55329'],['3000','55300']])config=config.replaceAll(from,to);
if(config===original||config.includes('127.0.0.1:3000')||config.includes('port = 54321'))throw new Error('STOP: isolated E2E configuration failed');
writeFileSync(resolve(destination,'config.toml'),config);
cpSync('supabase/migrations',resolve(destination,'migrations'),{recursive:true,force:true});
cpSync('supabase/templates',resolve(destination,'templates'),{recursive:true,force:true});
cpSync('supabase/functions',resolve(destination,'functions'),{recursive:true,force:true});
cpSync('supabase/snippets',resolve(destination,'snippets'),{recursive:true,force:true});
console.log('Disposable E2E configuration prepared under ignored .local/e2e; owner Supabase configuration was not changed.');
