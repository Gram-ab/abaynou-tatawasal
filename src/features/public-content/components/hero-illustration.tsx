import Image from 'next/image';
import {preload} from 'react-dom';

const fallback='/assets/hero-commune-1600.webp';
const srcSet='/assets/hero-commune-640.webp 640w, /assets/hero-commune-1024.webp 1024w, /assets/hero-commune-1600.webp 1600w';
const sizes='(max-width: 600px) calc(100vw - 32px), (max-width: 820px) 560px, (max-width: 1100px) 48vw, 616px';

export function HeroIllustration({alt}:{alt:string}){
 // Match the responsive preload to picture selection: no fallback-only download
 // and no Vercel runtime transformation of the already prepared WebP assets.
 preload(fallback,{as:'image',imageSrcSet:srcSet,imageSizes:sizes,fetchPriority:'high'});
 return <picture className="hero-picture"><source type="image/webp" srcSet={srcSet} sizes={sizes}/><Image className="hero-illustration" src={fallback} alt={alt} width={1600} height={634} unoptimized loading="eager" fetchPriority="high"/></picture>;
}
