import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { predictMonthlySpends } from '@/src/utils/financeMath';

let seq = 0;
const expense = (categoryId: string, when: string, amount = 50_000): Transaction => ({
  id: `t${++seq}`,
  type: 'expense',
  amount,
  categoryId,
  accountId: 'cash',
  createdAt: new Date(when).toISOString(),
});

const concepts: SpendConcept[] = [
  { id: 'concept-recibos', name: 'Recibos', color: '#000', subs: [{ id: 'sub-luz', name: 'Luz' }] },
];

// Both bills repeated in August and September; "gym" was deleted from the tree since.
const history = [
  expense('sub-luz', '2026-08-10T10:00'),
  expense('sub-luz', '2026-09-10T10:00'),
  expense('sub-gym', '2026-08-05T10:00'),
  expense('sub-gym', '2026-09-05T10:00'),
];
const now = new Date('2026-10-02T12:00');

describe('predictMonthlySpends', () => {
  it('only predicts repeating bills whose subcategory still exists', () => {
    const ids = predictMonthlySpends(history, [], now, concepts).map((p) => p.categoryId);
    expect(ids).toEqual(['sub-luz']);
  });

  it('keeps the old behavior when no concepts are given', () => {
    const ids = predictMonthlySpends(history, [], now).map((p) => p.categoryId).sort();
    expect(ids).toEqual(['sub-gym', 'sub-luz']);
  });
});
