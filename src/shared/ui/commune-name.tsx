'use client';
import {createContext,useContext} from 'react';
export const CommuneNameContext=createContext<string|null>(null);
export function CommuneNameProvider({name,children}:{name:string|null;children:React.ReactNode}){return <CommuneNameContext.Provider value={name}>{children}</CommuneNameContext.Provider>;}
export function useCommuneName(){return useContext(CommuneNameContext);}
