import 'server-only';
import {createHmac} from 'node:crypto';
import {canonicalComplaint,type ComplaintFields} from '@/features/complaints/model';

export function complaintFingerprint(input:ComplaintFields){
 const secret=process.env.COMMAND_FINGERPRINT_SECRET;
 if(!secret||! /^[a-f0-9]{64}$/.test(secret))throw new Error('Command fingerprint configuration unavailable');
 return createHmac('sha256',Buffer.from(secret,'hex')).update('COMPLAINT_SUBMIT:v1\n').update(JSON.stringify(canonicalComplaint(input))).digest();
}
export function complaintCommandFingerprint(type:'COMPLAINT_EDIT'|'COMPLAINT_WITHDRAW'|'COMPLAINT_START_REVIEW',value:unknown){
 const secret=process.env.COMMAND_FINGERPRINT_SECRET;
 if(!secret||! /^[a-f0-9]{64}$/.test(secret))throw new Error('Command fingerprint configuration unavailable');
 return createHmac('sha256',Buffer.from(secret,'hex')).update(`${type}:v1\n`).update(JSON.stringify(value)).digest();
}
