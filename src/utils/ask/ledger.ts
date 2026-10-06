import { findConceptById, findSpendSub } from '@/src/data/spendConcepts';
import type { Account, Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { accountDisplayName } from '@/src/utils/accounts';
import { revolvingDebtIds } from '@/src/utils/financeMath';
import type { TFn } from './types';

export function isExpenseTx(tx: Transaction): boolean {
  return tx.type === 'expense';
}

export function isObligationTx(tx: Transaction): boolean {
  return tx.type === 'debt_payment';
}

export function expenseTxs(list: Transaction[]): Transaction[] {
  return list.filter(isExpenseTx);
}

export function obligationTxs(list: Transaction[]): Transaction[] {
  return list.filter(isObligationTx);
}

/** Paying the card / cupo / credicheque — not a new spend. */
export function cardObligationTxs(list: Transaction[], debts?: Debt[]): Transaction[] {
  const ids = revolvingDebtIds(debts);
  const payments = obligationTxs(list);
  if (ids.size === 0) return [];
  return payments.filter((x) => x.debtId && ids.has(x.debtId));
}

export function cardChargeTxs(list: Transaction[]): Transaction[] {
  return expenseTxs(list).filter((x) => x.paymentMethod === 'credit');
}

export function topExpenseCategory(
  list: Transaction[],
  spendConcepts: SpendConcept[]
): { categoryId: string; amount: number; count: number } | null {
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of list) {
    if (!isExpenseTx(tx) || !tx.categoryId) continue;
    const cur = map.get(tx.categoryId) ?? { amount: 0, count: 0 };
    cur.amount += tx.amount;
    cur.count += 1;
    map.set(tx.categoryId, cur);
  }
  let best: { categoryId: string; amount: number; count: number } | null = null;
  for (const [categoryId, v] of map) {
    if (!best || v.amount > best.amount) {
      best = { categoryId, amount: v.amount, count: v.count };
    }
  }
  // Prefer grouping by parent concept when possible for clearer answers.
  if (!best) return null;
  const hit = findSpendSub(spendConcepts, best.categoryId);
  if (!hit) return best;
  let conceptAmount = 0;
  let conceptCount = 0;
  for (const sub of hit.concept.subs) {
    const v = map.get(sub.id);
    if (!v) continue;
    conceptAmount += v.amount;
    conceptCount += v.count;
  }
  if (conceptAmount >= best.amount) {
    return {
      categoryId: hit.concept.subs[0]?.id ?? best.categoryId,
      amount: conceptAmount,
      count: conceptCount,
    };
  }
  return best;
}

export function expenseTotalsByConcept(
  list: Transaction[],
  spendConcepts: SpendConcept[]
): Map<string, { amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  for (const tx of list) {
    if (!isExpenseTx(tx) || !tx.categoryId) continue;
    const hit = findSpendSub(spendConcepts, tx.categoryId);
    const key = hit?.concept.id ?? tx.categoryId;
    const cur = map.get(key) ?? { amount: 0, count: 0 };
    cur.amount += tx.amount;
    cur.count += 1;
    map.set(key, cur);
  }
  return map;
}

export function rankingDetail(
  list: Transaction[],
  spendConcepts: SpendConcept[],
  format: (n: number) => string,
  labelFor: (id: string) => string,
  limit = 3
): string {
  const totals = [...expenseTotalsByConcept(list, spendConcepts).entries()].sort(
    (a, b) => b[1].amount - a[1].amount
  );
  return totals
    .slice(0, limit)
    .map(([id, v]) => {
      const concept = findConceptById(spendConcepts, id);
      const hit = findSpendSub(spendConcepts, id);
      const label = concept?.name ?? hit?.concept.name ?? labelFor(id);
      return `${label} ${format(v.amount)}`;
    })
    .join(' · ');
}

export function accountSpendDetail(
  list: Transaction[],
  accounts: Account[] | undefined,
  t: TFn,
  format: (n: number) => string
): string {
  const map = new Map<string, number>();
  for (const tx of list) {
    if (!isExpenseTx(tx) && !isObligationTx(tx)) continue;
    const id = tx.accountId ?? 'cash';
    map.set(id, (map.get(id) ?? 0) + tx.amount);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, amount]) => {
      const acc = accounts?.find((a) => a.id === id);
      const label = acc ? accountDisplayName(acc, t) : id;
      return `${label} ${format(amount)}`;
    })
    .join(' · ');
}

export function resolveCategoryDisplayName(
  categoryId: string,
  spendConcepts: SpendConcept[],
  categoryLabel: (id: string) => string
): string {
  const concept = findConceptById(spendConcepts, categoryId);
  if (concept?.name) return concept.name;
  const hit = findSpendSub(spendConcepts, categoryId);
  if (hit) return hit.concept.name;
  return categoryLabel(categoryId);
}

export function topCategoryByIncomePercent(
  list: Transaction[],
  income: number,
  spendConcepts: SpendConcept[]
): { categoryId: string; amount: number; count: number; percent: number } | null {
  if (income <= 0) return null;
  const map = expenseTotalsByConcept(list, spendConcepts);
  let best: { categoryId: string; amount: number; count: number; percent: number } | null =
    null;
  for (const [categoryId, v] of map) {
    const percent = (v.amount / income) * 100;
    if (
      !best ||
      percent > best.percent ||
      (percent === best.percent && v.amount > best.amount)
    ) {
      best = { categoryId, amount: v.amount, count: v.count, percent };
    }
  }
  return best;
}

export function rankCategoriesByIncomePercent(
  list: Transaction[],
  income: number,
  spendConcepts: SpendConcept[],
  categoryLabel: (id: string) => string,
  limit = 5
): Array<{ label: string; percent: number; amount: number }> {
  if (income <= 0) return [];
  const map = expenseTotalsByConcept(list, spendConcepts);
  return Array.from(map.entries())
    .map(([categoryId, v]) => ({
      label: resolveCategoryDisplayName(categoryId, spendConcepts, categoryLabel),
      percent: (v.amount / income) * 100,
      amount: v.amount,
    }))
    .sort((a, b) => b.percent - a.percent || b.amount - a.amount)
    .slice(0, limit);
}
