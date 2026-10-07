import { useCallback, useEffect, useMemo, useRef } from 'react';

import { isGeneralSubName } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import type { SpendConcept } from '@/src/types/settings';
import {
  buildNoteHistory,
  fold,
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

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** "Alimentación · Almuerzo" (or the names it would be created with), its category and ant flag. */
export function describeSuggestion(
  suggestion: CategorySuggestion | null,
  concepts: SpendConcept[],
  t: TFn
): { label: string; concept: SpendConcept | null; isAnt: boolean } {
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
}

/** Where a spend with this description belongs (see suggestCategory). */
export function useCategorySuggestion(
  note: string,
  concepts: SpendConcept[]
): CategorySuggestionState {
  const { t } = useLanguage();
  const { transactions } = useFinance();
  const { ensureSpendConceptSub: ensureSpendPath, settings } = useSettings();
  const taught = settings.taughtCategories;
  const history = useMemo(() => buildNoteHistory(transactions), [transactions]);
  const fresh = useMemo(
    () => suggestCategory(note, concepts, history, undefined, taught ?? []),
    [note, concepts, history, taught]
  );
  // While the user fixes a typo or deletes a letter ("almuerzo" → "almuerz" →
  // "alm"), keep the last suggestion instead of flickering to nothing.
  const last = useRef<{ note: string; suggestion: CategorySuggestion } | null>(null);
  const typed = fold(note);
  const prev = last.current;
  const suggestion =
    fresh ??
    (typed && prev && (prev.note.startsWith(typed) || typed.startsWith(prev.note))
      ? prev.suggestion
      : null);
  useEffect(() => {
    if (fresh) last.current = { note: typed, suggestion: fresh };
    else if (!typed) last.current = null;
  }, [fresh, typed]);

  const view = useMemo(() => describeSuggestion(suggestion, concepts, t), [suggestion, concepts, t]);

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
