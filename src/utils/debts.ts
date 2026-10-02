import type { Account, Debt, DebtKind, RevolvingProduct, Transaction } from '@/src/types/finance';
import { roundMoney } from '@/src/utils/money';

/** Treat remaining balances at or below this as paid off. */
export const SETTLED_EPS = 0.01;

const DEBT_PAY_PREFIX = 'debt:';

export function payAccountIdForDebt(debtId: string): string {
  return `${DEBT_PAY_PREFIX}${debtId}`;
}

export function isDebtPayAccountId(id: string | undefined): boolean {
  return Boolean(id?.startsWith(DEBT_PAY_PREFIX));
}

export function debtIdFromPayAccountId(id: string | undefined): string | undefined {
  if (!id?.startsWith(DEBT_PAY_PREFIX)) return undefined;
  return id.slice(DEBT_PAY_PREFIX.length) || undefined;
}

export function isSettledBalance(balance: number): boolean {
  return !(balance > SETTLED_EPS);
}

export function isOpenDebt(debt: Pick<Debt, 'closedAt'>): boolean {
  return !debt.closedAt;
}

export function openDebts<T extends Pick<Debt, 'closedAt'>>(list: T[]): T[] {
  return list.filter(isOpenDebt);
}

export function closedDebts<T extends Pick<Debt, 'closedAt'>>(list: T[]): T[] {
  return list.filter((d) => Boolean(d.closedAt));
}

/** Amount to suggest when logging a payment: cuota, or remaining if this is the last one. */
export function suggestedDebtPayAmount(debt: Pick<Debt, 'balance' | 'installment'>): number {
  const remaining = Math.max(0, debt.balance || 0);
  if (!(remaining > 0)) return 0;
  if (debt.installment > 0) return Math.min(debt.installment, remaining);
  return remaining;
}

export type InstallmentPayScope = 'cuota' | 'full' | 'other';

export type InstallmentPayChoices = {
  cuota: number;
  remaining: number;
  /** Month-pay chip only when it is less than what is still owed. */
  hasDistinctMonthPay: boolean;
  revolving: boolean;
};

/** Fixed loans, cards, credicheque and cupos: pay this month, pay all owed, or another amount. */
export function installmentPayChoices(
  debt: Pick<Debt, 'kind' | 'balance' | 'installment'> | undefined
): InstallmentPayChoices | null {
  if (!debt) return null;
  const remaining = Math.max(0, debt.balance || 0);
  if (!(remaining > SETTLED_EPS)) return null;
  const cuota = debt.installment > 0 ? Math.min(debt.installment, remaining) : 0;
  return {
    cuota,
    remaining,
    hasDistinctMonthPay: cuota > SETTLED_EPS && remaining > cuota + SETTLED_EPS,
    revolving: isRevolving(debt),
  };
}

export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= SETTLED_EPS;
}

export function inferInstallmentPayScope(
  choices: InstallmentPayChoices,
  amount: number | null
): InstallmentPayScope {
  if (amount == null || !(amount > 0)) {
    return choices.hasDistinctMonthPay ? 'cuota' : 'full';
  }
  if (amountsMatch(amount, choices.remaining)) return 'full';
  if (choices.hasDistinctMonthPay && amountsMatch(amount, choices.cuota)) return 'cuota';
  return 'other';
}

/** True when this payment brings remaining owed / used to 0. */
export function paymentSettlesInstallment(
  debt: Pick<Debt, 'kind' | 'balance'> | undefined,
  paid: number
): boolean {
  if (!debt || !(paid > 0)) return false;
  return isSettledBalance(Math.max(0, (debt.balance || 0) - paid));
}

/** Any debt that reaches 0 after a payment leaves live Wealth (kept via closedAt). */
export function closedAtAfterBalance(
  debt: Pick<Debt, 'kind' | 'closedAt'>,
  nextBalance: number,
  closedAt: string
): string | undefined {
  if (isSettledBalance(nextBalance)) return debt.closedAt ?? closedAt;
  return undefined;
}

/** Mark already-zero installment loans as settled (migration + first load). */
export function closePaidInstallments(
  debts: Debt[],
  transactions: Transaction[],
  nowIso = new Date().toISOString()
): { debts: Debt[]; changed: boolean } {
  const lastPay = new Map<string, string>();
  for (const tx of transactions) {
    if (tx.type !== 'debt_payment' || !tx.debtId) continue;
    const prev = lastPay.get(tx.debtId);
    if (!prev || tx.createdAt > prev) lastPay.set(tx.debtId, tx.createdAt);
  }
  let changed = false;
  const next = debts.map((debt) => {
    if (isRevolving(debt) || debt.closedAt || !isSettledBalance(debt.balance)) {
      return debt;
    }
    changed = true;
    return { ...debt, closedAt: lastPay.get(debt.id) ?? nowIso };
  });
  return { debts: next, changed };
}

export function revolvingAsPayAccounts(
  debts: Debt[],
  labelFor: (debt: Debt) => string
): Account[] {
  return debts.filter((debt) => isRevolving(debt) && isOpenDebt(debt)).map((debt) => ({
    id: payAccountIdForDebt(debt.id),
    nameKey: 'account.creditCard',
    name: labelFor(debt),
    type: 'credit',
    balance: creditAvailable(debt),
  }));
}

export function debtKind(debt: Pick<Debt, 'kind'>): DebtKind {
  return debt.kind === 'revolving' ? 'revolving' : 'installment';
}

export function isRevolving(debt: Pick<Debt, 'kind'>): boolean {
  return debtKind(debt) === 'revolving';
}

export function revolvingProduct(
  debt: Pick<Debt, 'kind' | 'revolvingProduct'>
): RevolvingProduct {
  if (!isRevolving(debt)) return 'card';
  return debt.revolvingProduct ?? 'card';
}

/** Cupo still available to charge. Over-limit reads as 0. */
export function creditAvailable(
  debt: Pick<Debt, 'kind' | 'creditLimit' | 'balance'>
): number {
  if (!isRevolving(debt)) return 0;
  return Math.max(0, (debt.creditLimit ?? 0) - (debt.balance || 0));
}

export function applyRevolvingCharge(
  debts: Debt[],
  debtId: string | undefined,
  amount: number,
  direction: 1 | -1
): Debt[] {
  if (!debtId || !amount) return debts;
  return debts.map((debt) => {
    if (debt.id !== debtId) return debt;
    const nextBalance = roundMoney(Math.max(0, (debt.balance || 0) + amount * direction));
    return {
      ...debt,
      balance: nextBalance,
      closedAt: nextBalance > SETTLED_EPS ? undefined : debt.closedAt,
    };
  });
}

export function totalOwed(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + (debt.balance || 0), 0);
}

export function monthlyDue(debts: Debt[]): number {
  return openDebts(debts).reduce((sum, debt) => sum + (debt.installment || 0), 0);
}

export function revolvingAvailableTotal(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + creditAvailable(debt), 0);
}

export function productLabelKey(
  product: RevolvingProduct
): 'wealth.productCard' | 'wealth.productCredicheque' | 'wealth.productLine' {
  if (product === 'credicheque') return 'wealth.productCredicheque';
  if (product === 'line') return 'wealth.productLine';
  return 'wealth.productCard';
}

/**
 * Amount parsers in the app reject 0. Revolving used / this-month pay can be 0.
 */
export function parseNonNegativeAmount(
  raw: string,
  parsePositive: (value: string) => number | null
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const positive = parsePositive(trimmed);
  if (positive != null) return positive;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits === '' || /^0+$/.test(digits)) return 0;
  return null;
}
