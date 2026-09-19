'use client';
export default function GlobalError({reset}:{reset:()=>void}){return <html lang="ar" dir="rtl"><body><main><h1>تعذر تحميل الصفحة</h1><p lang="fr">Impossible de charger la page.</p><p lang="en">The page could not be loaded.</p><button onClick={reset}>حاول مجددا / Réessayer / Try again</button></main></body></html>;}
