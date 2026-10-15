import 'server-only';
import postgres from 'postgres';
import {restrictedDatabaseOptions} from './options';
let connection:ReturnType<typeof postgres>|undefined;
export function publicDatabase(){
 if(connection)return connection;
 const value=process.env.DATABASE_URL;
 if(!value)throw new Error('Public data configuration unavailable');
 connection=postgres(value,restrictedDatabaseOptions(value,'app_web'));
 return connection;
}
