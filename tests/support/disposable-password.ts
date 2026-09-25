import {randomBytes,randomInt} from 'node:crypto';

/** Ephemeral test input only; callers may request invalid lengths for boundary tests. */
export function disposablePassword(length=32){return randomBytes(length).toString('hex').slice(0,length);}
export function lowercasePassphrase(){return Array.from({length:4},()=>Array.from({length:6},()=>String.fromCharCode(randomInt(97,123))).join('')).join(' ');}
export function unicodePassword(length:number){const character=String.fromCodePoint(randomInt(0x1f600,0x1f650));return character.repeat(length);}
