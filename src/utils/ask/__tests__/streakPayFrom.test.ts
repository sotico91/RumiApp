import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Account, Debt, Transaction } from '@/src/types/finance';
import { askRumi } from '@/src/utils/ask';
import { formatMoney } from '@/src/utils/money';

const t = (key: TranslationKey, params?: Record<string, string | number>) =>
  interpolate((translations.es as Record<string, string>)[key] ?? key, params);
const format = (n: number) => formatMoney(n, 'COP');

const accounts: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 40_000 },
  { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: 250_000 },
  { id: 'nequi', name: 'Nequi', type: 'wallet', balance: 120_000 },
];
const debts = [{ id: 'visa', name: 'Visa', balance: 180_000, installment: 0 } as unknown as Debt];

let seq = 0;
const tx = (p: Partial<Transaction>): Transaction => {
  seq += 1;
  return { id: `t${seq}`, type: 'expense', amount: 10_000, createdAt: new Date('2026-11-16T12:00').toISOString(), ...p } as Transaction;
};

beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-11-17T10:00:00')));
afterEach(() => jest.useRealTimers());

const ask = (q: string, data: Transaction[] = []) =>
  askRumi(q, data, format, t, { language: 'es', accounts, debts });

describe('streak questions', () => {
  it('answers the streak with today pending', () => {
    const r = ask('¿cuántos días llevo de racha?', [
      tx({ createdAt: new Date('2026-11-16T12:00').toISOString() }),
      tx({ createdAt: new Date('2026-11-15T12:00').toISOString() }),
    ]);
    expect(r.intent).toBe('streak');
    expect(r.text).toContain('2 días seguidos');
    expect(r.text).toContain('Hoy todavía falta');
  });

  it('starts at zero', () => {
    expect(ask('mi racha').text).toContain('en cero');
  });
});

describe('which account covers a payment', () => {
  it('lists only the accounts with the whole amount', () => {
    const r = ask('¿de qué cuenta puedo pagar 100 mil?');
    expect(r.intent).toBe('payFrom');
    expect(r.text).toContain('Nequi');
    expect(r.text).not.toContain('Efectivo');
  });

  it('puts the usual one first', () => {
    const r = ask('¿con qué cuenta pago 100 mil?', [tx({ accountId: 'nequi' }), tx({ accountId: 'nequi' })]);
    expect(r.text.startsWith('Sueles pagar desde Nequi')).toBe(true);
  });

  it('uses the named debt balance and says when none covers', () => {
    expect(ask('¿con qué cuenta pago la visa?').text).toContain('Alcanzan para $180.000');
    expect(ask('¿de qué cuenta puedo pagar 300 mil?').text).toContain('Ninguna cuenta tiene');
  });
});
