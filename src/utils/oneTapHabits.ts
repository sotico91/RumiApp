import type { Transaction, PaymentMethod } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { findSpendSub, isGeneralSubName, subColor } from '@/src/data/spendConcepts';
import { payAccountIdForDebt } from '@/src/utils/debts';

/** Glanceable one-tap set — never a full history mirror. */
export const ONE_TAP_MAX_CHIPS = 5;
export const ONE_TAP_LOOKBACK_DAYS = 30;

export type OneTapHabit = {
  /** Stable key = subcategory id (+ description when the sub is "General"). */
  id: string;
  categoryId: string;
  /** What the chip says first: the sub ("Café") or, under "General", the description ("Desayuno"). */
  title?: string;
  /** Its category, shown smaller ("Alimentación"); absent when it would repeat the title. */
  group?: string;
  color?: string;
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
 * - one chip per subcategory (amount can vary between taps); under a "General"
 *   sub, one per description, so "almuerzo" and "desayuno" stay apart
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
      key: string;
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

    const key = habitKey(tx, spendConcepts);
    const prev = byCategory.get(key);
    if (!prev) {
      byCategory.set(key, {
        key,
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
      const general = !hit || isGeneralSubName(hit.sub.name) || hit.sub.name === hit.concept.name;
      const described = general && item.key !== item.categoryId ? capitalize(item.note ?? '') : '';
      const title = described || (hit && !general ? hit.sub.name : hit?.concept.name);
      return {
        id: item.key,
        categoryId: item.categoryId,
        title,
        group: hit && hit.concept.name !== title ? hit.concept.name : undefined,
        color: hit ? subColor(hit.concept, hit.sub) : undefined,
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

const noteKey = (note?: string) => (note ?? '').trim().toLowerCase();

const capitalize = (text: string) => {
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/** The sub alone, unless it is a catch-all ("General"): then its description tells habits apart. */
function habitKey(tx: Transaction, spendConcepts: SpendConcept[]): string {
  const categoryId = tx.categoryId ?? '';
  const hit = findSpendSub(spendConcepts, categoryId);
  const catchAll = !hit || isGeneralSubName(hit.sub.name) || hit.sub.name === hit.concept.name;
  const note = noteKey(tx.note);
  return catchAll && note ? `${categoryId}|${note}` : categoryId;
}
