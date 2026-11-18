import type { Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import {
  budgetMonthOf,
  calendarMonthRange,
  predictMonthlySpends,
  revolvingDebtIds,
  shiftMonth,
  type PredictedSpend,
} from '@/src/utils/financeMath';
import { projectMonth, type MonthProjection } from '@/src/utils/projection';
import type { TFn } from './types';

/**
 * The person's month in one place, so every answer that talks about "what is
 * left" uses the same numbers. Facts: available, spent, income. Estimates:
 * pending bills (from history and debts) and the pace for the days left.
 *
 * The figures chain: room = income − spent − pendingFixed (what the month's
 * income still covers), and projectedLeft = room − remainingVariable (where the
 * month lands at the usual pace). Cash on hand can be the tighter limit.
 */
export type FinanceSnapshot = {
  projection: MonthProjection;
  /** Cash in liquid pockets right now (fact); null when the caller did not pass it. */
  available: number | null;
  /** Bills and installments expected and not paid yet this month (estimate). */
  pendingFixed: number;
  /** Repeating payments the month expects, card statements left out. */
  fixed: PredictedSpend[];
  /** Days left in the month, today included. */
  daysLeft: number;
  /** income − spent − pendingFixed; null when no income is logged this month. */
  incomeRoom: number | null;
  /** available − pendingFixed; null without `available`. */
  cashRoom: number | null;
  /** The tighter of the two rooms. */
  room: number | null;
  limitedBy: 'income' | 'cash' | null;
  /** room spread over the days left; null when there is no room. */
  perDay: number | null;
  /** Day-to-day spend expected for the days left at the usual pace (estimate). */
  remainingVariable: number;
  /** income − projected month spend; null when no income is logged. */
  projectedLeft: number | null;
};

export function buildSnapshot(
  transactions: Transaction[],
  options: { debts?: Debt[]; spendConcepts?: SpendConcept[]; availableCash?: number },
  now = new Date()
): FinanceSnapshot {
  const debts = options.debts ?? [];
  const p = projectMonth(transactions, debts, now, options.spendConcepts);
  const revolving = revolvingDebtIds(debts);
  const fixed = predictMonthlySpends(transactions, debts, now, options.spendConcepts).filter(
    (x) => !(x.debtId && revolving.has(x.debtId))
  );
  const daysLeft = Math.max(1, p.totalDays - p.days + 1);
  const incomeRoom = p.income > 0 ? p.income - p.spent - p.pendingFixed : null;
  const available = options.availableCash ?? null;
  const cashRoom = available != null ? available - p.pendingFixed : null;

  let room: number | null = null;
  let limitedBy: FinanceSnapshot['limitedBy'] = null;
  if (incomeRoom != null && (cashRoom == null || incomeRoom <= cashRoom)) {
    room = incomeRoom;
    limitedBy = 'income';
  } else if (cashRoom != null) {
    room = cashRoom;
    limitedBy = 'cash';
  }

  return {
    projection: p,
    available,
    pendingFixed: p.pendingFixed,
    fixed,
    daysLeft,
    incomeRoom,
    cashRoom,
    room,
    limitedBy,
    perDay: room != null && room > 0 ? room / daysLeft : null,
    remainingVariable: Math.max(0, p.projectedSpend - p.spent - p.pendingFixed),
    projectedLeft: p.income > 0 ? p.projectedLeft : null,
  };
}

/**
 * Repeating payments due inside [from, to): this month's still-pending ones
 * (any day, they are owed now) and later months' on their usual day.
 */
export function fixedDueBetween(
  snapshot: FinanceSnapshot,
  from: Date,
  to: Date,
  now = new Date()
): { total: number; count: number } {
  const cur = budgetMonthOf(now);
  const curEnd = calendarMonthRange(cur.year, cur.monthIndex).to;
  let total = 0;
  let count = 0;
  for (const p of snapshot.fixed) {
    if (p.status === 'pending' && p.amount > 0 && from < curEnd) {
      total += p.amount;
      count += 1;
    }
    for (let m = 1; m <= 12; m += 1) {
      const month = shiftMonth(cur.year, cur.monthIndex, m);
      const range = calendarMonthRange(month.year, month.monthIndex);
      if (range.from >= to) break;
      let due = new Date(range.from.getFullYear(), range.from.getMonth(), p.typicalDay);
      if (due < range.from) due = new Date(range.from.getFullYear(), range.from.getMonth() + 1, p.typicalDay);
      if (due >= from && due < to && p.expectedAmount > 0) {
        total += p.expectedAmount;
        count += 1;
      }
    }
  }
  return { total, count };
}

/** What an estimate built on the snapshot takes for granted, in plain words. */
export function snapshotAssumptions(s: FinanceSnapshot, t: TFn): string[] {
  const out = [
    s.projection.historyMonths > 0
      ? t('ask.assumePace', { months: s.projection.historyMonths })
      : t('ask.assumePaceThisMonth'),
  ];
  if (s.fixed.length > 0) out.push(t('ask.assumeBills'));
  return out;
}
