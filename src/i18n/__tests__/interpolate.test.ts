import { interpolate } from '@/src/i18n/interpolate';
import { translations } from '@/src/i18n/translations';

describe('interpolate', () => {
  it('fills placeholders', () => {
    expect(interpolate('Hi, {name}', { name: 'Ana' })).toBe('Hi, Ana');
  });

  it('picks singular or plural by number', () => {
    const tpl = '{count} {count|movement|movements}';
    expect(interpolate(tpl, { count: 1 })).toBe('1 movement');
    expect(interpolate(tpl, { count: 3 })).toBe('3 movements');
    expect(interpolate(tpl, { count: 0 })).toBe('0 movements');
  });

  it('leaves unknown placeholders alone', () => {
    expect(interpolate('{a} {b|x|y}', { a: 1 })).toBe('1 {b|x|y}');
  });
});

describe('translations', () => {
  const placeholders = (s: string) =>
    (s.match(/\{(\w+)(?:\|[^{}]*)?\}/g) ?? []).map((p) => p.replace(/\|.*\}$/, '}')).sort();

  it('has the same keys and placeholders in English and Spanish', () => {
    const en = translations.en as Record<string, string>;
    const es = translations.es as Record<string, string>;
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en)) {
      expect([key, [...new Set(placeholders(es[key]))]]).toEqual([key, [...new Set(placeholders(en[key]))]]);
    }
  });
});
