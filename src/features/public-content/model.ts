import {z} from 'zod';

export const locales = ['ar', 'fr', 'en'] as const;
export const localeSchema = z.enum(locales);
export const pageRoutes = {
  HOME: '', HOW_IT_WORKS: 'how-it-works', SERVICE_SCOPE: 'service-scope',
  FAQ: 'faq', CONTACT: 'contact', USER_GUIDE: 'user-guide',
  PRIVACY: 'privacy', ACCESSIBILITY: 'accessibility', TERMS: 'terms'
} as const;
export type PageKey = keyof typeof pageRoutes;
export const pageKeySchema = z.enum(Object.keys(pageRoutes) as [PageKey, ...PageKey[]]);
export function keyForPath(path: string): PageKey | undefined {
  return (Object.keys(pageRoutes) as PageKey[]).find(key => pageRoutes[key] === path);
}
export const chikayaUrlSchema = z.string().max(200).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['chikaya.ma', 'www.chikaya.ma'].includes(url.hostname)
      && !url.username && !url.password && !url.port && url.pathname === '/'
      && !url.search && !url.hash && value === url.href;
  } catch { return false; }
}, 'Invalid official guidance URL');
export const phoneSchema = z.string().regex(/^\+?[0-9][0-9 ()-]{6,23}$/);
const boundedText = (max: number) => z.string().trim().min(1).max(max);
export const translationSchema = z.object({
  title: boundedText(200),
  body: boundedText(30000).refine(value => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 'Unsupported markup')
}).strict();
export const publicationSchema = z.object({
  ar: translationSchema, fr: translationSchema, en: translationSchema
}).strict();
export const publicPageSchema = translationSchema;
export const publicSettingsSchema = z.object({
  contact_phone: phoneSchema.nullable(),
  contact_email: z.email().max(254).nullable(),
  chikaya_url: chikayaUrlSchema,
  commune_name: boundedText(200),
  public_address: boundedText(1000).nullable(),
  opening_hours: boundedText(1000).nullable()
}).strict();
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
export type PublicPage = z.infer<typeof publicPageSchema>;
