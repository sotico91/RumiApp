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
  tx('transfer', 300_000, '2026-10-08T09:00', { accountId: 'debt:rot', toAccountId: 'savings', creditDebtId: 'rot' }),
  tx('transfer', 50_000, '2026-10-09T09:00', { accountId: 'bank', toAccountId: 'cash' }),
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
    ['¿cuánto gasté en pizza?', 'looseNote', 'todo tu historial'],
    ['¿cuánto gasté en pizza en octubre?', 'looseNote', 'Octubre 2026'],
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
    ['¿cuánto gasté esta quincena?', 'totals', 'esta quincena'],
    ['¿cuánto gasté la quincena pasada?', 'totals', 'la quincena pasada'],
    ['¿cuánto voy a gastar los próximos 30 días?', 'projection', 'próximos 30 días'],
    ['how much will I spend in the next 15 days?', 'projection', 'próximos 15 días'],
    ['¿Cómo estarán mis finanzas a final de mes?', 'projection', 'Este mes'],
    ['¿Por qué este mes tengo menos dinero?', 'why', 'Este mes'],
    ['hola', null, null],
  ])('%s → %s', (q, intent, period) => {
    const r = ask(q);
    expect(r.intent).toBe(intent);
    expect(r.understood?.period ?? null).toBe(period);
  });

  it('answers cash advances apart from own-money transfers', () => {
    const draws = ask('¿cuánto saqué en avances este mes?');
    expect(draws.intent).toBe('creditDraws');
    expect(draws.text).toBe(`Avances y uso de cupo (Este mes): ${format(300_000)} en 1. No es ingreso: tu deuda subió lo mismo.`);
    const moves = ask('¿cuántas transferencias hice este mes?');
    expect(moves.intent).toBe('transfers');
    expect(moves.text).toContain(format(50_000));
    expect(ask('how much did I take in cash advances?', 'en').intent).toBe('creditDraws');
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

  it('does not answer "$0" for a word after "por/a/para" that no note has', () => {
    for (const q of ['¿por qué gasto tanto?', '¿cómo voy a final de mes con el arriendo?', 'pagos para pepito']) {
      expect(ask(q).text).not.toMatch(/Coincidencias de/);
    }
  });

  it('reads a fortnight as the calendar half running now', () => {
    const r = ask('¿cuánto gasté esta quincena?');
    // Oct 16–31: only the 18th (snacks 15.000) falls in it.
    expect(r.text).toContain(format(15_000));
    expect(ask('¿cuánto gasté la quincena pasada?').text).toContain(format(12_000 + 45_000 + 9_000));
  });

  it('has no follow-ups or movements when it did not understand', () => {
    expect(ask('hola')).toMatchObject({ txs: [], followUps: [], understood: null });
  });
});

describe('spend totals match Home', () => {
  const withLoan = [
    ...data,
    tx('debt_payment', 300_000, '2026-10-10T09:00', { debtId: 'loan' }),
    tx('debt_payment', 500_000, '2026-10-11T09:00', { debtId: 'visa' }),
    tx('transfer', 1_000_000, '2026-10-12T09:00', { toAccountId: 'investments' }),
  ];
  const debts = [
    { id: 'loan', kind: 'installment' },
    { id: 'visa', kind: 'revolving' },
  ] as never;

  it('compares months counting loan installments, not card payments or moves', () => {
    const answer = askRumi('¿gasté más que el mes pasado?', withLoan, format, translator('es'), {
      language: 'es',
      debts,
    });
    // 12.000 + 45.000 + 9.000 + 15.000 + 300.000 installment = 381.000 this month.
    expect(answer.text).toContain(format(381_000));
    expect(answer.text).toContain(format(100_000));
  });
});

describe('notes: how much and when', () => {
  const notes = [
    tx('expense', 30_000, '2026-09-22T10:00', { categoryId: 'celular', note: 'Recarga Movistar' }),
    tx('expense', 14_500, '2026-10-09T19:00', { categoryId: 'transporte', note: 'Didi a casa' }),
    tx('expense', 11_000, '2026-10-02T08:00', { categoryId: 'transporte', note: 'Didi oficina' }),
    tx('expense', 9_000, '2026-10-14T09:00', { categoryId: 'cafe' }),
    tx('expense', 25_000, '2025-12-24T09:00', { categoryId: 'regalos', note: 'Recarga Claro mamá' }),
  ];
  const askNotes = (q: string, language: 'es' | 'en' = 'es') =>
    askRumi(q, notes, format, translator(language), { language });

  it.each<[string, AskIntent, string]>([
    ['¿cuánto gasté en una recarga a movistar?', 'noteNeedle', `Coincidencias de “movistar” (todo tu historial): ${format(30_000)} en 1 movimiento (22 de septiembre).`],
    ['¿cuánto gasté en movistar?', 'looseNote', `Coincidencias de “movistar” (todo tu historial): ${format(30_000)} en 1 movimiento (22 de septiembre).`],
    ['recarga movistar', 'looseNote', `Coincidencias de “recarga movistar” (todo tu historial): ${format(30_000)} en 1 movimiento (22 de septiembre).`],
    ['¿qué día tomé didi?', 'when', `“didi” (todo tu historial): 2 veces, la última el 9 de octubre (${format(14_500)}). Total ${format(25_500)}.`],
    ['¿cuándo fue la recarga de movistar?', 'when', `“recarga movistar”: el 22 de septiembre, por ${format(30_000)}.`],
    ['¿cuándo recargué a Claro?', 'when', `“claro”: el 24 de diciembre de 2025, por ${format(25_000)}.`],
    ['¿qué día tomé didi en septiembre?', 'when', 'No encontré movimientos con “didi” (Septiembre 2026).'],
    ['when did I take didi?', 'when', `“didi” (all your history): 2 times, the last on October 9 (${format(14_500)}). Total ${format(25_500)}.`],
  ])('%s', (q, intent, text) => {
    const r = askNotes(q, /[¿áéíóú]|^recarga/.test(q) ? 'es' : 'en');
    expect(r.intent).toBe(intent);
    expect(r.text).toBe(text);
  });

  it('answers when with the movements behind it, newest first', () => {
    const r = askNotes('¿qué día tomé didi?');
    expect(r.txs.map((x) => x.note)).toEqual(['Didi a casa', 'Didi oficina']);
    expect(r.understood?.period).toBe('todo tu historial');
  });
});

describe('natural questions about movements', () => {
  const ledger = [
    tx('income', 3_000_000, '2026-10-01T09:00', { categoryId: 'salario' }),
    tx('expense', 30_000, '2026-09-22T10:00', { categoryId: 'celular', note: 'Recarga Movistar' }),
    tx('expense', 20_000, '2026-10-15T10:00', { categoryId: 'celular', note: 'Recarga Claro' }),
    tx('expense', 14_500, '2026-10-09T19:00', { categoryId: 'transporte', note: 'Didi a casa' }),
    tx('expense', 11_000, '2026-10-02T08:00', { categoryId: 'transporte', note: 'Didi oficina' }),
    tx('expense', 38_000, '2026-10-12T05:00', { categoryId: 'transporte', note: 'Uber aeropuerto' }),
    tx('expense', 42_000, '2026-10-18T13:00', { categoryId: 'restaurantes', note: 'Almuerzo con Ana' }),
    tx('expense', 26_900, '2026-10-05T08:00', { categoryId: 'suscripciones', note: 'Netflix' }),
    tx('expense', 1_200_000, '2026-10-03T08:00', { categoryId: 'arriendo', note: 'Arriendo octubre' }),
    tx('expense', 45_000, '2026-10-19T20:00', { categoryId: 'delivery', note: 'Rappi pizza' }),
    tx('expense', 9_000, '2026-10-19T09:00', { categoryId: 'cafe' }),
    tx('expense', 100_000, '2026-10-10T09:00', { categoryId: 'regalos', note: 'Regalo mamá' }),
  ];
  const askLedger = (q: string, language: 'es' | 'en') => askRumi(q, ledger, format, translator(language), { language });
  const all = 'todo tu historial';

  it.each<[string, AskIntent, string]>([
    ['¿cuánto pagué por el didi?', 'noteNeedle', `Coincidencias de “didi” (${all}): ${format(25_500)} en 2 movimientos (9 de octubre · 2 de octubre).`],
    ['¿cuántas veces pedí didi?', 'looseNote', `“didi” (${all}): 2 veces, ${format(25_500)} en total.`],
    ['¿cuánto me ha costado didi en promedio?', 'looseNote', `Promedio de “didi” (${all}): ${format(12_750)} por movimiento (2 movimientos, ${format(25_500)} en total).`],
    ['¿cuánto he gastado en recargas?', 'looseNote', `Coincidencias de “recargas” (${all}): ${format(50_000)} en 2 movimientos (15 de octubre · 22 de septiembre).`],
    ['¿cuánto gasté en didi y uber?', 'noteFirst', `Coincidencias de “didi + uber” (${all}): ${format(63_500)} en 3 movimientos.`],
    ['¿cuánto me salió el almuerzo con Ana?', 'noteFirst', `Coincidencias de “almuerzo ana” (${all}): ${format(42_000)} en 1 movimiento (18 de octubre).`],
    ['dime cuánto gasté en netflix', 'noteFirst', `Coincidencias de “netflix” (${all}): ${format(26_900)} en 1 movimiento (5 de octubre).`],
    ['¿cuánto le regalé a mi mamá?', 'noteNeedle', `Coincidencias de “mama” (${all}): ${format(100_000)} en 1 movimiento (10 de octubre).`],
    ['¿cuánto gasté en transporte?', 'concept', `Transporte (Este mes): ${format(63_500)} en 3 movimientos.`],
    ['¿ya pagué netflix?', 'confirm', `Sí: “netflix” el 5 de octubre, por ${format(26_900)}.`],
    ['¿pagué el arriendo este mes?', 'confirm', `Sí: “arriendo” el 3 de octubre, por ${format(1_200_000)}.`],
    ['¿ya pagué la recarga movistar este mes?', 'confirm', `No veo “recarga movistar” (Este mes). La última vez fue el 22 de septiembre, por ${format(30_000)}.`],
    ['¿en qué gasté el 19 de octubre?', 'listed', `Gastos (19 de octubre 2026): Rappi pizza ${format(45_000)} · Café ${format(9_000)}. Total ${format(54_000)}.`],
    ['¿qué compré ayer?', 'listed', `Gastos (19 de octubre 2026): Rappi pizza ${format(45_000)} · Café ${format(9_000)}. Total ${format(54_000)}.`],
    ['¿cuál fue mi gasto más grande?', 'single', `Tu gasto más grande (Este mes): Arriendo octubre, ${format(1_200_000)}, el 3 de octubre.`],
    ['¿cuál fue mi último gasto?', 'single', `Tu último gasto: Rappi pizza, ${format(45_000)}, el 19 de octubre.`],
    ['¿cuándo fue la última vez que pedí rappi?', 'when', `“rappi”: el 19 de octubre, por ${format(45_000)}.`],
    ['how much did I pay for the movistar top-up?', 'looseNote', `Matches for “movistar recarga” (all your history): ${format(30_000)} in 1 transaction (September 22).`],
    ['how many times did I take didi?', 'looseNote', `“didi” (all your history): 2 times, ${format(25_500)} in total.`],
    ['did I pay netflix?', 'confirm', `Yes: “netflix” on October 5, ${format(26_900)}.`],
    ['what was my last expense?', 'single', `Your latest expense: Rappi pizza, ${format(45_000)}, on October 19.`],
  ])('%s', (q, intent, text) => {
    const r = askLedger(q, /[¿áéíóú]|^dime/.test(q) ? 'es' : 'en');
    expect(r.intent).toBe(intent);
    expect(r.text).toBe(text);
  });

  it('keeps "en qué gasté más" on the top category', () => {
    expect(askLedger('¿en qué gasté más?', 'es').intent).toBe('top');
  });
});
