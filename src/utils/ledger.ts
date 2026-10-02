import type { Account, Debt, Transaction } from '@/src/types/finance';
import { applyRevolvingCharge, closedAtAfterBalance } from '@/src/utils/debts';

/**
 * Apply one movement to account balances.
 * direction 1 = register, -1 = undo.
 * Credit-card charges (creditDebtId) never touch cash pockets.
 */
export function applyAccountDelta(
  accounts: Account[],
  tx: Transaction,
  direction: 1 | -1 = 1
): Account[] {
  if (tx.creditDebtId) return accounts;

  const next = accounts.map((a) => ({ ...a }));
  const find = (id?: string) => next.find((a) => a.id === id);
  const amount = tx.amount * direction;

  if (tx.type === 'expense' || tx.type === 'withdrawal' || tx.type === 'debt_payment') {
    const acc = find(tx.accountId);
    if (acc) acc.balance -= amount;
  }
  if (tx.type === 'income') {
    const acc = find(tx.accountId);
    if (acc) acc.balance += amount;
  }
  if (tx.type === 'transfer') {
    const from = find(tx.accountId);
    const to = find(tx.toAccountId);
    if (from) from.balance -= amount;
    if (to) to.balance += amount;
  }
  if (tx.type === 'investment') {
    const from = find(tx.accountId);
    const to = find(tx.toAccountId) ?? find('investments');
    if (from) from.balance -= amount;
    if (to) to.balance += amount;
  }
  return next;
}

/**
 * True when a pocket move can debit source and credit destination.
 * Partial applies (missing id / unknown pocket) are how wallets drift.
 */
export function pocketMoveAccountsReady(
  accounts: Account[],
  tx: Pick<Transaction, 'type' | 'accountId' | 'toAccountId'>
): boolean {
  if (tx.type !== 'transfer' && tx.type !== 'investment') return true;
  if (!tx.accountId || !tx.toAccountId || tx.accountId === tx.toAccountId) {
    return false;
  }
  const from = accounts.some((a) => a.id === tx.accountId);
  const to =
    tx.type === 'investment'
      ? accounts.some((a) => a.id === tx.toAccountId) ||
        accounts.some((a) => a.id === 'investments')
      : accounts.some((a) => a.id === tx.toAccountId);
  return from && to;
}

/** Cash / bank / wallet / savings / investment — editable opening stock. */
export function isEditablePocketBalance(type: Account['type']): boolean {
  return (
    type === 'cash' ||
    type === 'bank' ||
    type === 'savings' ||
    type === 'wallet' ||
    type === 'investment'
  );
}

/** Apply a debt payment to the matching debt. direction 1 = register, -1 = undo. */
export function applyDebtPayment(
  list: Debt[],
  tx: Transaction,
  direction: 1 | -1
): Debt[] {
  if (tx.type !== 'debt_payment' || !tx.debtId) return list;
  return list.map((d) => {
    if (d.id !== tx.debtId) return d;
    if (direction === 1) {
      const paid = Math.min(tx.amount, d.balance);
      const nextBalance = Math.max(0, d.balance - paid);
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      return {
        ...d,
        balance: nextBalance,
        paidCapital: (d.paidCapital || 0) + paid,
        nextPaymentDate: nextDate.toISOString(),
        closedAt: closedAtAfterBalance(d, nextBalance, tx.createdAt),
      };
    }
    const nextBalance = d.balance + tx.amount;
    return {
      ...d,
      balance: nextBalance,
      paidCapital: Math.max(0, (d.paidCapital || 0) - tx.amount),
      closedAt: closedAtAfterBalance(d, nextBalance, d.closedAt ?? tx.createdAt),
    };
  });
}

export function applyTxDebts(list: Debt[], tx: Transaction, direction: 1 | -1): Debt[] {
  const charged = applyRevolvingCharge(list, tx.creditDebtId, tx.amount, direction);
  return applyDebtPayment(charged, tx, direction);
}
