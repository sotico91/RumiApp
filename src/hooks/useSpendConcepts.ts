import { useMemo } from 'react';

import { hideSpendSubs, hideUnusedGeneralSubs, paidDebtSubIds } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import type { SpendConcept } from '@/src/types/settings';

/**
 * Spend categories as pickers show them: an unused "General" sub is hidden,
 * and so is the subcategory of a credit paid off before this month.
 * `keepSubId` stays visible anyway (the movement being edited points at it).
 */
export function usePickableSpendConcepts(keepSubId?: string): SpendConcept[] {
  const { settings } = useSettings();
  const { transactions, budgets, subscriptions, debts } = useFinance();
  const concepts = settings.spendConcepts;
  const reminderIds = settings.reminderCategoryIds;

  return useMemo(() => {
    const used = new Set<string>(reminderIds ?? []);
    for (const tx of transactions) if (tx.categoryId) used.add(tx.categoryId);
    for (const b of budgets) used.add(b.categoryId);
    for (const s of subscriptions) if (s.categoryId) used.add(s.categoryId);
    const { hidden } = paidDebtSubIds(debts);
    if (keepSubId) hidden.delete(keepSubId);
    return hideSpendSubs(hideUnusedGeneralSubs(concepts ?? [], used), hidden);
  }, [concepts, reminderIds, transactions, budgets, subscriptions, debts, keepSubId]);
}
