import type { SpendConcept, SpendSub } from '@/src/types/settings';

export type ConceptGroup<T> = {
  /** Null for ids that are no longer in the category tree. */
  concept: SpendConcept | null;
  rows: { item: T; sub: SpendSub | null }[];
};

/**
 * Group per-subcategory rows (limits, small spends…) under their category,
 * in the order categories appear in Plan; unknown ids go last.
 */
export function groupBySpendConcept<T>(
  items: T[],
  subIdOf: (item: T) => string,
  concepts: SpendConcept[]
): ConceptGroup<T>[] {
  const groups = new Map<string, ConceptGroup<T>>();
  const orphans: ConceptGroup<T> = { concept: null, rows: [] };

  for (const item of items) {
    const id = subIdOf(item);
    const concept =
      concepts.find((c) => c.id === id) ??
      concepts.find((c) => c.subs.some((s) => s.id === id)) ??
      null;
    if (!concept) {
      orphans.rows.push({ item, sub: null });
      continue;
    }
    const group = groups.get(concept.id) ?? { concept, rows: [] };
    group.rows.push({ item, sub: concept.subs.find((s) => s.id === id) ?? null });
    groups.set(concept.id, group);
  }

  const ordered = concepts
    .map((c) => groups.get(c.id))
    .filter((g): g is ConceptGroup<T> => !!g);
  return orphans.rows.length > 0 ? [...ordered, orphans] : ordered;
}
