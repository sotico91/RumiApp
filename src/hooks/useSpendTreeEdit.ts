import { useCallback } from 'react';

import {
  mergeSpendSubs,
  moveSpendSub,
  removeSpendConceptInto,
  renameSpendConcept,
  renameSpendSub,
  type TreeEdit,
} from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';

export type TreeEditError = Extract<TreeEdit, { ok: false }>['reason'];

/**
 * Rename, move and join categories without losing anything: whatever was filed
 * under a sub that goes away (movements, limits, debts, reminders, quick
 * templates) is re-filed under the one it joins. Works on the full tree, not
 * the picker view. Resolves to null when saved, or why it was not.
 */
export function useSpendTreeEdit() {
  const { settings, applySpendTree } = useSettings();
  const { remapCategories, transactions, debts } = useFinance();
  const concepts = settings.spendConcepts ?? [];

  const run = useCallback(
    async (edit: TreeEdit): Promise<TreeEditError | null> => {
      if (!edit.ok) return edit.reason;
      // Movements first, so none points at a sub that is already gone.
      await remapCategories(edit.remaps);
      await applySpendTree(edit.concepts, edit.remaps);
      return null;
    },
    [remapCategories, applySpendTree]
  );

  /** Movements (and linked debts) filed under these subcategories. */
  const usage = useCallback(
    (subIds: string[]) => {
      const ids = new Set(subIds);
      return {
        movements: transactions.filter((tx) => tx.categoryId && ids.has(tx.categoryId)).length,
        debts: debts.filter((d) => d.categoryId && ids.has(d.categoryId)).length,
      };
    },
    [transactions, debts]
  );

  return {
    usage,
    renameConcept: (conceptId: string, name: string) =>
      run(renameSpendConcept(concepts, conceptId, name)),
    renameSub: (subId: string, name: string) => run(renameSpendSub(concepts, subId, name)),
    moveSub: (subId: string, toConceptId: string) =>
      run(moveSpendSub(concepts, subId, toConceptId)),
    mergeSub: (fromSubId: string, toSubId: string) =>
      run(mergeSpendSubs(concepts, fromSubId, toSubId)),
    removeConceptInto: (conceptId: string, toSubId: string) =>
      run(removeSpendConceptInto(concepts, conceptId, toSubId)),
  };
}
