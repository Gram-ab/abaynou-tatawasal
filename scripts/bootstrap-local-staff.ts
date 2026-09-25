import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bootstrapLocalStaff} from './local-staff';
async function hiddenPassword():Promise<string>{
 if(!stdin.isTTY)throw new Error('Interactive terminal required');
 stdout.write('Password (hidden; at least 15 characters): ');stdin.setEncoding('utf8');stdin.setRawMode(true);stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const done=()=>{stdin.off('data',onData);stdin.setRawMode(false);stdin.pause();stdout.write('\n');};const onData=(data:string)=>{for(const char of data){if(char==='\u0003'){done();reject(new Error('Cancelled'));return;}if(char==='\r'||char==='\n'){done();resolve(value);return;}if(char==='\u007f'||char==='\b'){value=Array.from(value).slice(0,-1).join('');}else if(char>=' ')value+=char;}};stdin.on('data',onData);});
}
async function main(){
 if(!stdin.isTTY||!stdout.isTTY)throw new Error('Use an interactive local terminal; credentials are never CLI arguments');
 const podman=join(process.env.LOCALAPPDATA??'','Programs','Podman','podman.exe');if(!existsSync(podman))throw new Error('Local Podman installation required');
 const pipe=execFileSync(podman,['machine','inspect','--format','{{.ConnectionInfo.PodmanPipe.Path}}'],{encoding:'utf8'}).trim();if(pipe!=='\\\\.\\pipe\\podman-machine-default')throw new Error('Unexpected Podman target');
 process.env.PATH=join(process.env.LOCALAPPDATA??'','Programs','Podman')+';'+process.env.PATH;process.env.DOCKER_HOST='npipe:////./pipe/podman-machine-default';
 const rl=createInterface({input:stdin,output:stdout});
 const role=(await rl.question('Role (AGENT or ADMIN): ')).trim();const email=await rl.question('Synthetic local email: ');const fullName=await rl.question('Full name: ');const language=(await rl.question('Language (ar/fr/en; default ar): ')).trim()||'ar';rl.close();
 const password=await hiddenPassword();
 if(role!=='AGENT'&&role!=='ADMIN')throw new Error('Choose AGENT or ADMIN');if(language!=='ar'&&language!=='fr'&&language!=='en')throw new Error('Choose ar, fr or en');
 const result=await bootstrapLocalStaff({role,email,fullName,language,password});console.log(result.created?'Local staff account created with audit evidence.':'Matching local staff account already exists; credentials unchanged.');
}
main().catch(()=>{console.error('Staff bootstrap stopped. Check the local stack, input policy, and existing identity conflicts. No credentials were printed.');process.exitCode=1;});
