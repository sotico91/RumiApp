import type { Transaction, TransactionType } from '@/src/types/finance';
import { payAccountIdForDebt } from '@/src/utils/debts';

/** How many recent movements of a kind the habits look at. */
const HABIT_WINDOW = 150;

/**
 * Most used first; a tie goes to the one used most recently. `ids` come newest
 * first (the ledger's order).
 */
export function rankByUse(ids: Array<string | undefined>): string[] {
  const count = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  ids.forEach((id, i) => {
    if (!id) return;
    count.set(id, (count.get(id) ?? 0) + 1);
    if (!firstSeen.has(id)) firstSeen.set(id, i);
  });
  return [...count.keys()].sort(
    (a, b) => count.get(b)! - count.get(a)! || firstSeen.get(a)! - firstSeen.get(b)!
  );
}

function recentOfType(transactions: Transaction[], type: TransactionType): Transaction[] {
  const out: Transaction[] = [];
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    out.push(tx);
    if (out.length >= HABIT_WINDOW) break;
  }
  return out;
}

/** Where a movement's money left from: the pocket, or the card (`debt:<id>`) for a card spend. */
export function sourceAccountId(tx: Transaction): string | undefined {
  return tx.creditDebtId ? payAccountIdForDebt(tx.creditDebtId) : tx.accountId;
}

/** Spend subcategories the user logs most. */
export function usualSpendCategories(transactions: Transaction[]): string[] {
  return rankByUse(recentOfType(transactions, 'expense').map((tx) => tx.categoryId));
}

/**
 * Where this kind of movement usually comes from: first what was used for the
 * same subcategory (or the same debt), then for that kind of movement at all.
 */
export function usualSourceAccounts(
  transactions: Transaction[],
  input: { type: TransactionType; categoryId?: string | null; debtId?: string | null }
): string[] {
  const recent = recentOfType(transactions, input.type);
  const same = recent.filter(
    (tx) =>
      (input.categoryId ? tx.categoryId === input.categoryId : true) &&
      (input.debtId ? tx.debtId === input.debtId : true)
  );
  const specific = input.categoryId || input.debtId ? rankByUse(same.map(sourceAccountId)) : [];
  const general = rankByUse(recent.map(sourceAccountId));
  return [...specific, ...general.filter((id) => !specific.includes(id))];
}

/** Where moves usually land, preferring those from the same source pocket. */
export function usualDestinationAccounts(transactions: Transaction[], fromId?: string): string[] {
  const recent = recentOfType(transactions, 'transfer');
  const specific = fromId ? rankByUse(recent.filter((tx) => tx.accountId === fromId).map((tx) => tx.toAccountId)) : [];
  const general = rankByUse(recent.map((tx) => tx.toAccountId));
  return [...specific, ...general.filter((id) => !specific.includes(id))];
}

/** The first habitual id that is among the choices (they already cover the amount). */
export function pickUsual(ranked: string[], choices: Array<{ id: string }>): string | undefined {
  return ranked.find((id) => choices.some((c) => c.id === id));
}
