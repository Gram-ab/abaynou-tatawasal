import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

/** Admin tools only: never accept a caller-supplied database target. */
export function localDatabaseUrl(): string {
  if (existsSync('supabase/.temp/project-ref')) throw new Error('STOP: linked project marker exists');
  const config = readFileSync('supabase/config.toml', 'utf8');
  if (!/^project_id = "Abaynou_Tatawasal"$/m.test(config)) throw new Error('STOP: unexpected local project');
  const sectionPort = (section: string) => {
    const sectionText = config.split(`[${section}]`)[1]?.split('\n[')[0];
    const port = sectionText?.match(/^port\s*=\s*(\d+)/m)?.[1];
    if (!port) throw new Error('STOP: missing local port configuration');
    return port;
  };
  const status = JSON.parse(execFileSync(process.execPath,
    [resolve('node_modules/supabase/dist/supabase.js'), 'status', '-o', 'json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    }));
  const db = new URL(status.DB_URL);
  const api = new URL(status.API_URL);
  if (!['127.0.0.1', 'localhost'].includes(db.hostname) || db.port !== sectionPort('db')
      || !['127.0.0.1', 'localhost'].includes(api.hostname) || api.port !== sectionPort('api')
      || db.pathname !== '/postgres' || !['postgres:', 'postgresql:'].includes(db.protocol)) {
    throw new Error('STOP: database target is not the expected disposable local stack');
  }
  return db.href;
}
