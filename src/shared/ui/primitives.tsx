import type {ReactNode} from 'react';
export function Card({children,className=''}:{children:ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>;}
export function Callout({children}:{children:ReactNode}){return <aside className="callout">{children}</aside>;}
export function State({title,children}:{title:string;children:ReactNode}){return <section className="section container prose state"><h1>{title}</h1>{children}</section>;}
