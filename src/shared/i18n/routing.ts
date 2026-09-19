import {defineRouting} from 'next-intl/routing';
export const locales = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const routing = defineRouting({locales, defaultLocale: 'ar', localePrefix: 'always', localeDetection: false});
