import { CREDITS_CONCEPT_ID, ensureSpendConceptSub, findSpendSub } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import {
  buildNoteHistory,
  suggestCategory,
  type CategorySuggestion,
  type NewConceptId,
  type NewSubId,
} from '@/src/utils/suggestCategory';

export type MisfiledSpend = {
  tx: Transaction;
  suggestion: CategorySuggestion;
};

/**
 * Saved spends whose description says they belong somewhere else ("almuerzo"
 * filed under Extra expenses). Same engine as adding a spend; only spends
 * with a description, never debt / Credits movements, and never the ones the
 * user chose to leave as they are. Newest first.
 */
export function findMisfiledSpends(
  transactions: Transaction[],
  spendConcepts: SpendConcept[],
  dismissedIds: ReadonlySet<string> = new Set()
): MisfiledSpend[] {
  const history = buildNoteHistory(transactions);
  const out: MisfiledSpend[] = [];
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.note?.trim() || dismissedIds.has(tx.id)) continue;
    if (tx.categoryId && findSpendSub(spendConcepts, tx.categoryId)?.concept.id === CREDITS_CONCEPT_ID) {
      continue;
    }
    const suggestion = suggestCategory(tx.note, spendConcepts, history, tx.id);
    if (!suggestion) continue;
    if (!suggestion.create && suggestion.subId === tx.categoryId) continue;
    // Already in the category it belongs to: which sub inside it is the user's call.
    const current = tx.categoryId ? findSpendSub(spendConcepts, tx.categoryId) : null;
    const targetConcept = suggestion.create ? suggestion.create.conceptId : suggestion.conceptId;
    if (current && targetConcept && current.concept.id === targetConcept) continue;
    out.push({ tx, suggestion });
  }
  return out.sort((a, b) => b.tx.createdAt.localeCompare(a.tx.createdAt));
}

/**
 * Where each spend goes, creating missing subcategories on the running tree
 * so twenty lunches create "Comidas" once. `names` turns the kinds Rumi
 * creates into names in the app language.
 */
export function planReviewMoves(
  list: MisfiledSpend[],
  concepts: SpendConcept[],
  names: { concept: (id: NewConceptId) => string; sub: (id: NewSubId) => string }
): { concepts: SpendConcept[]; changes: Record<string, string> } {
  let tree = concepts;
  const changes: Record<string, string> = {};
  for (const { tx, suggestion } of list) {
    if (!suggestion.create) {
      changes[tx.id] = suggestion.subId;
      continue;
    }
    const { create } = suggestion;
    const parent = tree.find((c) => c.id === create.conceptId);
    const result = ensureSpendConceptSub(tree, {
      conceptId: parent?.id,
      conceptName: parent?.name ?? names.concept(create.concept),
      subName: names.sub(create.sub),
      isAnt: create.isAnt,
    });
    tree = result.concepts;
    changes[tx.id] = result.subId;
  }
  return { concepts: tree, changes };
}
