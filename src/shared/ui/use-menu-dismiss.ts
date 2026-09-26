'use client';
import {useEffect,useRef} from 'react';

export function useMenuDismiss(open:boolean,close:()=>void,collapseWidth=820){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))close();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){close();root.current?.querySelector<HTMLButtonElement>('.hamb')?.focus();}};
  const resize=()=>{if(window.innerWidth>collapseWidth)close();};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keyboard);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard);window.removeEventListener('resize',resize);};
 },[open,close,collapseWidth]);
 return root;
}
