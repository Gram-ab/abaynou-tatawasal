'use server';
import {z} from 'zod';
import {currentApplicationUser} from '@/server/auth/application-user';
import {readCatalogues} from '@/server/catalogues/repository';
import {recoverComplaint,submitComplaint} from '@/server/complaints/repository';
import {complaintCommandSchema} from './model';

export async function submitComplaintAction(input:unknown){
 try{
  const actor=await currentApplicationUser(false);
  if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return {error:'session' as const};
  const parsed=complaintCommandSchema.safeParse(input);
  if(!parsed.success)return {error:'validation' as const};
  return await submitComplaint(actor,parsed.data);
 }catch(error){
  const code=(error as {code?:string}).code;
  return {error:code==='P0401'?'category':code==='P0402'?'location':code==='P0409'?'conflict':code==='P0429'?'throttled':code==='42501'?'session':code==='23514'?'validation':'uncertain'};
 }
}
export async function reloadComplaintCatalogues(){
 const actor=await currentApplicationUser(false);
 if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return null;
 try{return await readCatalogues();}catch{return null;}
}
export async function recoverComplaintAction(key:unknown){
 if(!z.string().uuid().safeParse(key).success)return {error:'validation'};
 try{
  const actor=await currentApplicationUser(false);
  if(!actor||actor.state!=='VALID'||actor.role!=='CITIZEN')return {error:'session'};
  return {reference:await recoverComplaint(actor,key as string)};
 }catch{return {error:'uncertain'};}
}
