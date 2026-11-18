import type { Account, Debt, Transaction } from '@/src/types/finance';
import { moveDestinations, moveSourcesWithCredit } from '@/src/utils/accounts';
import {
  closePaidInstallments,
  creditAvailable,
  creditShortfall,
  payAccountIdForDebt,
} from '@/src/utils/debts';
import {
  applyAccountDelta,
  applyDebtPayment,
  applyTxDebts,
  isCreditDraw,
  normalizePocketMove,
  pocketMoveAccountsReady,
} from '@/src/utils/ledger';

const accounts: Account[] = [
  { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 0 },
  { id: 'bank', nameKey: 'account.bankMain', type: 'bank', balance: 100000 },
  { id: 'savings', nameKey: 'account.savings', type: 'savings', balance: 0 },
  { id: 'investments', nameKey: 'account.investments', type: 'investment', balance: 0 },
  { id: 'credit-card', nameKey: 'account.creditCard', type: 'credit', balance: 0 },
];

const base: Debt = {
  id: 'rot',
  name: 'Rotativo',
  balance: 200000,
  installment: 0,
  interestRate: 0,
  termMonths: 0,
  nextPaymentDate: '2026-11-20',
  paidCapital: 0,
  paidInterest: 0,
  otherCharges: 0,
  kind: 'revolving',
  revolvingProduct: 'line',
  creditLimit: 1000000,
};
const visa: Debt = { ...base, id: 'visa', name: 'Visa', balance: 0, revolvingProduct: 'card' };
const loan: Debt = { ...base, id: 'loan', name: 'Libre inversión', kind: 'installment' };
// A crédito rotativo kept under loans (fixed cuota) and marked as drawable.
const rotLoan: Debt = {
  ...base,
  id: 'rotloan',
  name: 'Rotativo banco',
  kind: 'installment',
  revolvingProduct: undefined,
  drawable: true,
  balance: 0,
  creditLimit: 3000000,
};
const debts = [base, visa, loan, rotLoan];

const balance = (list: Account[], id: string) => list.find((a) => a.id === id)?.balance;
const debtBalance = (list: Debt[], id: string) => list.find((d) => d.id === id)?.balance;

function draw(from: string, to: string, amount: number): Transaction {
  return normalizePocketMove({
    id: 'tx',
    type: 'transfer',
    amount,
    accountId: payAccountIdForDebt(from),
    toAccountId: to,
    createdAt: '2026-11-08T12:00:00.000Z',
  });
}

describe('credit draws (cash advance / cupo into a pocket)', () => {
  it('links the transfer to the card or cupo it leaves from', () => {
    const tx = draw('rot', 'savings', 300000);
    expect(tx.creditDebtId).toBe('rot');
    expect(isCreditDraw(tx)).toBe(true);
  });

  it('a plain transfer or an investment carries no debt link', () => {
    const plain = normalizePocketMove({
      id: 'p',
      type: 'transfer',
      amount: 1,
      accountId: 'bank',
      toAccountId: 'cash',
      creditDebtId: 'rot',
      createdAt: '2026-11-08T12:00:00.000Z',
    });
    expect(plain.creditDebtId).toBeUndefined();
    const invest = normalizePocketMove({ ...draw('rot', 'investments', 1), type: 'investment' });
    expect(invest.creditDebtId).toBeUndefined();
  });

  it('fills the destination and raises the debt by the same amount', () => {
    const tx = draw('rot', 'bank', 300000);
    const nextAccounts = applyAccountDelta(accounts, tx, 1);
    expect(balance(nextAccounts, 'bank')).toBe(400000);
    expect(balance(nextAccounts, 'savings')).toBe(0);
    expect(balance(nextAccounts, 'credit-card')).toBe(0);
    expect(debtBalance(applyTxDebts(debts, tx, 1), 'rot')).toBe(500000);
  });

  it('a card advance to cash works the same', () => {
    const tx = draw('visa', 'cash', 150000);
    expect(balance(applyAccountDelta(accounts, tx, 1), 'cash')).toBe(150000);
    expect(debtBalance(applyTxDebts(debts, tx, 1), 'visa')).toBe(150000);
  });

  it('undo restores pocket and debt', () => {
    const tx = draw('rot', 'savings', 300000);
    const accs = applyAccountDelta(applyAccountDelta(accounts, tx, 1), tx, -1);
    const ds = applyTxDebts(applyTxDebts(debts, tx, 1), tx, -1);
    expect(balance(accs, 'savings')).toBe(0);
    expect(debtBalance(ds, 'rot')).toBe(200000);
  });

  it('a card goes to cash or the main bank; a rotativo or cupo only to the main bank', () => {
    const ready = (from: string, to: string) =>
      pocketMoveAccountsReady(accounts, draw(from, to, 1), debts);
    expect(ready('visa', 'cash')).toBe(true);
    expect(ready('visa', 'bank')).toBe(true);
    expect(ready('visa', 'savings')).toBe(false);
    expect(ready('rot', 'bank')).toBe(true);
    expect(ready('rot', 'cash')).toBe(false);
    expect(ready('rot', 'savings')).toBe(false);
    expect(ready('rotloan', 'bank')).toBe(true);
    expect(ready('rotloan', 'cash')).toBe(false);
    expect(ready('loan', 'bank')).toBe(false);
    expect(ready('nope', 'bank')).toBe(false);
    const closed = [{ ...base, closedAt: '2026-10-01' }];
    expect(pocketMoveAccountsReady(accounts, draw('rot', 'bank', 1), closed)).toBe(false);
  });

  it('a rotativo kept under loans: the debt grows, its cupo shrinks, it never closes at zero', () => {
    const tx = draw('rotloan', 'bank', 500000);
    const [next] = applyTxDebts([rotLoan], tx, 1);
    expect(next.balance).toBe(500000);
    expect(creditAvailable(next)).toBe(2500000);
    expect(creditShortfall(next, 2600000)).toBe(100000);
    const [paid] = applyDebtPayment(
      [next],
      { ...tx, type: 'debt_payment', debtId: 'rotloan', creditDebtId: undefined },
      1
    );
    expect(paid.balance).toBe(0);
    expect(paid.closedAt).toBeUndefined();
    expect(closePaidInstallments([rotLoan], []).changed).toBe(false);
  });

  it('keeps cards, credicheque and cupos open in Wealth after paying them in full', () => {
    const tx = {
      id: 'pay',
      type: 'debt_payment',
      amount: 200000,
      createdAt: '2026-11-18T12:00:00.000Z',
      accountId: 'bank',
      debtId: 'rot',
    } as Transaction;
    for (const product of ['card', 'credicheque', 'line'] as const) {
      const [paid] = applyDebtPayment([{ ...base, revolvingProduct: product }], tx, 1);
      expect(paid.balance).toBe(0);
      expect(paid.closedAt).toBeUndefined();
      expect(creditAvailable(paid)).toBe(1000000);
    }
    const [paidLoan] = applyDebtPayment([{ ...loan, id: 'rot' }], tx, 1);
    expect(paidLoan.closedAt).toBe(tx.createdAt);
  });

  it('reopens cupo products an older version closed at 0', () => {
    const closed = { ...visa, closedAt: '2026-10-01T00:00:00.000Z' };
    const { debts: next, changed } = closePaidInstallments([closed], []);
    expect(changed).toBe(true);
    expect(next[0].closedAt).toBeUndefined();
  });

  it('only blocks past the free cupo when the limit is known', () => {
    expect(creditShortfall(base, 800000)).toBe(0);
    expect(creditShortfall(base, 900000)).toBe(100000);
    expect(creditShortfall({ ...base, creditLimit: undefined }, 5000000)).toBe(0);
  });
});

describe('move pickers', () => {
  const label = (d: Debt) => d.name ?? '';

  it('offers pockets with money plus open cards and cupos, not installment loans', () => {
    const ids = moveSourcesWithCredit(accounts, debts, label).map((a) => a.id);
    expect(ids).toEqual(['bank', 'debt:rot', 'debt:visa', 'debt:rotloan']);
  });

  it('offers only the allowed landing pockets', () => {
    const to = (from: string) => moveDestinations(accounts, from, debts).map((a) => a.id);
    expect(to('debt:visa')).toEqual(['cash', 'bank']);
    expect(to('debt:rot')).toEqual(['bank']);
    expect(to('debt:rotloan')).toEqual(['bank']);
    expect(to('bank')).toContain('investments');
  });

  it('prefers the onboarding main bank over other banks', () => {
    const withMain: Account[] = [
      ...accounts,
      { id: 'bank-main', nameKey: 'account.bankMain', type: 'bank', balance: 0 },
    ];
    expect(moveDestinations(withMain, 'debt:rot', debts).map((a) => a.id)).toEqual(['bank-main']);
  });
});
