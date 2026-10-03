import type { SpendConcept } from '@/src/types/settings';
import { groupBySpendConcept } from '@/src/utils/conceptGroups';

const concepts: SpendConcept[] = [
  {
    id: 'concept-recibos',
    name: 'Recibos',
    color: '#4361EE',
    subs: [
      { id: 'sub-luz', name: 'Luz' },
      { id: 'sub-netflix', name: 'Suscripciones', isAnt: true },
    ],
  },
  {
    id: 'concept-alimentacion',
    name: 'Alimentación',
    color: '#E07A5F',
    subs: [
      { id: 'sub-cafe', name: 'Café', isAnt: true },
      { id: 'sub-snack', name: 'Snack', isAnt: true },
    ],
  },
];

describe('groupBySpendConcept', () => {
  it('puts each subcategory under its category, in Plan order', () => {
    const groups = groupBySpendConcept(
      ['sub-snack', 'sub-luz', 'sub-cafe'],
      (id) => id,
      concepts
    );
    expect(groups.map((g) => g.concept?.name)).toEqual(['Recibos', 'Alimentación']);
    expect(groups[1].rows.map((r) => r.sub?.name)).toEqual(['Snack', 'Café']);
  });

  it('keeps a limit set on the category itself under that category', () => {
    const groups = groupBySpendConcept(['concept-recibos'], (id) => id, concepts);
    expect(groups[0].concept?.id).toBe('concept-recibos');
    expect(groups[0].rows[0].sub).toBeNull();
  });

  it('puts ids no longer in the tree in a last group without category', () => {
    const groups = groupBySpendConcept(['sub-gone', 'sub-luz'], (id) => id, concepts);
    expect(groups.map((g) => g.concept?.name ?? null)).toEqual(['Recibos', null]);
  });

  it('returns nothing for nothing', () => {
    expect(groupBySpendConcept([], (id: string) => id, concepts)).toEqual([]);
  });
});
