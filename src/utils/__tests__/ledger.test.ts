import type { Account, Debt, Transaction } from '@/src/types/finance';
import {
  applyAccountDelta,
  applyDebtPayment,
  applyTxDebts,
  pocketMoveAccountsReady,
} from '@/src/utils/ledger';

const accounts: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 100000 },
  { id: 'bank', nameKey: 'account.bankMain', type: 'bank', balance: 500000 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 0 },
];

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 'tx',
    type: 'expense',
    amount: 0,
    createdAt: '2026-09-15T12:00:00.000Z',
    ...partial,
  };
}

const balance = (list: Account[], id: string) => list.find((a) => a.id === id)?.balance;

describe('applyAccountDelta', () => {
  it('subtracts an expense from its account', () => {
    const next = applyAccountDelta(accounts, tx({ amount: 20000, accountId: 'cash' }));
    expect(balance(next, 'cash')).toBe(80000);
    expect(balance(next, 'bank')).toBe(500000);
  });

  it('adds income to its account', () => {
    const next = applyAccountDelta(accounts, tx({ type: 'income', amount: 1000, accountId: 'bank' }));
    expect(balance(next, 'bank')).toBe(501000);
  });

  it('moves money between pockets on a transfer', () => {
    const next = applyAccountDelta(
      accounts,
      tx({ type: 'transfer', amount: 50000, accountId: 'bank', toAccountId: 'cash' })
    );
    expect(balance(next, 'bank')).toBe(450000);
    expect(balance(next, 'cash')).toBe(150000);
  });

  it('falls back to the investments pocket', () => {
    const next = applyAccountDelta(
      accounts,
      tx({ type: 'investment', amount: 10000, accountId: 'bank', toAccountId: 'missing' })
    );
    expect(balance(next, 'investments')).toBe(10000);
  });

  it('never touches pockets for credit-card charges', () => {
    const next = applyAccountDelta(
      accounts,
      tx({ amount: 30000, accountId: 'cash', creditDebtId: 'debt-card' })
    );
    expect(next).toBe(accounts);
  });

  it('undo restores the original balances', () => {
    const movement = tx({ type: 'transfer', amount: 7000, accountId: 'cash', toAccountId: 'bank' });
    const undone = applyAccountDelta(applyAccountDelta(accounts, movement, 1), movement, -1);
    expect(undone).toEqual(accounts);
  });

  it('does not mutate the input', () => {
    applyAccountDelta(accounts, tx({ amount: 1, accountId: 'cash' }));
    expect(balance(accounts, 'cash')).toBe(100000);
  });
});

describe('pocketMoveAccountsReady', () => {
  it('requires distinct, existing pockets for transfers', () => {
    expect(pocketMoveAccountsReady(accounts, { type: 'transfer', accountId: 'cash', toAccountId: 'bank' })).toBe(true);
    expect(pocketMoveAccountsReady(accounts, { type: 'transfer', accountId: 'cash', toAccountId: 'cash' })).toBe(false);
    expect(pocketMoveAccountsReady(accounts, { type: 'transfer', accountId: 'cash', toAccountId: 'nope' })).toBe(false);
  });

  it('ignores non pocket moves', () => {
    expect(pocketMoveAccountsReady(accounts, { type: 'expense' })).toBe(true);
  });
});

describe('debt payments', () => {
  const loan: Debt = {
    id: 'loan',
    name: 'Moto',
    balance: 100000,
    installment: 25000,
    interestRate: 0,
    termMonths: 4,
    nextPaymentDate: '2026-09-30T00:00:00.000Z',
    paidCapital: 0,
    paidInterest: 0,
    otherCharges: 0,
  };
  const payment = tx({ type: 'debt_payment', amount: 25000, accountId: 'bank', debtId: 'loan' });

  it('lowers the balance and tracks paid capital', () => {
    const [next] = applyDebtPayment([loan], payment, 1);
    expect(next.balance).toBe(75000);
    expect(next.paidCapital).toBe(25000);
    expect(next.closedAt).toBeUndefined();
  });

  it('closes the debt when fully paid', () => {
    const [next] = applyDebtPayment([loan], { ...payment, amount: 100000 }, 1);
    expect(next.balance).toBe(0);
    expect(next.closedAt).toBe(payment.createdAt);
  });

  it('handles older debts without paidCapital', () => {
    const legacy = { ...loan, paidCapital: undefined } as unknown as Debt;
    const [next] = applyDebtPayment([legacy], payment, 1);
    expect(next.paidCapital).toBe(25000);
  });

  it('undo restores balance and paid capital', () => {
    const paid = applyDebtPayment([loan], payment, 1);
    const [restored] = applyDebtPayment(paid, payment, -1);
    expect(restored.balance).toBe(100000);
    expect(restored.paidCapital).toBe(0);
  });

  it('charges a revolving card through creditDebtId', () => {
    const card: Debt = { ...loan, id: 'card', balance: 0, kind: 'revolving', creditLimit: 1000000 };
    const [next] = applyTxDebts([card], tx({ amount: 40000, creditDebtId: 'card' }), 1);
    expect(next.balance).toBe(40000);
  });
});
