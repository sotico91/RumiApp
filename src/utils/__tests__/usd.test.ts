import type { Account, Transaction } from '@/src/types/finance';
import { settleLiquidOverdrafts } from '@/src/utils/accounts';
import { buildAntSpendTips } from '@/src/utils/antSpendTips';
import { detectRecurring } from '@/src/utils/financeMath';
import { applyAccountDelta } from '@/src/utils/ledger';
import { formatMoney, roundMoney } from '@/src/utils/money';

let seq = 0;
function expense(amount: number, createdAt: string, categoryId = 'cafe'): Transaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    type: 'expense',
    amount,
    categoryId,
    paymentMethod: 'cash',
    accountId: 'cash',
    createdAt,
  };
}

describe('recurring spends in USD', () => {
  it('does not lump a $3 coffee with a $400 purchase', () => {
    const coffee = expense(3, '2026-09-01T10:00:00.000Z');
    const laptop = expense(400, '2026-09-05T10:00:00.000Z');
    expect(detectRecurring([coffee, laptop], 'USD')).toHaveLength(0);
  });

  it('still finds the same spend repeated', () => {
    const a = expense(9.99, '2026-08-01T10:00:00.000Z', 'streaming');
    const b = expense(9.99, '2026-09-01T10:00:00.000Z', 'streaming');
    expect(detectRecurring([a, b], 'USD')).toHaveLength(2);
  });

  it('keeps the COP behavior', () => {
    const a = expense(15000, '2026-08-01T10:00:00.000Z');
    const b = expense(15200, '2026-09-01T10:00:00.000Z');
    expect(detectRecurring([a, b], 'COP')).toHaveLength(2);
  });
});

describe('ant spend tips in USD', () => {
  const now = new Date(2026, 8, 20, 12, 0);
  const lastMonth = [
    expense(2, new Date(2026, 7, 3).toISOString()),
    expense(2, new Date(2026, 7, 10).toISOString()),
  ];
  const thisMonth = [
    expense(4, new Date(2026, 8, 2).toISOString()),
    expense(4, new Date(2026, 8, 9).toISOString()),
    expense(4, new Date(2026, 8, 16).toISOString()),
  ];

  it('suggests a cut when small dollar spends climb', () => {
    const tips = buildAntSpendTips([...lastMonth, ...thisMonth], [], now, 'USD');
    expect(tips).toHaveLength(1);
    expect(tips[0].current).toBe(12);
    expect(tips[0].saveHint).toBeGreaterThan(0);
    expect(tips[0].saveHint).toBeLessThanOrEqual(tips[0].delta);
  });

  it('would never trigger with peso thresholds', () => {
    expect(buildAntSpendTips([...lastMonth, ...thisMonth], [], now, 'COP')).toHaveLength(0);
  });
});

describe('cent rounding', () => {
  it('rounds float residues to clean cents', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(Object.is(roundMoney(-0.0000001), 0)).toBe(true);
  });

  it('never shows -$0.00', () => {
    expect(formatMoney(0.3 - 0.1 - 0.2, 'USD')).toBe('$0.00');
  });

  it('leaves an account at exactly 0 after spending its cents', () => {
    let accounts: Account[] = [{ id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 0.3 }];
    accounts = applyAccountDelta(accounts, expense(0.1, '2026-09-01T10:00:00.000Z'));
    accounts = applyAccountDelta(accounts, expense(0.2, '2026-09-01T11:00:00.000Z'));
    expect(accounts[0].balance).toBe(0);
  });

  it('ignores sub-cent residues instead of moving money between pockets', () => {
    const accounts: Account[] = [
      { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: -2.7e-17 },
      { id: 'bank', nameKey: 'account.bankMain', type: 'bank', balance: 100 },
    ];
    expect(settleLiquidOverdrafts(accounts).changed).toBe(false);
  });

  it('still covers a real overdraft', () => {
    const accounts: Account[] = [
      { id: 'cash', nameKey: 'account.cash', type: 'cash', balance: -5.25 },
      { id: 'bank', nameKey: 'account.bankMain', type: 'bank', balance: 100 },
    ];
    const { accounts: next, changed } = settleLiquidOverdrafts(accounts);
    expect(changed).toBe(true);
    expect(next.find((a) => a.id === 'cash')?.balance).toBe(0);
    expect(next.find((a) => a.id === 'bank')?.balance).toBe(94.75);
  });
});
