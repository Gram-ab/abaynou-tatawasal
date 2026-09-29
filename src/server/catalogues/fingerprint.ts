import 'server-only';
import {createHmac} from 'node:crypto';
export function catalogueFingerprint(type:string,value:unknown){const secret=process.env.COMMAND_FINGERPRINT_SECRET;if(!secret||!/^[a-f0-9]{64}$/.test(secret))throw new Error('Command fingerprint configuration unavailable');return createHmac('sha256',Buffer.from(secret,'hex')).update(`${type}:v1\n`).update(JSON.stringify(value)).digest();}

