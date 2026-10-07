import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { askRumi } from '@/src/utils/ask';
import { formatMoney } from '@/src/utils/money';

/** Categories Rumi creates from a description must be askable like any other. */
function translator(lang: 'en' | 'es') {
  const dict = translations[lang] as Record<string, string>;
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(dict[key] ?? key, params);
}
const format = (n: number) => formatMoney(n, 'COP');

function tree(lang: 'en' | 'es'): SpendConcept[] {
  const c = translations[lang] as Record<string, string>;
  return [
    {
      id: 'concept-sport',
      name: c['newCat.sport'],
      color: '#06D6A0',
      subs: [
        { id: 'sub-football', name: c['newSub.football'] },
        { id: 'sub-gym', name: c['newSub.gym'] },
      ],
    },
    {
      id: 'concept-food',
      name: c['newCat.food'],
      color: '#E07A5F',
      subs: [{ id: 'sub-meals', name: c['newSub.meals'] }],
    },
    {
      id: 'concept-transport',
      name: c['newCat.transport'],
      color: '#2EC4B6',
      subs: [{ id: 'sub-fuel', name: c['newSub.fuel'] }],
    },
  ];
}

const tx = (id: string, amount: number, categoryId: string): Transaction => ({
  id,
  type: 'expense',
  amount,
  categoryId,
  accountId: 'cash',
  createdAt: new Date('2026-10-10T12:00:00').toISOString(),
});

const data = [
  tx('1', 20_000, 'sub-football'),
  tx('2', 90_000, 'sub-gym'),
  tx('3', 15_000, 'sub-meals'),
  tx('4', 100_000, 'sub-fuel'),
];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00'));
});
afterEach(() => jest.useRealTimers());

const ask = (q: string, lang: 'en' | 'es') =>
  askRumi(q, data, format, translator(lang), { language: lang, spendConcepts: tree(lang) });

describe.each([
  ['es', 'cuánto gasté en deporte este mes', 'cuánto gasté en fútbol este mes', 'cuánto gasté en gasolina este mes'],
  ['en', 'how much did I spend on sport this month', 'how much did I spend on football this month', 'how much did I spend on fuel this month'],
] as const)('asking about what Rumi created (%s)', (lang, sport, football, fuel) => {
  it('a whole created category counts all its subs', () => {
    expect(ask(sport, lang).txs.map((x) => x.id).sort()).toEqual(['1', '2']);
  });
  it('a created sub counts only itself', () => {
    expect(ask(football, lang).txs.map((x) => x.id)).toEqual(['1']);
    expect(ask(fuel, lang).txs.map((x) => x.id)).toEqual(['4']);
  });
});
