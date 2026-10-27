import type { Account } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { bestDictation, dictatedDate, dictationVocabulary, parseDictation } from '@/src/utils/dictation';
import { suggestCategory } from '@/src/utils/suggestCategory';

const accounts: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 0 },
  { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: 0 },
  { id: 'wallet-nequi', nameKey: 'account.wallet', name: 'Nequi', type: 'wallet', balance: 0 },
  { id: 'bank-bancolombia', nameKey: 'account.bank', name: 'Bancolombia', type: 'bank', balance: 0 },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: 0 },
  { id: 'savings', nameKey: 'account.savings', type: 'savings', balance: 0 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 0 },
];

const debts = [
  { id: 'debt-card', names: ['Tarjeta Visa', 'Visa'], card: true },
  { id: 'debt-car', names: ['Crédito del carro', 'carro'] },
];

// Monday 26 Oct 2026.
const now = new Date(2026, 9, 26, 12, 0, 0);
const parse = (text: string, currency: 'COP' | 'USD' = 'COP') =>
  parseDictation(text, { accounts, debts, now, currency });

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
    expect(r.type).toBe('debt');
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

describe('dictatedDate', () => {
  it('counts back from today and keeps the time', () => {
    const at = new Date(2026, 9, 26, 9, 30);
    expect(dictatedDate(0, at)).toEqual(at);
    const yesterday = dictatedDate(1, at);
    expect([yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()]).toEqual([2026, 9, 25]);
    expect(yesterday.getHours()).toBe(9);
    // Across a month: 1 Nov minus 2 days → 30 Oct.
    const back = dictatedDate(2, new Date(2026, 10, 1, 12));
    expect([back.getMonth(), back.getDate()]).toEqual([9, 30]);
  });

  it('turns "el sábado" said on Monday into Saturday', () => {
    const { daysAgo } = parse('el sábado gasté 60 mil en cine');
    expect(dictatedDate(daysAgo, now).getDay()).toBe(6);
    expect(dictatedDate(daysAgo, now).getDate()).toBe(24);
  });
});

describe('bestDictation', () => {
  it('picks the guess that reads as a movement over a noisy first guess', () => {
    const best = bestDictation(
      [
        { transcript: 'gaste veinte mi en el muerzo', confidence: 0.6 },
        { transcript: 'gasté veinte mil en almuerzo', confidence: 0.5 },
      ],
      { accounts, now }
    );
    expect(best?.text).toBe('gasté veinte mil en almuerzo');
    expect(best?.movement.amount).toBe(20000);
  });

  it('keeps the recognizer order on a tie', () => {
    const best = bestDictation(
      [{ transcript: '20 mil en taxi' }, { transcript: '20 mil en taxis' }],
      { accounts, now }
    );
    expect(best?.text).toBe('20 mil en taxi');
  });

  it('is null when nothing was heard', () => {
    expect(bestDictation([{ transcript: '  ' }], { now })).toBeNull();
  });
});

describe('dictationVocabulary', () => {
  it('puts the user names first, without repeats or "General"', () => {
    const v = dictationVocabulary(['Nequi', 'Almuerzo', 'General', 'almuerzo']);
    expect(v.slice(0, 2)).toEqual(['Nequi', 'Almuerzo']);
    expect(v).not.toContain('General');
    expect(v.filter((w) => w.toLowerCase() === 'nequi')).toHaveLength(1);
  });
});

describe('parseDictation: income category', () => {
  it.each([
    ['me pagaron la quincena 1 millón 800 mil', 'salario'],
    ['me consignaron el sueldo, 3 millones', 'salario'],
    ['me pagaron la prima 2 millones', 'bonos'],
    ['me devolvieron 50 mil de un reembolso', 'reembolsos'],
    ['recibí 400 mil de un cliente', 'freelance'],
    ['got paid my salary, 2000 dollars', 'salario'],
  ])('%s → %s', (text, categoryId) => {
    const r = parse(text);
    expect(r.type).toBe('income');
    expect(r.categoryId).toBe(categoryId);
  });

  it('leaves the category open when the words do not say', () => {
    expect(parse('me consignaron 500 mil a Nequi').categoryId).toBeUndefined();
  });

  it('reads "un millón ochocientos mil"', () => {
    expect(parse('me pagaron la quincena un millón ochocientos mil').amount).toBe(1800000);
  });
});

describe('parseDictation: moving money between accounts', () => {
  it.each([
    ['pasé 200 mil de Nequi a ahorros', 'wallet-nequi', 'savings', 200000],
    ['pasé 200 mil a ahorros desde Bancolombia', 'bank-bancolombia', 'savings', 200000],
    ['moví 50 mil de Bancolombia a Nequi', 'bank-bancolombia', 'wallet-nequi', 50000],
    ['transferí 1 millón del banco a Nequi', 'bank-main', 'wallet-nequi', 1000000],
    ['saqué 100 mil del cajero', 'bank-main', 'cash', 100000],
    ['retiré 300 mil de Bancolombia', 'bank-bancolombia', 'cash', 300000],
    ['ahorré 150 mil', undefined, 'savings', 150000],
    ['invertí 2 millones desde Bancolombia', 'bank-bancolombia', 'investments', 2000000],
    ['moved 300 dollars from Nequi to savings', 'wallet-nequi', 'savings', 300],
  ])('%s → %s → %s', (text, from, to, amount) => {
    const r = parse(text);
    expect(r.type).toBe('move');
    expect(r.accountId).toBe(from);
    expect(r.toAccountId).toBe(to);
    expect(r.amount).toBe(amount);
  });

  it('keeps the date for a move', () => {
    expect(parse('ayer pasé 200 mil de Nequi a ahorros').daysAgo).toBe(1);
  });
});

describe('parseDictation: paying a debt', () => {
  it.each([
    ['aboné 300 mil a la tarjeta', 'debt-card', 300000],
    ['pagué la tarjeta Visa, 500 mil', 'debt-card', 500000],
    ['pagué la cuota del carro 850 mil', 'debt-car', 850000],
    ['pagué el carro 850 mil con Bancolombia', 'debt-car', 850000],
    ['paid 200 dollars toward my card', 'debt-card', 200],
  ])('%s → %s', (text, debtId, amount) => {
    const r = parse(text);
    expect(r.type).toBe('debt');
    expect(r.debtId).toBe(debtId);
    expect(r.amount).toBe(amount);
  });

  it('takes the account it was paid from', () => {
    expect(parse('pagué el carro 850 mil con Bancolombia').accountId).toBe('bank-bancolombia');
  });

  it('leaves the debt open when there are several and none was named', () => {
    const r = parse('pagué la cuota ayer');
    expect(r.type).toBe('debt');
    expect(r.debtId).toBeUndefined();
    expect(r.daysAgo).toBe(1);
  });

  it('picks the only debt', () => {
    const r = parseDictation('aboné 100 mil a la deuda', { accounts, debts: [debts[1]], now });
    expect(r.debtId).toBe('debt-car');
  });

  it.each([
    ['gasté 50 mil con la tarjeta en ropa', 'expense'],
    ['gasté 50 mil con la tarjeta Visa en ropa', 'expense'],
    ['gasté 80 mil en gasolina del carro', 'expense'],
    ['pagué 300 mil de la cuota de administración', 'expense'],
  ])('%s stays a %s', (text, type) => {
    expect(parse(text).type).toBe(type);
  });

  it('is not a debt without debts', () => {
    expect(parseDictation('pagué la cuota 300 mil', { accounts, now }).type).toBe('expense');
  });
});
