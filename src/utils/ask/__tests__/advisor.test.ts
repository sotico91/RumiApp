import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import { askRumi, type AskOptions } from '@/src/utils/ask';
import { formatMoney } from '@/src/utils/money';

const dict = translations.es as Record<string, string>;
const t = (key: TranslationKey, params?: Record<string, string | number>) => interpolate(dict[key] ?? key, params);
const format = (n: number) => formatMoney(n, 'COP');

let seq = 0;
function tx(type: Transaction['type'], amount: number, when: string, extra: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return { id: `a${seq}`, type, amount, createdAt: new Date(when).toISOString(), accountId: 'cash', ...extra };
}

// Three steady months, then an October with less salary and much more delivery.
const data: Transaction[] = [];
for (const m of ['07', '08', '09']) {
  data.push(tx('income', 3_000_000, `2026-${m}-01T09:00`, { categoryId: 'salario' }));
  data.push(tx('expense', 1_200_000, `2026-${m}-02T09:00`, { categoryId: 'arriendo' }));
  data.push(tx('expense', 45_000, `2026-${m}-05T09:00`, { categoryId: 'suscripciones', note: 'Netflix' }));
  data.push(tx('expense', 90_000, `2026-${m}-10T20:00`, { categoryId: 'delivery' }));
  data.push(tx('expense', 60_000, `2026-${m}-15T09:00`, { categoryId: 'transporte' }));
}
data.push(tx('income', 2_500_000, '2026-10-01T09:00', { categoryId: 'salario' }));
data.push(tx('expense', 1_200_000, '2026-10-02T09:00', { categoryId: 'arriendo' }));
data.push(tx('expense', 300_000, '2026-10-10T20:00', { categoryId: 'delivery' }));
data.push(tx('expense', 60_000, '2026-10-15T09:00', { categoryId: 'transporte' }));

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00'));
});
afterEach(() => jest.useRealTimers());

const ask = (q: string, options: AskOptions = {}, txs = data) =>
  askRumi(q, txs, format, t, { language: 'es', availableCash: 1_000_000, ...options });

describe('why', () => {
  it('explains less money with what grew and what came in', () => {
    const r = ask('¿Por qué este mes tengo menos dinero?');
    expect(r.intent).toBe('why');
    expect(r.basis).toBe('inference');
    expect(r.text).toContain(`Lo que más subió: Delivery +${format(210_000)}.`);
    expect(r.text).toContain(`Y entró menos: ${format(2_500_000)} vs ${format(3_000_000)}`);
    expect(r.txs.map((x) => x.amount)).toEqual([300_000]);
  });

  it('says so when nothing went up and income did not drop', () => {
    const steady = data.filter((x) => x.createdAt < new Date('2026-10-01').toISOString());
    const r = ask('¿por qué tengo menos plata?', {}, [
      ...steady,
      tx('income', 3_000_000, '2026-10-01T09:00', { categoryId: 'salario' }),
    ]);
    expect(r.text).toContain('Tus ingresos tampoco bajaron');
  });
});

describe('overspend', () => {
  it('names limits over or going fast, and concepts above their usual', () => {
    const r = ask('¿En qué estoy gastando demasiado?', {
      budgetStatus: [{ categoryId: 'transporte', ratio: 0.9, limit: 66_000 }],
    });
    expect(r.intent).toBe('overspend');
    expect(r.text).toContain('Transporte al 90% del tope con el 65% del mes');
    expect(r.text).toContain(`Delivery ${format(300_000)} vs unos ${format(90_000)}`);
  });

  it('leaves out bills that land on one day, like rent', () => {
    expect(ask('¿en qué me estoy pasando?').text).not.toContain('Arriendo');
  });
});

describe('budget pace', () => {
  it.each<[AskOptions['budgetStatus'], string]>([
    [[{ categoryId: 'delivery', ratio: 1.5, limit: 200_000 }], 'Delivery al 150%'],
    [[{ categoryId: 'delivery', ratio: 0.9, limit: 200_000 }], 'Delivery va rápido: 90% usado con el 65% del mes'],
    [[{ categoryId: 'delivery', ratio: 0.5, limit: 200_000 }], 'Vas bien (Este mes): usaste el 50% de tus topes con el 65% del mes'],
  ])('%#', (budgetStatus, text) => {
    expect(ask('¿Cómo voy con mi presupuesto?', { budgetStatus }).text).toContain(text);
  });
});

describe('recurring and upcoming', () => {
  it('lists what repeats, Netflix included, and asks past spend as a total', () => {
    const r = ask('¿Qué suscripciones tengo?');
    expect(r.intent).toBe('recurring');
    expect(r.text).toContain(`Netflix ${format(45_000)} (hacia el día 5, falta)`);
    expect(r.text).toContain(`Arriendo ${format(1_200_000)} (hacia el día 2, pagado)`);
    expect(ask('¿Cuánto gasté en suscripciones?').intent).toBe('concept');
  });

  it('lists what is still to pay this month', () => {
    const r = ask('¿Qué me falta pagar este mes?');
    expect(r.intent).toBe('upcoming');
    expect(r.text).toMatch(/^Te falta 1 pago este mes/);
    expect(r.text).toContain('Netflix');
    expect(ask('¿cuánto me queda por pagar?').intent).toBe('upcoming');
  });

  it('is Pro', () => {
    const r = ask('¿Qué me falta pagar?', { isPro: false });
    expect(r.proFeature).toBe('advisor');
    expect(r.text).not.toContain('Netflix');
  });
});

describe('shouldSave', () => {
  it('suggests 20% of income against what is usually left', () => {
    const r = ask('¿Cuánto debería ahorrar?');
    expect(r.intent).toBe('shouldSave');
    expect(r.basis).toBe('inference');
    // Income 3.000.000, out 1.395.000 → 1.605.000 usually left; 20% = 600.000.
    expect(r.text).toContain(`${format(600_000)} al mes (${format(300_000)} por quincena)`);
    expect(r.text).toContain(`quedarían ${format(1_005_000)} libres`);
  });

  it('asks for income when there is none', () => {
    expect(ask('¿cuánto debo ahorrar?', {}, []).basis).toBe('hypothesis');
  });

  it('is Pro', () => {
    expect(ask('¿Cuánto debería ahorrar?', { isPro: false }).proFeature).toBe('advisor');
  });
});
