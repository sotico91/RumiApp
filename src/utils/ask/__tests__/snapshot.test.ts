import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import { askRumi } from '@/src/utils/ask';
import { buildSnapshot, fixedDueBetween } from '@/src/utils/ask/snapshot';
import { formatMoney } from '@/src/utils/money';

const dict = translations.es as Record<string, string>;
const t = (key: TranslationKey, params?: Record<string, string | number>) => interpolate(dict[key] ?? key, params);
const format = (n: number) => formatMoney(n, 'COP');

let seq = 0;
function tx(type: Transaction['type'], amount: number, when: string, extra: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return { id: `s${seq}`, type, amount, createdAt: new Date(when).toISOString(), accountId: 'cash', ...extra };
}

// Rent on the 25th for three months, not paid yet in October.
const data = [
  tx('expense', 1_000_000, '2026-07-25T09:00', { categoryId: 'arriendo' }),
  tx('expense', 1_000_000, '2026-08-25T09:00', { categoryId: 'arriendo' }),
  tx('expense', 1_000_000, '2026-09-25T09:00', { categoryId: 'arriendo' }),
  tx('expense', 20_000, '2026-09-10T09:00', { categoryId: 'cafe' }),
  tx('income', 3_000_000, '2026-10-01T08:00', { categoryId: 'salario' }),
  tx('expense', 200_000, '2026-10-05T09:00', { categoryId: 'mercado' }),
  tx('expense', 50_000, '2026-10-12T09:00', { categoryId: 'cafe' }),
];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00'));
});
afterEach(() => jest.useRealTimers());

describe('buildSnapshot', () => {
  it('chains room and projection: room − day-to-day still to come = where the month lands', () => {
    const s = buildSnapshot(data, { availableCash: 5_000_000 });
    expect(s.pendingFixed).toBe(1_000_000);
    expect(s.incomeRoom).toBe(3_000_000 - 250_000 - 1_000_000);
    expect(s.limitedBy).toBe('income');
    expect(s.room! - s.remainingVariable).toBeCloseTo(s.projectedLeft!, 6);
  });

  it('takes cash as the limit when it is tighter than the income left', () => {
    const s = buildSnapshot(data, { availableCash: 1_500_000 });
    expect(s.cashRoom).toBe(500_000);
    expect(s.room).toBe(500_000);
    expect(s.limitedBy).toBe('cash');
  });

  it('counts bills due in a window that runs into next month', () => {
    const s = buildSnapshot(data, {});
    // Oct 20 → Nov 29: October's pending rent plus November's on the 25th.
    const due = fixedDueBetween(s, new Date('2026-10-20T00:00:00'), new Date('2026-11-29T00:00:00'));
    expect(due).toEqual({ total: 2_000_000, count: 2 });
    // Oct 20 → Nov 19: only October's.
    expect(fixedDueBetween(s, new Date('2026-10-20T00:00:00'), new Date('2026-11-19T00:00:00')).total).toBe(1_000_000);
  });
});

describe('answers share the snapshot numbers', () => {
  const ask = (q: string, availableCash = 5_000_000) =>
    askRumi(q, data, format, t, { language: 'es', availableCash }).text;

  it('uses the same room for the daily budget and for a purchase', () => {
    const room = format(1_750_000);
    expect(ask('¿cuánto puedo gastar hoy?')).toContain(`(${room} en total`);
    expect(ask('¿puedo comprar algo de 500 mil?')).toContain(`Tienes ${room} libres para el resto del mes`);
  });

  it('subtracts the bills still to come from the cash on hand', () => {
    expect(ask('¿cuánto me queda después de pagar mis obligaciones?', 1_800_000)).toContain(
      `Después de las cuentas que faltan este mes (${format(1_000_000)}), quedarían ${format(800_000)}.`
    );
  });

  it('estimates a window ahead with the bills due in it', () => {
    const text = ask('¿cuánto voy a gastar los próximos 10 días?');
    expect(text).toMatch(/^Estimación para los próximos 10 días/);
    expect(text).toContain(`${format(1_000_000)} de cuentas fijas`);
  });
});
