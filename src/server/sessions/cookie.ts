import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
export const APP_SESSION_COOKIE='abaynou_app_session';
export function newSessionSecret(){const raw=randomBytes(32).toString('base64url');return {raw,digest:createHash('sha256').update(raw).digest()};}
export function digestSessionSecret(raw:string){return createHash('sha256').update(raw).digest();}
export async function readSessionSecret(){return (await cookies()).get(APP_SESSION_COOKIE)?.value??null;}
export async function writeSessionSecret(raw:string,expires:Date){(await cookies()).set(APP_SESSION_COOKIE,raw,{httpOnly:true,sameSite:'lax',secure:process.env.APP_ENV!=='local',path:'/',expires,priority:'high'});}
export async function clearSessionSecret(){(await cookies()).delete(APP_SESSION_COOKIE);}
