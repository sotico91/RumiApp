import type { Transaction } from '@/src/types/finance';
import { pickUsual, rankByUse, usualDestinationAccounts, usualSourceAccounts, usualSpendCategories } from '@/src/utils/habits';

let n = 0;
function tx(p: Partial<Transaction>): Transaction {
  n += 1;
  return { id: `t${n}`, type: 'expense', amount: 1000, createdAt: '2026-11-17T12:00:00.000Z', ...p } as Transaction;
}

describe('rankByUse', () => {
  it('puts the most used first and breaks ties by the latest', () => {
    expect(rankByUse(['a', 'b', 'b', 'a', 'c', undefined])).toEqual(['a', 'b', 'c']);
    expect(rankByUse(['c', 'b', 'b'])).toEqual(['b', 'c']);
  });
});

describe('habits', () => {
  // Newest first, as the ledger keeps them.
  const ledger = [
    tx({ categoryId: 'almuerzo', accountId: 'nequi' }),
    tx({ categoryId: 'mercado', accountId: 'bank-main' }),
    tx({ categoryId: 'almuerzo', accountId: 'cash' }),
    tx({ categoryId: 'almuerzo', accountId: 'nequi' }),
    tx({ categoryId: 'mercado', creditDebtId: 'visa' }),
    tx({ type: 'debt_payment', debtId: 'visa', accountId: 'bank-main' }),
    tx({ type: 'transfer', accountId: 'bank-main', toAccountId: 'nequi' }),
    tx({ type: 'transfer', accountId: 'bank-main', toAccountId: 'nequi' }),
    tx({ type: 'transfer', accountId: 'cash', toAccountId: 'savings' }),
  ];

  it('learns the subcategories logged most', () => {
    expect(usualSpendCategories(ledger)).toEqual(['almuerzo', 'mercado']);
  });

  it('learns where each subcategory is paid from, cards included', () => {
    expect(usualSourceAccounts(ledger, { type: 'expense', categoryId: 'almuerzo' })[0]).toBe('nequi');
    expect(usualSourceAccounts(ledger, { type: 'expense', categoryId: 'mercado' }).slice(0, 2)).toEqual(['bank-main', 'debt:visa']);
  });

  it('learns where a debt is paid from and where moves land', () => {
    expect(usualSourceAccounts(ledger, { type: 'debt_payment', debtId: 'visa' })[0]).toBe('bank-main');
    expect(usualDestinationAccounts(ledger, 'bank-main')[0]).toBe('nequi');
    expect(usualDestinationAccounts(ledger, 'cash')[0]).toBe('savings');
  });

  it('skips the usual account when it is not offered (it does not cover the amount)', () => {
    const ranked = usualSourceAccounts(ledger, { type: 'expense', categoryId: 'almuerzo' });
    expect(pickUsual(ranked, [{ id: 'cash' }, { id: 'bank-main' }])).toBe('cash');
    expect(pickUsual(ranked, [{ id: 'savings' }])).toBeUndefined();
  });
});
