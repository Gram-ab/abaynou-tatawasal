'use client';
import {createContext,useContext,useEffect,useRef,useMemo,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import type {ComplaintFields} from '../model';
export type FlowMemory={actor:string;key:string;fields:ComplaintFields;step:number;confirmed:boolean;uncertain:boolean};
const Context=createContext<{read:()=>FlowMemory|null;write:(value:FlowMemory|null)=>void}|null>(null);
export function ComplaintFlowMemory({children}:{children:ReactNode}){
 const memory=useRef<FlowMemory|null>(null),pathname=usePathname();
 const store=useMemo(()=>({read:()=>memory.current,write:(value:FlowMemory|null)=>{memory.current=value;}}),[]);
 useEffect(()=>{
  const active=/^\/(ar|fr|en)\/citizen\/complaints\/new$/.exec(pathname);
  if(!active)memory.current=null;
  else {
   // This flow changes locale without reloading, so synchronize the persistent root shell.
   document.documentElement.lang=active[1];
   document.documentElement.dir=active[1]==='ar'?'rtl':'ltr';
  }
 },[pathname]);
 return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useFlowMemory(){const memory=useContext(Context);if(!memory)throw new Error('Complaint flow provider required');return memory;}
