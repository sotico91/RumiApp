import { useCallback, useMemo } from 'react';

import { isGeneralSubName } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import type { SpendConcept } from '@/src/types/settings';
import {
  buildNoteHistory,
  suggestCategory,
  type CategorySuggestion,
} from '@/src/utils/suggestCategory';

export type CategorySuggestionState = {
  suggestion: CategorySuggestion | null;
  /** "Alimentación · Almuerzo" (or the names it will be created with). */
  label: string;
  /** Icon / color of the category it points at, when it exists already. */
  concept: SpendConcept | null;
  isAnt: boolean;
  /** Ids to save with; creates the category / subcategory first when needed. */
  resolve: () => Promise<{ conceptId: string; subId: string } | null>;
};

/** Where a spend with this description belongs (see suggestCategory). */
export function useCategorySuggestion(
  note: string,
  concepts: SpendConcept[]
): CategorySuggestionState {
  const { t } = useLanguage();
  const { transactions } = useFinance();
  const { ensureSpendConceptSub: ensureSpendPath } = useSettings();
  const history = useMemo(() => buildNoteHistory(transactions), [transactions]);
  const suggestion = useMemo(
    () => suggestCategory(note, concepts, history),
    [note, concepts, history]
  );

  const view = useMemo(() => {
    if (!suggestion) return { label: '', concept: null, isAnt: false };
    if (suggestion.create) {
      const parent = concepts.find((c) => c.id === suggestion.create.conceptId) ?? null;
      const conceptName = parent?.name ?? t(`newCat.${suggestion.create.concept}` as TranslationKey);
      const subName = t(`newSub.${suggestion.create.sub}` as TranslationKey);
      return { label: `${conceptName} · ${subName}`, concept: parent, isAnt: suggestion.create.isAnt };
    }
    const concept = concepts.find((c) => c.id === suggestion.conceptId) ?? null;
    const sub = concept?.subs.find((s) => s.id === suggestion.subId);
    if (!concept || !sub) return { label: '', concept: null, isAnt: false };
    const label = isGeneralSubName(sub.name) ? concept.name : `${concept.name} · ${sub.name}`;
    return { label, concept, isAnt: sub.isAnt === true };
  }, [suggestion, concepts, t]);

  const resolve = useCallback(async () => {
    if (!suggestion) return null;
    if (!suggestion.create) return { conceptId: suggestion.conceptId, subId: suggestion.subId };
    const { create } = suggestion;
    const parent = concepts.find((c) => c.id === create.conceptId);
    return ensureSpendPath({
      conceptId: parent?.id,
      conceptName: parent?.name ?? t(`newCat.${create.concept}` as TranslationKey),
      subName: t(`newSub.${create.sub}` as TranslationKey),
      isAnt: create.isAnt,
    });
  }, [suggestion, concepts, ensureSpendPath, t]);

  return { suggestion, ...view, resolve };
}
