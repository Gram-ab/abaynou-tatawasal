import 'server-only';
import postgres from 'postgres';
let connection: ReturnType<typeof postgres> | undefined;
export function publicDatabase() {
 if(connection)return connection;
 const value=process.env.DATABASE_URL;
 if(!value)throw new Error('Public data configuration unavailable');
 const url=new URL(value);
 if(url.username!=='app_web')throw new Error('Restricted runtime identity required');
 if(process.env.APP_ENV==='local' && !['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local runtime must use loopback');
 connection=postgres(value,{max:5,connect_timeout:5,idle_timeout:20,max_lifetime:600,onnotice:()=>{},connection:{statement_timeout:5000}});
 return connection;
}
