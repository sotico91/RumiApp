import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { buildOneTapHabits } from '@/src/utils/oneTapHabits';

/** One-tap chips name the concrete thing bought, not the broad category. */
const concepts: SpendConcept[] = [
  {
    id: 'concept-food',
    name: 'Alimentación',
    color: '#E07A5F',
    subs: [
      { id: 'sub-cafe', name: 'Café', color: '#8D5524' },
      { id: 'sub-general', name: 'General' },
    ],
  },
];
const now = new Date('2026-10-25T12:00:00');
let seq = 0;
const spend = (categoryId: string, amount: number, note?: string): Transaction => {
  seq += 1;
  return {
    id: `t${seq}`,
    type: 'expense',
    amount,
    categoryId,
    note,
    accountId: 'cash',
    createdAt: new Date(now.getTime() - seq * 3_600_000).toISOString(),
  };
};
const habits = (txs: Transaction[]) =>
  buildOneTapHabits(txs, new Set(['sub-cafe', 'sub-general']), concepts, { now });

it('a sub chip says the sub first, its category apart, in the sub color', () => {
  const [cafe] = habits([spend('sub-cafe', 6500), spend('sub-cafe', 7000)]);
  expect(cafe).toMatchObject({ title: 'Café', group: 'Alimentación', color: '#8D5524', amount: 6500, count: 2 });
});

it('under "General" each description is its own chip', () => {
  const list = habits([
    spend('sub-general', 12000, 'desayuno'),
    spend('sub-general', 24000, 'Almuerzo'),
    spend('sub-general', 22000, 'almuerzo '),
  ]);
  expect(list.map((h) => [h.title, h.amount, h.count])).toEqual([
    ['Almuerzo', 24000, 2],
    ['Desayuno', 12000, 1],
  ]);
  expect(new Set(list.map((h) => h.id)).size).toBe(2);
});
