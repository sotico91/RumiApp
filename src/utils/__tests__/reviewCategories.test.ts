import { translations } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { findMisfiledSpends, planReviewMoves } from '@/src/utils/reviewCategories';

const tree: SpendConcept[] = [
  {
    id: 'concept-creditos',
    name: 'Créditos',
    color: '#E63946',
    subs: [{ id: 'sub-card', name: 'Tarjeta' }],
  },
  {
    id: 'concept-alimentacion',
    name: 'Alimentación',
    color: '#E07A5F',
    subs: [
      { id: 'sub-almuerzo', name: 'Almuerzo' },
      { id: 'sub-mercado', name: 'Mercado' },
    ],
  },
  {
    id: 'concept-extra',
    name: 'Gastos adicionales',
    color: '#7A8790',
    subs: [{ id: 'sub-extra', name: 'General' }],
  },
];

let seq = 0;
const tx = (note: string | undefined, categoryId: string, extra: Partial<Transaction> = {}): Transaction => {
  seq += 1;
  return {
    id: `t${seq}`,
    type: 'expense',
    amount: 15000,
    categoryId,
    note,
    createdAt: new Date(2026, 9, seq).toISOString(),
    ...extra,
  };
};

const es = translations.es as Record<string, string>;
const names = {
  concept: (id: string) => es[`newCat.${id}`],
  sub: (id: string) => es[`newSub.${id}`],
};

describe('findMisfiledSpends', () => {
  it('finds a lunch filed under a catch-all, newest first', () => {
    const a = tx('almuerzo', 'sub-extra');
    const b = tx('Almuerzo con Ana', 'sub-extra');
    const found = findMisfiledSpends([a, b], tree);
    expect(found.map((f) => [f.tx.id, f.suggestion.subId])).toEqual([
      [b.id, 'sub-almuerzo'],
      [a.id, 'sub-almuerzo'],
    ]);
  });

  it('leaves alone what is already in a sub that holds it', () => {
    const withRosa: SpendConcept[] = tree.map((c) =>
      c.id === 'concept-alimentacion' ? { ...c, subs: [...c.subs, { id: 'sub-rosa', name: 'Donde Rosa' }] } : c
    );
    expect(findMisfiledSpends([tx('corrientazo', 'sub-rosa')], withRosa)).toEqual([]);
    expect(findMisfiledSpends([tx('almuerzo', 'sub-almuerzo')], tree)).toEqual([]);
  });

  it('moves a lunch out of Mercado, even inside Alimentación', () => {
    const found = findMisfiledSpends([tx('almuerzo', 'sub-mercado')], tree);
    expect(found[0]?.suggestion.subId).toBe('sub-almuerzo');
  });

  it('skips spends with no description, credits, income and dismissed ones', () => {
    const dismissed = tx('almuerzo', 'sub-extra');
    const list = [
      tx(undefined, 'sub-extra'),
      tx('almuerzo', 'sub-card'),
      tx('almuerzo', 'sub-extra', { type: 'income' }),
      dismissed,
    ];
    expect(findMisfiledSpends(list, tree, new Set([dismissed.id]))).toEqual([]);
  });

  it('proposes creating where it belongs when nothing fits yet', () => {
    const found = findMisfiledSpends([tx('cancha de fútbol', 'sub-extra')], tree);
    expect(found[0]?.suggestion.create).toMatchObject({ concept: 'sport', sub: 'football' });
  });

  it('works on English trees and notes', () => {
    const en: SpendConcept[] = [
      { id: 'c-food', name: 'Food', color: '#000000', subs: [{ id: 's-lunch', name: 'Lunch' }] },
      { id: 'c-other', name: 'Other', color: '#000000', subs: [{ id: 's-other', name: 'General' }] },
    ];
    const found = findMisfiledSpends([tx('lunch with Sam', 's-other')], en);
    expect(found[0]?.suggestion.subId).toBe('s-lunch');
  });
});

describe('planReviewMoves', () => {
  it('creates a missing subcategory once for many spends', () => {
    const list = findMisfiledSpends(
      [tx('fútbol', 'sub-extra'), tx('cancha', 'sub-extra'), tx('almuerzo', 'sub-extra')],
      tree
    );
    const plan = planReviewMoves(list, tree, names);
    const sport = plan.concepts.filter((c) => c.name === 'Deporte');
    expect(sport).toHaveLength(1);
    expect(sport[0].subs.map((s) => s.name)).toEqual(['Fútbol']);
    const footballId = sport[0].subs[0].id;
    expect(Object.values(plan.changes).sort()).toEqual([footballId, footballId, 'sub-almuerzo'].sort());
  });

  it('leaves the tree untouched when nothing has to be created', () => {
    const list = findMisfiledSpends([tx('almuerzo', 'sub-extra')], tree);
    expect(planReviewMoves(list, tree, names).concepts).toBe(tree);
  });
});
