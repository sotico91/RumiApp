import type { Account } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { parseDictation } from '@/src/utils/dictation';
import { suggestCategory } from '@/src/utils/suggestCategory';

const accounts: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 0 },
  { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: 0 },
  { id: 'wallet-nequi', nameKey: 'account.wallet', name: 'Nequi', type: 'wallet', balance: 0 },
  { id: 'bank-bancolombia', nameKey: 'account.bank', name: 'Bancolombia', type: 'bank', balance: 0 },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: 0 },
];

// Monday 26 Oct 2026.
const now = new Date(2026, 9, 26, 12, 0, 0);
const parse = (text: string, currency: 'COP' | 'USD' = 'COP') =>
  parseDictation(text, { accounts, now, currency });

describe('parseDictation: amounts', () => {
  it.each([
    ['gasté 20000 en almuerzo', 20000],
    ['gasté 20.000 en almuerzo', 20000],
    ['gasté $20.000 en almuerzo', 20000],
    ['gasté 20 mil en almuerzo', 20000],
    ['gasté 20mil en almuerzo', 20000],
    ['gasté veinte mil en almuerzo', 20000],
    ['gasté veinticinco mil quinientos en mercado', 25500],
    ['pagué treinta y cinco mil de internet', 35000],
    ['pagué un millón doscientos de arriendo', 1200000],
    ['pagué un millón doscientos mil de arriendo', 1200000],
    ['pagué 1,5 millones de arriendo', 1500000],
    ['pagué un millón y medio de arriendo', 1500000],
    ['gasté 20 lucas en gasolina', 20000],
    ['gasté una luca en un chicle', 1000],
    ['me costó medio palo el celular', 500000],
    ['compré 2 empanadas por 5000', 5000],
    ['un café de 5 mil', 5000],
    ['gasté mil quinientos en un tinto', 1500],
    ['gasté quinientos en un chicle', 500],
    ['gasté 80 mil pesos en el recibo de la luz', 80000],
    ['20k en uber', 20000],
    ['gasté 20 000 en almuerzo', 20000],
    ['pagué 1 200 000 de arriendo', 1200000],
  ])('%s → %d', (text, amount) => {
    expect(parse(text).amount).toBe(amount);
  });

  it('reads dollars with cents', () => {
    expect(parse('spent 12.50 on lunch', 'USD').amount).toBe(12.5);
    expect(parse('spent twenty five dollars on gas', 'USD').amount).toBe(25);
    expect(parse('paid two hundred and fifty for rent', 'USD').amount).toBe(250);
    expect(parse('spent twenty on lunch', 'USD').amount).toBe(20);
    expect(parse('a thousand bucks for the flight', 'USD').amount).toBe(1000);
  });

  it('has no amount when none was said', () => {
    expect(parse('compré una pizza').amount).toBeNull();
    expect(parse('almuerzo con Nequi').amount).toBeNull();
  });
});

describe('parseDictation: note', () => {
  it.each([
    ['gasté 20 mil en almuerzo con Nequi ayer', 'Almuerzo'],
    ['compré un café de 5 mil esta mañana', 'Café'],
    ['pagué 80 mil del recibo de la luz', 'Recibo de la luz'],
    ['gasté 30 mil en cine con Juan', 'Cine con Juan'],
    ['compré 2 empanadas por 5000', '2 empanadas'],
    ['uber 15 mil', 'Uber'],
    ['Rumi, anota un gasto de 12 mil en taxi', 'Taxi'],
    ['spent 12 dollars on lunch yesterday', 'Lunch'],
    ['¿Gasté 20.000 en almuerzo?', 'Almuerzo'],
  ])('%s → %s', (text, note) => {
    expect(parse(text).note).toBe(note);
  });
});

describe('parseDictation: account', () => {
  it.each([
    ['gasté 20 mil en almuerzo con Nequi', 'wallet-nequi'],
    ['pagué en efectivo 8 mil de bus', 'cash'],
    ['gasté 50 mil con la tarjeta de crédito en ropa', 'credit-card'],
    ['gasté 50 mil con la tarjeta en ropa', 'credit-card'],
    ['pagué con débito 40 mil de mercado', 'bank-main'],
    ['pagué 40 mil de mercado desde Bancolombia', 'bank-bancolombia'],
    ['paid 20 dollars cash for lunch', 'cash'],
    ['spent 30 with my credit card on dinner', 'credit-card'],
  ])('%s → %s', (text, accountId) => {
    expect(parse(text).accountId).toBe(accountId);
  });

  it('leaves the account out when none was said', () => {
    expect(parse('gasté 20 mil en almuerzo').accountId).toBeUndefined();
  });

  it('does not read a kind word as an account without a preposition', () => {
    const r = parse('pagué 200 mil de la cuota del crédito');
    expect(r.accountId).toBeUndefined();
  });

  it('sends "la tarjeta" to the bank when there is no credit card', () => {
    const r = parseDictation('gasté 50 mil con la tarjeta', {
      accounts: accounts.filter((a) => a.type !== 'credit'),
      now,
    });
    expect(r.accountId).toBe('bank-main');
  });
});

describe('parseDictation: date', () => {
  it.each([
    ['gasté 20 mil en almuerzo', 0],
    ['hoy gasté 20 mil en almuerzo', 0],
    ['ayer gasté 20 mil en almuerzo', 1],
    ['anoche gasté 40 mil en pizza', 1],
    ['antier gasté 10 mil en taxi', 2],
    ['antes de ayer gasté 10 mil en taxi', 2],
    ['hace 3 días gasté 10 mil en taxi', 3],
    ['hace tres días gasté 10 mil en taxi', 3],
    ['el sábado gasté 60 mil en cine', 2],
    ['el lunes gasté 60 mil en cine', 7],
    ['spent 20 dollars on lunch yesterday', 1],
    ['on friday I spent 40 on dinner', 3],
  ])('%s → %d days ago', (text, daysAgo) => {
    expect(parse(text).daysAgo).toBe(daysAgo);
  });

  it('does not take the days count as the amount', () => {
    const r = parse('hace 3 días gasté 10 mil en taxi');
    expect(r.amount).toBe(10000);
    expect(r.note).toBe('Taxi');
  });
});

describe('parseDictation: income or expense', () => {
  it.each([
    ['gasté 20 mil en almuerzo', 'expense'],
    ['20 mil en almuerzo', 'expense'],
    ['me pagaron 3 millones de sueldo', 'income'],
    ['recibí 200 mil por un trabajo', 'income'],
    ['me consignaron 500 mil a Nequi', 'income'],
    ['sueldo de octubre 3 millones', 'income'],
    ['pagué 1 millón del sueldo de la empleada', 'expense'],
    ['got paid 2000 dollars', 'income'],
    ['spent 20 on lunch', 'expense'],
  ])('%s → %s', (text, type) => {
    expect(parse(text).type).toBe(type);
  });

  it('keeps the account for income', () => {
    const r = parse('me consignaron 500 mil a Nequi');
    expect(r.accountId).toBe('wallet-nequi');
    expect(r.amount).toBe(500000);
  });
});

describe('parseDictation: the note finds its category', () => {
  const concepts: SpendConcept[] = [
    {
      id: 'concept-food',
      name: 'Alimentación',
      color: '#E07A5F',
      subs: [
        { id: 'sub-lunch', name: 'Almuerzo' },
        { id: 'sub-coffee', name: 'Café', isAnt: true },
      ],
    },
    {
      id: 'concept-transport',
      name: 'Transporte',
      color: '#2EC4B6',
      subs: [{ id: 'sub-taxi', name: 'Taxi y apps', isAnt: true }],
    },
  ];

  it.each([
    ['gasté 20 mil en almuerzo con Nequi ayer', 'sub-lunch'],
    ['compré un café de 5 mil esta mañana', 'sub-coffee'],
    ['Rumi, anota un gasto de 12 mil en taxi', 'sub-taxi'],
  ])('%s → %s', (text, subId) => {
    const { note } = parse(text);
    expect(suggestCategory(note, concepts, new Map())?.subId).toBe(subId);
  });
});
