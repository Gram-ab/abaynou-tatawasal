import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {localDatabaseUrl} from './local-target';
const action=process.argv[2];
if(!['start','status','reset','seed','verify'].includes(action))throw new Error('Use start, status, reset, seed, or verify');
if(!existsSync('supabase/config.toml') || existsSync('supabase/.temp/project-ref'))throw new Error('STOP: expected unlinked local project');
if(!/^project_id = "Abaynou_Tatawasal"$/m.test(readFileSync('supabase/config.toml','utf8')))throw new Error('STOP: unexpected project');
const podman=join(process.env.LOCALAPPDATA??'','Programs','Podman','podman.exe');
if(!existsSync(podman))throw new Error('Podman executable not found in the documented local installation');
process.env.PATH=join(process.env.LOCALAPPDATA??'','Programs','Podman')+';'+process.env.PATH;
const pipe=execFileSync(podman,['machine','inspect','--format','{{.ConnectionInfo.PodmanPipe.Path}}'],{encoding:'utf8'}).trim();
if(pipe!=='\\\\.\\pipe\\podman-machine-default')throw new Error('STOP: unexpected local Podman pipe');
process.env.DOCKER_HOST='npipe:////./pipe/podman-machine-default';
function run(script:string,args:string[]){const result=spawnSync(process.execPath,[resolve(script),...args],{stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1);}
const cli='node_modules/supabase/dist/supabase.js';
const tsx='node_modules/tsx/dist/cli.mjs';
if(action==='start')run(cli,['start']);
if(action==='status'){
 const db=new URL(localDatabaseUrl());console.log(`Verified local project: ${db.hostname}:${db.port}${db.pathname}; no linked-project marker.`);
 const result=spawnSync(podman,['ps','--filter','label=com.supabase.cli.project=Abaynou_Tatawasal','--format','{{.Names}} {{.Status}}'],{stdio:'inherit'});if(result.status)process.exit(result.status);
}
if(action==='reset'){localDatabaseUrl();run(cli,['db','reset','--local']);run(tsx,['scripts/seed-local.ts','--runtime-credential']);}
if(action==='seed'){localDatabaseUrl();run(tsx,['scripts/seed-local.ts']);}
if(action==='verify'){localDatabaseUrl();run(tsx,['tests/database/foundation.ts']);run(tsx,['tests/database/public-boundary.ts']);}
