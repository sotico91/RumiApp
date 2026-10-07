import type { Account } from '@/src/types/finance';
import { fundsShortfall, spendableTotal } from '@/src/utils/accounts';
import { payAccountIdForDebt } from '@/src/utils/debts';

const accounts = (cash: number, bank = 0, savings = 0): Account[] => [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: cash },
  { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: bank },
  { id: 'savings', nameKey: 'account.savings', type: 'savings', balance: savings },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: 0 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 500000 },
];

describe('fundsShortfall', () => {
  it('blocks a spend when no money was logged yet', () => {
    expect(fundsShortfall(accounts(0), { type: 'expense', amount: 15000, accountId: 'cash' })).toBe(15000);
  });

  it('counts every pocket, not just the one picked (they cover each other)', () => {
    const list = accounts(5000, 20000, 0);
    expect(fundsShortfall(list, { type: 'expense', amount: 25000, accountId: 'cash' })).toBe(0);
    expect(fundsShortfall(list, { type: 'expense', amount: 30000, accountId: 'cash' })).toBe(5000);
  });

  it('never counts investments as money to spend', () => {
    expect(spendableTotal(accounts(0))).toBe(0);
  });

  it('lets credit card spends through: that money is the card limit', () => {
    const list = accounts(0);
    expect(
      fundsShortfall(list, { type: 'expense', amount: 80000, accountId: payAccountIdForDebt('visa') })
    ).toBe(0);
    expect(fundsShortfall(list, { type: 'expense', amount: 80000, accountId: 'credit-card' })).toBe(0);
  });

  it('applies to debt payments, not to income or moves', () => {
    const list = accounts(0);
    expect(fundsShortfall(list, { type: 'debt_payment', amount: 100, accountId: 'bank-main' })).toBe(100);
    expect(fundsShortfall(list, { type: 'income', amount: 100, accountId: 'cash' })).toBe(0);
    expect(fundsShortfall(list, { type: 'transfer', amount: 100, accountId: 'cash' })).toBe(0);
  });

  it('works the same with dollars and cents', () => {
    const list = accounts(10.5);
    expect(fundsShortfall(list, { type: 'expense', amount: 10.5, accountId: 'cash' })).toBe(0);
    expect(fundsShortfall(list, { type: 'expense', amount: 12.25, accountId: 'cash' })).toBe(1.75);
  });
});
