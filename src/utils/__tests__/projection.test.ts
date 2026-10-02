import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Debt, Transaction } from '@/src/types/finance';
import { formatMoney } from '@/src/utils/money';
import { projectMonth } from '@/src/utils/projection';
import { answerFinanceQuery, buildSmartInsights, parseQueryAmount } from '@/src/utils/smartInsights';

const dict = translations.es as Record<string, string>;
const t = (key: TranslationKey, params?: Record<string, string | number>) => interpolate(dict[key] ?? key, params);
const format = (n: number) => formatMoney(n, 'COP');

let seq = 0;
function tx(type: Transaction['type'], amount: number, when: string, extra: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return { id: `t${seq}`, type, amount, createdAt: new Date(when).toISOString(), accountId: 'cash', ...extra };
}

/** Rent paid on day 1 for three months, plus a little daily spend. */
const rentHistory = [
  tx('expense', 1_200_000, '2026-07-01T09:00', { categoryId: 'arriendo' }),
  tx('expense', 1_200_000, '2026-08-01T09:00', { categoryId: 'arriendo' }),
  tx('expense', 1_200_000, '2026-09-01T09:00', { categoryId: 'arriendo' }),
];

const loan: Debt = {
  id: 'loan',
  name: 'Moto',
  balance: 2_000_000,
  installment: 300_000,
  interestRate: 0,
  termMonths: 10,
  nextPaymentDate: new Date('2026-10-20T00:00').toISOString(),
  paidCapital: 0,
  paidInterest: 0,
  otherCharges: 0,
  kind: 'installment',
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-10T12:00:00'));
});
afterEach(() => jest.useRealTimers());

describe('projectMonth', () => {
  const month = [
    ...rentHistory,
    tx('income', 4_000_000, '2026-10-01T08:00', { categoryId: 'salario' }),
    tx('expense', 1_200_000, '2026-10-01T09:00', { categoryId: 'arriendo' }),
    tx('expense', 100_000, '2026-10-05T09:00', { categoryId: 'mercado' }),
  ];

  it('does not extrapolate rent paid on day 1', () => {
    const p = projectMonth(month, [], new Date('2026-10-10T12:00:00'));
    // rent once + 100.000 over 10 days → 310.000 for 31 days
    expect(p.projectedSpend).toBeCloseTo(1_200_000 + 310_000, 0);
    expect(p.projectedLeft).toBeCloseTo(4_000_000 - 1_510_000, 0);
    expect(p.early).toBe(false);
  });

  it('adds known installments still to come', () => {
    const p = projectMonth(month, [loan], new Date('2026-10-10T12:00:00'));
    expect(p.pendingFixed).toBe(300_000);
    expect(p.projectedSpend).toBeCloseTo(1_810_000, 0);
  });

  it('counts a paid installment once', () => {
    const paid = [...month, tx('debt_payment', 300_000, '2026-10-08T09:00', { debtId: 'loan' })];
    const p = projectMonth(paid, [loan], new Date('2026-10-10T12:00:00'));
    expect(p.pendingFixed).toBe(0);
    expect(p.projectedSpend).toBeCloseTo(1_810_000, 0);
  });
});

describe('parseQueryAmount', () => {
  it.each([
    ['¿puedo comprar algo de 500000?', 500_000],
    ['me alcanza para 500.000', 500_000],
    ['puedo gastar 500 mil', 500_000],
    ['can i afford 200k', 200_000],
    ['¿puedo pagar 1,5 millones?', 1_500_000],
    ['me alcanza para 2 palos', 2_000_000],
  ])('%p → %p', (q, expected) => {
    expect(parseQueryAmount(q)).toBe(expected);
  });

  it('ignores a bare year', () => {
    expect(parseQueryAmount('puedo comprar en 2026')).toBeNull();
  });
});

describe('Ask Rumi advice', () => {
  const list = [
    ...rentHistory,
    tx('income', 4_000_000, '2026-10-01T08:00', { categoryId: 'salario' }),
    tx('expense', 1_200_000, '2026-10-01T09:00', { categoryId: 'arriendo' }),
    tx('expense', 100_000, '2026-10-05T09:00', { categoryId: 'mercado' }),
  ];
  const ask = (q: string) =>
    answerFinanceQuery(q, list, format, t, { language: 'es', debts: [], availableCash: 1_000_000, currency: 'COP' });

  it('answers whether a purchase fits the month', () => {
    const answer = ask('¿puedo comprar algo de 500 mil?');
    expect(answer).toContain(`cerrarías el mes con unos ${format(4_000_000 - 1_510_000 - 500_000)}`);
  });

  it('warns when the purchase is more than the cash available today', () => {
    expect(ask('¿me alcanza para 1.500.000?')).toMatch(/Ojo: hoy solo tienes/);
  });

  it('gives a daily budget for "¿cuánto puedo gastar?"', () => {
    // 4.000.000 − 1.300.000 spent, no pending bills, 22 days left (Oct 10–31)
    expect(ask('¿cuánto puedo gastar al día?')).toContain(
      `podrías gastar cerca de ${format(2_700_000 / 22)} al día en los 22 días`
    );
  });

  it('asks for the amount when there is none', () => {
    expect(ask('¿puedo comprar algo?')).toMatch(/Dime el monto/);
  });

  it('suggests where to trim, skipping fixed bills like rent', () => {
    const answer = ask('¿en qué puedo recortar?');
    expect(answer).toMatch(/bajarlo 10%/);
    expect(answer).not.toMatch(/Arriendo/i);
  });

  it('uses the fixed-vs-variable projection for the month', () => {
    expect(ask('¿cuánto voy a gastar este mes?')).toContain(format(1_510_000));
  });
});

describe('savings pace note', () => {
  it('shows where the month is heading after the first week', () => {
    const list = [
      ...rentHistory,
      tx('income', 4_000_000, '2026-10-01T08:00', { categoryId: 'salario' }),
      tx('expense', 1_200_000, '2026-10-01T09:00', { categoryId: 'arriendo' }),
    ];
    const concepts = [
      { id: 'concept-vivienda', name: 'Vivienda', color: '#000', subs: [{ id: 'arriendo', name: 'Arriendo' }] },
    ];
    const notes = buildSmartInsights(list, t, format, concepts, 'mes');
    const pace = notes.find((n) => n.id === 'savings-pace');
    expect(pace?.text).toMatch(/guardarías cerca del 70%/);
    expect(pace?.tone).toBe('good');
  });
});
