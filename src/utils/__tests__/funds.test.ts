import type { Account } from '@/src/types/finance';
import {
  accountsForExpenseSource,
  fundsShortfall,
  liquidPocketsForPay,
  spendableTotal,
} from '@/src/utils/accounts';
import { payAccountIdForDebt } from '@/src/utils/debts';
import { applyAccountDelta } from '@/src/utils/ledger';

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

  it('counts only the pocket the spend comes from: it can not go below zero', () => {
    const list = accounts(5000, 20000, 0);
    expect(fundsShortfall(list, { type: 'expense', amount: 5000, accountId: 'cash' })).toBe(0);
    expect(fundsShortfall(list, { type: 'expense', amount: 8000, accountId: 'cash' })).toBe(3000);
    expect(fundsShortfall(list, { type: 'expense', amount: 8000, accountId: 'bank-main' })).toBe(0);
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

describe('pockets offered for a spend', () => {
  it('leaves out pockets with no money', () => {
    const ids = liquidPocketsForPay(accounts(0, 20000, 0)).map((a) => a.id);
    expect(ids).toEqual(['bank-main']);
    expect(accountsForExpenseSource(accounts(0, 0, 0), 'debit')).toEqual([]);
  });

  it('keeps the pocket a movement being edited already uses', () => {
    const ids = liquidPocketsForPay(accounts(0, 20000, 0), 'cash').map((a) => a.id);
    expect(ids).toEqual(['cash', 'bank-main']);
  });
});

describe('editing a spend', () => {
  it('counts the money of the movement being edited as back in the pocket', () => {
    // 20.000 left in cash after a 30.000 spend from it.
    const list = accounts(20000);
    const original = { id: 't1', type: 'expense' as const, amount: 30000, accountId: 'cash', createdAt: '' };
    const undone = applyAccountDelta(list, original, -1);
    expect(fundsShortfall(undone, { type: 'expense', amount: 45000, accountId: 'cash' })).toBe(0);
    expect(fundsShortfall(undone, { type: 'expense', amount: 60000, accountId: 'cash' })).toBe(10000);
  });
});
