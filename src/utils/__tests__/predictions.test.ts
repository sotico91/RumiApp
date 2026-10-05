import type { Debt, Transaction } from '@/src/types/finance';
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

describe('predictMonthlySpends: monthly bills', () => {
  const tree: SpendConcept[] = [
    {
      id: 'concept-hogar',
      name: 'Hogar',
      color: '#000',
      subs: [
        { id: 'sub-admin', name: 'Administración' },
        { id: 'sub-seguro', name: 'Seguro moto' },
        { id: 'sub-cafe', name: 'Café', isAnt: true },
        { id: 'sub-mercado', name: 'Mercado' },
      ],
    },
  ];
  const at = (categoryId: string, when: string, amount: number) => expense(categoryId, when, amount);
  const find = (items: ReturnType<typeof predictMonthlySpends>, id: string) =>
    items.find((p) => p.categoryId === id);

  it('a bill paid last month and this month shows as paid with what was paid', () => {
    const items = predictMonthlySpends(
      [at('sub-admin', '2026-09-03T10:00', 250_000), at('sub-admin', '2026-10-01T10:00', 260_000)],
      [],
      now,
      tree
    );
    expect(find(items, 'sub-admin')).toMatchObject({
      status: 'paid',
      amount: 260_000,
      paidAmount: 260_000,
      payments: 1,
    });
  });

  it('several payments to the same bill this month add up', () => {
    const items = predictMonthlySpends(
      [
        at('sub-seguro', '2026-08-15T10:00', 90_000),
        at('sub-seguro', '2026-09-15T10:00', 90_000),
        at('sub-seguro', '2026-10-01T10:00', 50_000),
        at('sub-seguro', '2026-10-02T09:00', 40_000),
      ],
      [],
      now,
      tree
    );
    expect(find(items, 'sub-seguro')).toMatchObject({
      status: 'paid',
      amount: 90_000,
      payments: 2,
      expectedAmount: 90_000,
    });
  });

  it('a bill not paid yet this month is pending at its usual month total', () => {
    const items = predictMonthlySpends(
      [
        // September was paid in two parts; the usual month is still ~250.000.
        at('sub-admin', '2026-08-03T10:00', 250_000),
        at('sub-admin', '2026-09-03T10:00', 125_000),
        at('sub-admin', '2026-09-04T10:00', 125_000),
      ],
      [],
      now,
      tree
    );
    expect(find(items, 'sub-admin')).toMatchObject({
      status: 'pending',
      amount: 250_000,
      paidAmount: 0,
      typicalDay: 3,
    });
  });

  it('leaves out everyday spends and ant spends', () => {
    const daily = [8, 9].flatMap((m) =>
      [1, 4, 8, 12, 16].map((d) =>
        at('sub-mercado', `2026-0${m}-${String(d).padStart(2, '0')}T10:00`, 30_000)
      )
    );
    const cafe = [at('sub-cafe', '2026-08-05T10:00', 8_000), at('sub-cafe', '2026-09-05T10:00', 8_000)];
    const items = predictMonthlySpends([...daily, ...cafe], [], now, tree);
    expect(find(items, 'sub-mercado')).toBeUndefined();
    expect(find(items, 'sub-cafe')).toBeUndefined();
  });

  it('drops a bill that stopped months ago', () => {
    const items = predictMonthlySpends(
      [at('sub-admin', '2026-04-03T10:00', 250_000), at('sub-admin', '2026-05-03T10:00', 250_000)],
      [],
      now,
      tree
    );
    expect(find(items, 'sub-admin')).toBeUndefined();
  });

  it('a partly paid installment stays pending with what is left', () => {
    const debt: Debt = {
      id: 'd1',
      name: 'Moto',
      balance: 2_000_000,
      installment: 300_000,
      interestRate: 0,
      termMonths: 12,
      nextPaymentDate: new Date('2026-10-20T12:00').toISOString(),
      paidCapital: 0,
      paidInterest: 0,
      otherCharges: 0,
      categoryId: 'sub-cuota',
    };
    const items = predictMonthlySpends(
      [at('sub-cuota', '2026-10-01T10:00', 100_000)],
      [debt],
      now,
      tree
    );
    expect(items[0]).toMatchObject({
      status: 'pending',
      amount: 200_000,
      paidAmount: 100_000,
      expectedAmount: 300_000,
    });
  });
});
