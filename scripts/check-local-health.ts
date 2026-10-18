import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {probeLocalDatabase} from '../src/server/monitoring/database';
import {assertLocalHealthConfiguration,localHealthAlertTransport} from '../src/server/monitoring/local';
import {MonitorStorageError,withLocalMonitorStore} from '../src/server/monitoring/store';
import {runLocalMonitor} from '../src/server/monitoring/run';

async function main(){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--help'){console.log('pnpm health:check — one local read-only check; no email or scheduling.\npnpm health:check --notify-local — also deliver pending alerts to local Mailpit only.');return;}
 if(args.some(arg=>arg!=='--notify-local'))throw new Error('LOCAL_HEALTH_ARGUMENT_INVALID');
 if(existsSync('.env.local'))process.loadEnvFile('.env.local');
 const databaseUrl=assertLocalHealthConfiguration({APP_ENV:process.env.APP_ENV,DATABASE_URL:process.env.DATABASE_URL},readFileSync('supabase/config.toml','utf8'),existsSync('supabase/.temp/project-ref'));
 const notify=args.includes('--notify-local'),directory=resolve('.local/monitoring/local');
 const result=await withLocalMonitorStore(directory,async store=>{
  const transport=notify?localHealthAlertTransport():undefined;
  try{return await runLocalMonitor({store,probe:()=>probeLocalDatabase(databaseUrl),transport});}
  finally{transport?.close?.();}
 });
 console.log(`${result.check.status} | ${result.check.checkedAt} | ${result.check.category} | ${result.check.durationMs} ms | attempts=${result.check.attempts}`);
 console.log(`Alerts: ${result.alerts}; SMTP accepted=${result.accepted.length}. Local history: .local/monitoring/local/history.ndjson`);
 if(!notify)console.log('Email disabled. --notify-local enables local Mailpit delivery only. No schedule is running.');
 process.exitCode=result.alerts==='failed'?2:result.check.status==='PASS'?0:1;
}
main().catch(error=>{
 const safeCodes=['LOCAL_HEALTH_ARGUMENT_INVALID','LOCAL_HEALTH_CONFIGURATION_INVALID'];
 const code=error instanceof MonitorStorageError?error.code:error instanceof Error&&safeCodes.includes(error.message)?error.message:'LOCAL_HEALTH_RUNTIME_ERROR';
 console.error(`ERROR | ${code}. Review docs/local-health-monitor.md. No credentials or raw exceptions were logged.`);
 process.exitCode=error instanceof MonitorStorageError&&error.code==='MONITOR_BUSY'?3:2;
});
