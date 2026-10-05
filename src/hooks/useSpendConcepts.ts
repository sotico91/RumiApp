import { useMemo } from 'react';

import { hideUnusedGeneralSubs } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import type { SpendConcept } from '@/src/types/settings';

/** Spend categories as pickers show them: an unused "General" sub is hidden. */
export function usePickableSpendConcepts(): SpendConcept[] {
  const { settings } = useSettings();
  const { transactions, budgets, subscriptions } = useFinance();
  const concepts = settings.spendConcepts;
  const reminderIds = settings.reminderCategoryIds;

  return useMemo(() => {
    const used = new Set<string>(reminderIds ?? []);
    for (const tx of transactions) if (tx.categoryId) used.add(tx.categoryId);
    for (const b of budgets) used.add(b.categoryId);
    for (const s of subscriptions) if (s.categoryId) used.add(s.categoryId);
    return hideUnusedGeneralSubs(concepts ?? [], used);
  }, [concepts, reminderIds, transactions, budgets, subscriptions]);
}
