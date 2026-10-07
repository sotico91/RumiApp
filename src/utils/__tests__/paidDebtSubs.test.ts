import { hideSpendSubs, paidDebtSubIds } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { spendByConcept } from '@/src/utils/financeMath';

const now = new Date(2026, 9, 6); // 6 Oct 2026

const concepts: SpendConcept[] = [
  {
    id: 'concept-creditos',
    name: 'Créditos',
    color: '#E63946',
    subs: [
      { id: 'sub-card', name: 'Tarjeta' },
      { id: 'sub-loan', name: 'Libre inversión' },
    ],
  },
  {
    id: 'concept-alimentacion',
    name: 'Alimentación',
    color: '#E07A5F',
    subs: [
      { id: 'sub-lunch', name: 'Almuerzo' },
      { id: 'sub-coffee', name: 'Café', isAnt: true },
    ],
  },
];

describe('paidDebtSubIds', () => {
  it('shows a credit paid this month as paid, hides one paid before', () => {
    const { hidden, paidThisMonth } = paidDebtSubIds(
      [
        { categoryId: 'sub-card', closedAt: new Date(2026, 9, 2).toISOString() },
        { categoryId: 'sub-loan', closedAt: new Date(2026, 8, 30).toISOString() },
      ],
      now
    );
    expect([...paidThisMonth]).toEqual(['sub-card']);
    expect([...hidden]).toEqual(['sub-loan']);
  });

  it('keeps a sub that another open debt still uses', () => {
    const { hidden, paidThisMonth } = paidDebtSubIds(
      [
        { categoryId: 'sub-loan', closedAt: new Date(2026, 5, 1).toISOString() },
        { categoryId: 'sub-loan' },
      ],
      now
    );
    expect(hidden.size).toBe(0);
    expect(paidThisMonth.size).toBe(0);
  });

  it('leaves open debts alone', () => {
    const { hidden } = paidDebtSubIds([{ categoryId: 'sub-card' }], now);
    expect(hidden.size).toBe(0);
  });
});

describe('hideSpendSubs', () => {
  it('drops hidden subs and a category left empty', () => {
    const next = hideSpendSubs(concepts, new Set(['sub-card', 'sub-loan']));
    expect(next.map((c) => c.id)).toEqual(['concept-alimentacion']);
  });

  it('returns the same list when nothing is hidden', () => {
    expect(hideSpendSubs(concepts, new Set())).toBe(concepts);
  });
});

describe('spendByConcept', () => {
  const tx = (
    id: string,
    amount: number,
    categoryId: string,
    type: Transaction['type'] = 'expense',
    debtId?: string
  ): Transaction => ({ id, amount, categoryId, type, debtId, createdAt: now.toISOString() });

  it('adds subs up under their category, biggest first', () => {
    const rows = spendByConcept(
      [
        tx('1', 15000, 'sub-lunch'),
        tx('2', 5000, 'sub-coffee'),
        tx('3', 200000, 'sub-loan', 'debt_payment', 'loan'),
      ],
      concepts,
      [{ id: 'loan', kind: 'installment' }]
    );
    expect(rows.map((r) => [r.id, r.total, r.count])).toEqual([
      ['concept-creditos', 200000, 1],
      ['concept-alimentacion', 20000, 2],
    ]);
  });

  it('skips card payments and income, like the month total', () => {
    const rows = spendByConcept(
      [tx('1', 90000, 'sub-card', 'debt_payment', 'card'), tx('2', 1000, 'salario', 'income')],
      concepts,
      [{ id: 'card', kind: 'revolving' }]
    );
    expect(rows).toEqual([]);
  });
});
