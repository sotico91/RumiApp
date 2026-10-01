import type { Transaction, PaymentMethod } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { findSpendSub } from '@/src/data/spendConcepts';
import { payAccountIdForDebt } from '@/src/utils/debts';

/** Glanceable one-tap set — never a full history mirror. */
export const ONE_TAP_MAX_CHIPS = 5;
export const ONE_TAP_LOOKBACK_DAYS = 30;

export type OneTapHabit = {
  /** Stable key = subcategory id. */
  id: string;
  categoryId: string;
  /** Most recent amount for this subcategory (suggested on repeat). */
  amount: number;
  note?: string;
  count: number;
  lastAt: string;
  isAnt?: boolean;
  paymentMethod?: PaymentMethod;
  accountId?: string;
};

/**
 * Build one-tap chips from real expenses:
 * - one chip per subcategory (amount can vary between taps)
 * - ranked by frequency (then most recent)
 * - hard cap so Home stays glanceable
 */
export function buildOneTapHabits(
  transactions: Transaction[],
  allowedIds: Set<string>,
  spendConcepts: SpendConcept[] = [],
  opts?: { lookbackDays?: number; max?: number; now?: Date }
): OneTapHabit[] {
  const lookbackDays = opts?.lookbackDays ?? ONE_TAP_LOOKBACK_DAYS;
  const max = opts?.max ?? ONE_TAP_MAX_CHIPS;
  const now = opts?.now ?? new Date();
  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  const byCategory = new Map<
    string,
    {
      categoryId: string;
      amount: number;
      note?: string;
      count: number;
      lastAt: string;
      paymentMethod?: PaymentMethod;
      accountId?: string;
    }
  >();

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (!tx.categoryId || !allowedIds.has(tx.categoryId)) continue;
    const at = Date.parse(tx.createdAt);
    if (!Number.isFinite(at) || at < cutoff) continue;

    const prev = byCategory.get(tx.categoryId);
    if (!prev) {
      byCategory.set(tx.categoryId, {
        categoryId: tx.categoryId,
        amount: tx.amount,
        note: tx.note,
        count: 1,
        lastAt: tx.createdAt,
        paymentMethod: tx.creditDebtId ? 'credit' : tx.paymentMethod,
        accountId: tx.creditDebtId
          ? payAccountIdForDebt(tx.creditDebtId)
          : tx.accountId,
      });
      continue;
    }
    prev.count += 1;
    if (tx.createdAt > prev.lastAt) {
      prev.lastAt = tx.createdAt;
      prev.amount = tx.amount;
      prev.note = tx.note;
      prev.paymentMethod = tx.creditDebtId ? 'credit' : tx.paymentMethod;
      prev.accountId = tx.creditDebtId
        ? payAccountIdForDebt(tx.creditDebtId)
        : tx.accountId;
    }
  }

  return [...byCategory.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastAt.localeCompare(a.lastAt);
    })
    .slice(0, max)
    .map((item) => {
      const hit = findSpendSub(spendConcepts, item.categoryId);
      return {
        id: item.categoryId,
        categoryId: item.categoryId,
        amount: item.amount,
        note: item.note,
        count: item.count,
        lastAt: item.lastAt,
        isAnt: hit?.sub.isAnt === true,
        paymentMethod: item.paymentMethod,
        accountId: item.accountId,
      };
    });
}
