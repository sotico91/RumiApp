import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Debt, Transaction } from '@/src/types/finance';
import { comparableRange, sumSpendOut } from '@/src/utils/financeMath';
import { formatMoney } from '@/src/utils/money';
import { answerFinanceQuery, buildSmartInsights } from '@/src/utils/smartInsights';

function translator(lang: 'en' | 'es') {
  const dict = translations[lang] as Record<string, string>;
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    (dict[key] ?? key).replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? `{${name}}`));
}
const t = translator('es');
const tEn = translator('en');
const format = (n: number) => formatMoney(n, 'COP');

const at = (iso: string) => new Date(iso).toISOString();
function tx(id: string, type: Transaction['type'], amount: number, when: string, extra: Partial<Transaction> = {}): Transaction {
  return { id, type, amount, createdAt: at(when), accountId: 'cash', ...extra };
}

const card: Debt = {
  id: 'card',
  name: 'Visa',
  balance: 0,
  installment: 0,
  interestRate: 0,
  termMonths: 0,
  nextPaymentDate: at('2026-10-15T00:00'),
  paidCapital: 0,
  paidInterest: 0,
  otherCharges: 0,
  kind: 'revolving',
  creditLimit: 1_000_000,
};
const loan: Debt = { ...card, id: 'loan', name: 'Moto', kind: 'installment', creditLimit: undefined };

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-02T12:00:00'));
});
afterEach(() => jest.useRealTimers());

describe('comparableRange', () => {
  it('cuts the previous month to the same elapsed time while the month runs', () => {
    const now = new Date('2026-10-02T12:00:00');
    const range = comparableRange(
      { from: new Date('2026-10-01T00:00:00'), to: new Date('2026-11-01T00:00:00') },
      { from: new Date('2026-09-01T00:00:00'), to: new Date('2026-10-01T00:00:00') },
      now
    );
    expect(range.to).toEqual(new Date('2026-09-02T12:00:00'));
  });

  it('keeps the full previous period once the current one is over', () => {
    const previous = { from: new Date('2026-08-01T00:00:00'), to: new Date('2026-09-01T00:00:00') };
    const range = comparableRange(
      { from: new Date('2026-09-01T00:00:00'), to: new Date('2026-10-01T00:00:00') },
      previous,
      new Date('2026-10-02T12:00:00')
    );
    expect(range).toBe(previous);
  });
});

describe('monthly outflow', () => {
  const list = [
    tx('buy', 'expense', 200_000, '2026-10-01T10:00', { creditDebtId: 'card', categoryId: 'compras' }),
    tx('paycard', 'debt_payment', 200_000, '2026-10-02T09:00', { debtId: 'card' }),
    tx('payloan', 'debt_payment', 300_000, '2026-10-02T09:30', { debtId: 'loan' }),
  ];

  it('counts card purchases once and loan installments as outflow', () => {
    expect(sumSpendOut(list, [card, loan])).toBe(500_000);
  });

  it('falls back to counting every payment when debts are unknown', () => {
    expect(sumSpendOut(list)).toBe(700_000);
  });
});

describe('smart notes', () => {
  const history = [
    tx('s1', 'income', 3_000_000, '2026-09-01T09:00', { categoryId: 'salario' }),
    tx('s2', 'expense', 20_000, '2026-09-01T10:00', { categoryId: 'cafe' }),
    tx('s3', 'expense', 900_000, '2026-09-20T10:00', { categoryId: 'alimentacion' }),
    tx('o1', 'income', 3_000_000, '2026-10-01T09:00', { categoryId: 'salario' }),
    tx('o2', 'expense', 21_000, '2026-10-01T10:00', { categoryId: 'cafe' }),
  ];

  it('compares Oct 1–2 with Sep 1–2, not with all of September', () => {
    const notes = buildSmartInsights(history, t, format, [], 'mes');
    const text = notes.map((n) => n.text).join('\n');
    expect(text).not.toMatch(/menos que el mes pasado/);
    expect(text).toMatch(/Gastaste 5% más que el mes pasado/);
  });

  it('does not flag a tiny rise as an alert', () => {
    const notes = buildSmartInsights(history, t, format, [], 'mes');
    expect(notes.some((n) => n.id.startsWith('rise-'))).toBe(false);
  });

  it('does not double count a card purchase and its payment', () => {
    const list = [
      tx('i', 'income', 1_000_000, '2026-10-01T09:00', { categoryId: 'salario' }),
      tx('b', 'expense', 100_000, '2026-10-01T10:00', { creditDebtId: 'card', categoryId: 'compras' }),
      tx('p', 'debt_payment', 100_000, '2026-10-02T09:00', { debtId: 'card' }),
    ];
    const snapshot = buildSmartInsights(list, t, format, [], 'mes', [card])[0];
    expect(snapshot.text).toContain(`gastaste ${format(100_000)}`);
  });
});

describe('Ask Rumi', () => {
  const list = [
    tx('i', 'income', 3_000_000, '2026-10-01T09:00', { categoryId: 'salario' }),
    tx('c', 'expense', 100_000, '2026-10-02T08:00', { categoryId: 'cafe' }),
  ];
  const ask = (q: string, lang: 'en' | 'es' = 'es') =>
    answerFinanceQuery(q, list, format, lang === 'es' ? t : tEn, { language: lang, debts: [] });

  it.each(['¿cuánto voy a gastar este mes?', '¿cuánto me queda hasta fin de mes?', '¿cuánto puedo ahorrar este mes?'])(
    'projects the running month for %p',
    (q) => {
      const answer = ask(q);
      expect(answer).toMatch(/A este ritmo gastarías cerca de/);
      expect(answer).toContain(format(1_550_000));
      expect(answer).toMatch(/estimación temprana/);
    }
  );

  it('projects in English too', () => {
    expect(ask('how much will I spend this month', 'en')).toMatch(/At this pace you would spend about/);
  });

  it('says "so far" instead of "you saved" for the running month', () => {
    const answer = ask('¿cuánto ahorré este mes?');
    expect(answer).toMatch(/hasta hoy/);
    expect(answer).not.toMatch(/Ahorraste/);
  });

  it('shows readable category names, not raw ids', () => {
    expect(ask('café')).toMatch(/^Café/);
    expect(ask('¿cuánto gasté este mes?')).not.toMatch(/\bcafe\b/);
  });
});
