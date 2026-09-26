import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {localDatabaseUrl} from './local-target';
/** Local-only schema-owner operation: postgres has USAGE but no grant option on Supabase Auth. */
export function ensureLocalComplaintAuthUsage(){
 localDatabaseUrl();
 execFileSync(join(process.env.LOCALAPPDATA??'','Programs','Podman','podman.exe'),[
  'exec','supabase_db_Abaynou_Tatawasal','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-c',
  'GRANT USAGE ON SCHEMA auth TO app_writer;'
 ],{stdio:['ignore','ignore','pipe']});
}
