import {describe, expect, it} from 'vitest';
import {chikayaUrlSchema, keyForPath, pageRoutes, publicationSchema, publicSettingsSchema} from '../../src/features/public-content/model';

describe('public boundary validation', () => {
  it.each(['https://chikaya.ma/', 'https://www.chikaya.ma/'])('accepts official URL %s', value => {
    expect(chikayaUrlSchema.safeParse(value).success).toBe(true);
  });
  it.each(['javascript:alert(1)', 'http://chikaya.ma/', '/https://chikaya.ma/',
    'https://chikaya.ma.evil.test/', 'https://user@chikaya.ma/', 'https://chikaya.ma/?redirect=evil',
    'https://chikaya.ma:444/', 'https://evil.test/', 'https://chikaya.ma/#x'])('rejects unsafe URL %s', value => {
    expect(chikayaUrlSchema.safeParse(value).success).toBe(false);
  });
  it('requires exactly three complete translations without fallback', () => {
    const copy = {title: 'Development', body: 'Development content'};
    expect(publicationSchema.safeParse({ar: copy, fr: copy, en: copy}).success).toBe(true);
    expect(publicationSchema.safeParse({ar: copy, en: copy}).success).toBe(false);
    expect(publicationSchema.safeParse({ar: copy, fr: copy, en: {...copy, body: '<script>alert(1)</script>'}}).success).toBe(false);
  });
  it('recognizes only the fixed nine routes', () => {
    expect(Object.keys(pageRoutes)).toHaveLength(9);
    expect(keyForPath('')).toBe('HOME');
    expect(keyForPath('admin')).toBeUndefined();
    expect(keyForPath('../privacy')).toBeUndefined();
  });
  it('rejects administrative metadata in a public projection', () => {
    expect(publicSettingsSchema.safeParse({contact_phone: null, contact_email: null,
      chikaya_url: 'https://chikaya.ma/', commune_name: 'Demo', public_address: null,
      opening_hours: null, revision: 1}).success).toBe(false);
  });
});
