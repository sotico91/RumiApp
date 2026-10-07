import { useCallback, useMemo } from 'react';

import { findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import { describeSuggestion } from '@/src/hooks/useCategorySuggestion';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { categoryLabel } from '@/src/utils/categoryLabel';
import {
  findMisfiledSpends,
  planReviewMoves,
  type MisfiledSpend,
} from '@/src/utils/reviewCategories';

export type ReviewItem = MisfiledSpend & {
  /** Where it is now / where it would go, ready to show. */
  from: string;
  to: string;
  creates: boolean;
};

/**
 * Saved spends that seem misfiled, and the two answers: move them (creating
 * the subcategory when needed, once even for many spends) or leave them.
 */
export function useCategoryReview() {
  const { t } = useLanguage();
  const { settings, applySpendTree, dismissCategoryReview } = useSettings();
  const { transactions, recategorizeTransactions, canEditTransaction } = useFinance();
  const concepts = useMemo(() => settings.spendConcepts ?? [], [settings.spendConcepts]);

  const items = useMemo<ReviewItem[]>(() => {
    const whereNow = (categoryId?: string) => {
      if (!categoryId) return t('review.noCategory');
      const hit = findSpendSub(concepts, categoryId);
      if (!hit) return categoryLabel(categoryId, t, concepts);
      return isGeneralSubName(hit.sub.name) ? hit.concept.name : `${hit.concept.name} · ${hit.sub.name}`;
    };
    const dismissed = new Set(settings.categoryReviewDismissed ?? []);
    const editable = transactions.filter(canEditTransaction);
    return findMisfiledSpends(editable, concepts, dismissed, settings.taughtCategories ?? []).map((item) => ({
      ...item,
      from: whereNow(item.tx.categoryId),
      to: describeSuggestion(item.suggestion, concepts, t).label,
      creates: !!item.suggestion.create,
    }));
  }, [transactions, canEditTransaction, concepts, settings.categoryReviewDismissed, settings.taughtCategories, t]);

  const move = useCallback(
    async (list: ReviewItem[]) => {
      const plan = planReviewMoves(list, concepts, {
        concept: (id) => t(`newCat.${id}` as TranslationKey),
        sub: (id) => t(`newSub.${id}` as TranslationKey),
      });
      if (plan.concepts !== concepts) await applySpendTree(plan.concepts, {});
      await recategorizeTransactions(plan.changes);
    },
    [concepts, applySpendTree, recategorizeTransactions, t]
  );

  const leave = useCallback(
    (list: ReviewItem[]) =>
      // Leaving it there is a lesson too: this description belongs where it is.
      dismissCategoryReview(
        list.map((item) => ({ txId: item.tx.id, note: item.tx.note, subId: item.tx.categoryId }))
      ),
    [dismissCategoryReview]
  );

  return { items, move, leave };
}
