import type {ReactNode} from 'react';
import {getLocale} from 'next-intl/server';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '../styles/globals.css';
import '../styles/public-shell.css';
import '../styles/citizen-shell.css';

export default async function RootLayout({children}: {children: ReactNode}) {
  const locale = await getLocale();
  return <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}><body suppressHydrationWarning>{children}</body></html>;
}
