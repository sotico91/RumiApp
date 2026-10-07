import {
  applyCategoryIdRemaps,
  mergeSpendSubs,
  moveSpendSub,
  remapBudgets,
  removeSpendConceptInto,
  renameSpendConcept,
  renameSpendSub,
  uniqueSubId,
} from '@/src/data/spendConcepts';
import type { Budget, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';

const tree: SpendConcept[] = [
  {
    id: 'concept-otros',
    name: 'Otros',
    color: '#7A8790',
    subs: [
      { id: 'sub-otros-transporte', name: 'Transporte' },
      { id: 'sub-otros-cine', name: 'Cine' },
    ],
  },
  {
    id: 'concept-transporte',
    name: 'Transporte',
    color: '#2EC4B6',
    subs: [
      { id: 'sub-transporte-general', name: 'General' },
      { id: 'sub-transporte-taxi', name: 'Taxi y apps', isAnt: true },
    ],
  },
];

describe('the Otros → Ocio example', () => {
  it('renames the category, keeping its id (movements stay)', () => {
    const edit = renameSpendConcept(tree, 'concept-otros', '  Ocio ');
    if (!edit.ok) throw new Error(edit.reason);
    expect(edit.concepts[0]).toMatchObject({ id: 'concept-otros', name: 'Ocio' });
    expect(edit.remaps).toEqual({});
  });

  it('joins Otros · Transporte into Transporte · General and re-files its movements', () => {
    const edit = mergeSpendSubs(tree, 'sub-otros-transporte', 'sub-transporte-general');
    if (!edit.ok) throw new Error(edit.reason);
    expect(edit.concepts[0].subs.map((s) => s.id)).toEqual(['sub-otros-cine']);
    expect(edit.remaps).toEqual({ 'sub-otros-transporte': 'sub-transporte-general' });

    const txs: Transaction[] = [
      { id: '1', type: 'expense', amount: 5000, categoryId: 'sub-otros-transporte', createdAt: '2026-10-01' },
      { id: '2', type: 'expense', amount: 9000, categoryId: 'sub-otros-cine', createdAt: '2026-10-02' },
    ];
    expect(applyCategoryIdRemaps(txs, edit.remaps).map((tx) => tx.categoryId)).toEqual([
      'sub-transporte-general',
      'sub-otros-cine',
    ]);
  });
});

describe('moveSpendSub', () => {
  it('moves a sub with its id', () => {
    const edit = moveSpendSub(tree, 'sub-otros-cine', 'concept-transporte');
    if (!edit.ok) throw new Error(edit.reason);
    expect(edit.concepts[1].subs.map((s) => s.id)).toContain('sub-otros-cine');
    expect(edit.concepts[0].subs.map((s) => s.id)).toEqual(['sub-otros-transporte']);
    expect(edit.remaps).toEqual({});
  });

  it('joins with a same-name sub in the destination instead of duplicating it', () => {
    const withTwin: SpendConcept[] = [
      tree[0],
      { ...tree[1], subs: [...tree[1].subs, { id: 'sub-t-cine', name: 'cine' }] },
    ];
    const edit = moveSpendSub(withTwin, 'sub-otros-cine', 'concept-transporte');
    if (!edit.ok) throw new Error(edit.reason);
    expect(edit.remaps).toEqual({ 'sub-otros-cine': 'sub-t-cine' });
  });

  it('leaves a General placeholder in a category it empties', () => {
    const single: SpendConcept[] = [
      { id: 'concept-a', name: 'A', color: '#000000', subs: [{ id: 'sub-a-x', name: 'X' }] },
      { id: 'concept-b', name: 'B', color: '#000000', subs: [{ id: 'sub-b-y', name: 'Y' }] },
    ];
    const edit = moveSpendSub(single, 'sub-a-x', 'concept-b');
    if (!edit.ok) throw new Error(edit.reason);
    expect(edit.concepts[0].subs).toHaveLength(1);
    expect(edit.concepts[0].subs[0].name).toBe('General');
  });

  it('refuses moving into its own category', () => {
    expect(moveSpendSub(tree, 'sub-otros-cine', 'concept-otros')).toEqual({ ok: false, reason: 'same' });
  });
});

describe('renames', () => {
  it('refuses a name another category already has', () => {
    expect(renameSpendConcept(tree, 'concept-otros', 'transporte')).toEqual({
      ok: false,
      reason: 'duplicate',
    });
  });

  it('refuses a sub name already used in the same category, allows it elsewhere', () => {
    expect(renameSpendSub(tree, 'sub-otros-cine', 'Transporte')).toEqual({
      ok: false,
      reason: 'duplicate',
    });
    expect(renameSpendSub(tree, 'sub-transporte-taxi', 'Cine').ok).toBe(true);
  });

  it('refuses an empty name', () => {
    expect(renameSpendSub(tree, 'sub-otros-cine', '  ')).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('removeSpendConceptInto', () => {
  it('re-files every sub of the category to one destination', () => {
    const edit = removeSpendConceptInto(tree, 'concept-otros', 'sub-transporte-general');
    if (!edit.ok) throw new Error(edit.reason);
    expect(edit.concepts.map((c) => c.id)).toEqual(['concept-transporte']);
    expect(edit.remaps).toEqual({
      'concept-otros': 'sub-transporte-general',
      'sub-otros-transporte': 'sub-transporte-general',
      'sub-otros-cine': 'sub-transporte-general',
    });
  });

  it('refuses a destination inside the category being removed', () => {
    expect(removeSpendConceptInto(tree, 'concept-otros', 'sub-otros-cine')).toEqual({
      ok: false,
      reason: 'same',
    });
  });
});

describe('remapBudgets', () => {
  const budgets: Budget[] = [
    { id: 'b1', categoryId: 'sub-otros-transporte', limit: 50000 },
    { id: 'b2', categoryId: 'sub-transporte-general', limit: 120000 },
    { id: 'b3', categoryId: 'sub-otros-cine', limit: 30000 },
  ];

  it('keeps the destination limit when both had one', () => {
    const next = remapBudgets(budgets, { 'sub-otros-transporte': 'sub-transporte-general' });
    expect(next).toEqual([budgets[1], budgets[2]]);
  });

  it('carries the limit over when the destination had none', () => {
    const next = remapBudgets(budgets, { 'sub-otros-cine': 'sub-transporte-taxi' });
    expect(next.find((b) => b.id === 'b3')?.categoryId).toBe('sub-transporte-taxi');
  });
});

describe('uniqueSubId', () => {
  it('suffixes an id that a moved sub already owns', () => {
    expect(uniqueSubId(tree, 'sub-otros-cine')).toBe('sub-otros-cine-2');
    expect(uniqueSubId(tree, 'sub-nuevo')).toBe('sub-nuevo');
  });
});
