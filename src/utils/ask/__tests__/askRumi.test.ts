import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import { askRumi, type AskIntent } from '@/src/utils/ask';
import { formatMoney } from '@/src/utils/money';

function translator(lang: 'en' | 'es') {
  const dict = translations[lang] as Record<string, string>;
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(dict[key] ?? key, params);
}
const format = (n: number) => formatMoney(n, 'COP');

let seq = 0;
function tx(type: Transaction['type'], amount: number, when: string, extra: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return { id: `t${seq}`, type, amount, createdAt: new Date(when).toISOString(), accountId: 'cash', ...extra };
}

const data = [
  tx('income', 3_000_000, '2026-10-01T09:00', { categoryId: 'salario' }),
  tx('expense', 12_000, '2026-10-03T09:00', { categoryId: 'cafe', paymentMethod: 'cash' }),
  tx('expense', 45_000, '2026-10-05T20:00', { categoryId: 'delivery', note: 'Pizza familiar' }),
  tx('expense', 9_000, '2026-10-14T09:00', { categoryId: 'cafe' }),
  tx('expense', 15_000, '2026-10-18T09:00', { categoryId: 'snacks' }),
  tx('expense', 20_000, '2026-09-12T09:00', { categoryId: 'cafe' }),
  tx('expense', 80_000, '2026-09-10T09:00', { categoryId: 'transporte' }),
];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00')); // Tuesday
});
afterEach(() => jest.useRealTimers());

const ask = (q: string, language: 'es' | 'en' = 'es') =>
  askRumi(q, data, format, translator(language), {
    language,
    availableCash: 500_000,
    debtsTotal: 1_200_000,
  });

/** Golden table: question → who answers and which period it read. */
describe('askRumi intents', () => {
  it.each<[string, AskIntent | null, string | null]>([
    ['¿Cuánto gasté en café?', 'concept', 'Este mes'],
    ['¿cuánto gasté en café la semana pasada?', 'concept', 'la semana pasada'],
    ['¿cuánto gasté los últimos 7 días?', 'totals', 'últimos 7 días'],
    ['¿cuánto gasté en los ultimos quince dias?', 'totals', 'últimos 15 días'],
    ['gastos del fin de semana', 'totals', 'el fin de semana pasado'],
    ['¿cuánto gasté hace 17 días?', 'totals', '3 de octubre 2026'],
    ['café vs el mes pasado', 'concept', 'Este mes'],
    ['¿gasté más que el mes pasado?', 'comparePeriods', 'Este mes'],
    ['¿cuánto gasté en café y delivery?', 'concept', 'Este mes'],
    ['¿cuánto gasté en pizza?', 'looseNote', 'Este mes'],
    ['¿cuánto me queda?', 'leftNow', 'Este mes'],
    ['¿cuánto me queda hasta fin de mes?', 'projection', 'Este mes'],
    ['¿cuánto ahorré el mes pasado?', 'savings', 'Mes pasado'],
    ['¿puedo comprar algo de 200 mil?', 'afford', 'Este mes'],
    ['¿en qué puedo recortar?', 'cut', 'Este mes'],
    ['¿en qué gasté más?', 'top', 'Este mes'],
    ['¿cuánto gané?', 'income', 'Este mes'],
    ['¿cuánto debo?', 'debtBalance', 'Este mes'],
    ['¿cuáles son mis gastos hormiga?', 'ant', 'Este mes'],
    ['¿qué porcentaje de mi salario se va en delivery?', 'percent', 'Este mes'],
    ['¿cuánto gasté en efectivo?', 'paymentMethod', 'Este mes'],
    ['hola', null, null],
  ])('%s → %s', (q, intent, period) => {
    const r = ask(q);
    expect(r.intent).toBe(intent);
    expect(r.understood?.period ?? null).toBe(period);
  });

  it('reads English questions too', () => {
    const r = ask('How much did I spend on coffee last week?', 'en');
    expect(r.intent).toBe('concept');
    expect(r.understood).toEqual({ period: 'last week', concept: 'Coffee' });
  });
});

describe('askRumi result', () => {
  it('names what it understood and returns the movements behind it, newest first', () => {
    const r = ask('¿cuánto gasté en café?');
    expect(r.understood).toEqual({ period: 'Este mes', concept: 'Café' });
    expect(r.txs.map((x) => x.amount)).toEqual([9_000, 12_000]);
  });

  it('offers follow-ups that the engine itself understands', () => {
    const r = ask('¿cuánto gasté en café?');
    expect(r.followUps).toEqual([
      'Café vs el mes pasado',
      '¿Cuántas veces Café?',
      'Café la semana pasada',
    ]);
    expect(r.followUps.map((f) => ask(f).intent)).toEqual(['concept', 'concept', 'concept']);
  });

  it('drops follow-ups that repeat the question', () => {
    expect(ask('¿Gasté más que el mes pasado?').followUps).not.toContain('¿Gasté más que el mes pasado?');
  });

  it('has no follow-ups or movements when it did not understand', () => {
    expect(ask('hola')).toMatchObject({ txs: [], followUps: [], understood: null });
  });
});
