import type { Debt, Transaction } from '@/src/types/finance';
import {
  calendarMonthRange,
  filterByCalendarMonth,
  isMonthOutflow,
  predictMonthlySpends,
  revolvingDebtIds,
  sumByType,
} from '@/src/utils/financeMath';

const DAY_MS = 24 * 60 * 60 * 1000;

export type MonthProjection = {
  /** Money out so far this month (expenses + loan installments). */
  spent: number;
  income: number;
  /** Days elapsed (today included) and days in the month. */
  days: number;
  totalDays: number;
  /** Known monthly payments (loans, repeating bills) still to come. */
  pendingFixed: number;
  /** Day-to-day spend so far, the part that is extrapolated. */
  variableSoFar: number;
  /** Expected money out by month end. */
  projectedSpend: number;
  /** income − projectedSpend (negative = short). */
  projectedLeft: number;
  /** Too few days for the pace to be reliable. */
  early: boolean;
};

/**
 * Month-end estimate that does not blow up because rent was paid on day 1:
 * fixed payments count once (paid + still pending), and only the variable
 * day-to-day spend is extrapolated at its current pace.
 */
export function projectMonth(
  transactions: Transaction[],
  debts: Debt[] = [],
  now = new Date()
): MonthProjection {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const { from, to } = calendarMonthRange(year, monthIndex);
  const totalDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const days = Math.min(totalDays, Math.max(1, Math.ceil((now.getTime() - from.getTime()) / DAY_MS)));

  const revolving = revolvingDebtIds(debts);
  const month = filterByCalendarMonth(transactions, year, monthIndex);
  const outflow = month.filter((t) => isMonthOutflow(t, revolving));

  // Card payments are not outflow (their purchases already are), so a card's
  // statement payment must not be added as a pending fixed cost either.
  const predictions = predictMonthlySpends(transactions, debts, now).filter(
    (p) => !(p.debtId && revolving.has(p.debtId))
  );
  const fixedCategories = new Set(predictions.map((p) => p.categoryId));
  const isFixed = (t: Transaction) =>
    t.type === 'debt_payment' || (!!t.categoryId && fixedCategories.has(t.categoryId));

  const spent = outflow.reduce((s, t) => s + t.amount, 0);
  const variableSoFar = outflow.filter((t) => !isFixed(t)).reduce((s, t) => s + t.amount, 0);
  const pendingFixed = predictions
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + p.amount, 0);
  const projectedVariable = (variableSoFar / days) * totalDays;
  const projectedSpend = spent - variableSoFar + projectedVariable + pendingFixed;
  const income = sumByType(month, 'income');

  return {
    spent,
    income,
    days,
    totalDays,
    pendingFixed,
    variableSoFar,
    projectedSpend,
    projectedLeft: income - projectedSpend,
    early: days < 7,
  };
}
