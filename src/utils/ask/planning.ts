import type { Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { buildAntSpendTips } from '@/src/utils/antSpendTips';
import {
  filterByPeriod,
  isMonthOutflow,
  predictMonthlySpends,
  revolvingDebtIds,
  sumByType,
  sumSpendOut,
} from '@/src/utils/financeMath';
import { projectMonth } from '@/src/utils/projection';
import { DAY_MS, type QueryPeriod } from './period';
import { parseQueryAmount } from './signals';
import { includesAny } from './text';
import type { AskOptions, TFn } from './types';

export function answerAfford(
  q: string,
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions,
  now = new Date()
): string {
  const amount = parseQueryAmount(q);
  const available = options.availableCash;
  const p = projectMonth(transactions, options.debts, now, options.spendConcepts);
  if (amount == null) {
    // "¿Cuánto puedo gastar?" → a daily budget for the rest of the month.
    if (p.income > 0 && includesAny(q, ['cuanto', 'how much'])) {
      const remainingDays = Math.max(1, p.totalDays - p.days + 1);
      const left = p.income - p.spent - p.pendingFixed;
      return left > 0
        ? t('search.answerDailyBudget', {
            perDay: format(left / remainingDays),
            days: remainingDays,
            left: format(left),
          })
        : t('search.answerDailyBudgetNone', { short: format(-left) });
    }
    return t('search.answerAffordNeedAmount');
  }

  if (p.income <= 0) {
    if (available == null) return t('search.answerAffordNeedAmount');
    return available >= amount
      ? t('search.answerAffordCash', {
          amount: format(amount),
          available: format(available),
          left: format(available - amount),
        })
      : t('search.answerAffordCashNo', {
          amount: format(amount),
          available: format(available),
          short: format(amount - available),
        });
  }

  const leftAfter = p.projectedLeft - amount;
  const parts = [
    leftAfter >= 0
      ? t('search.answerAffordYes', { amount: format(amount), left: format(leftAfter) })
      : t('search.answerAffordNo', { amount: format(amount), short: format(-leftAfter) }),
  ];
  if (available != null && amount > available) {
    parts.push(t('search.answerAffordCashWarn', { available: format(available) }));
  }
  if (p.early) parts.push(t('search.answerProjectionEarly'));
  return parts.join(' ');
}

/** Concepts climbing vs last month first; otherwise trim the biggest day-to-day spend. */
export function answerCut(
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions,
  labelFor: (id: string) => string,
  now = new Date()
): string {
  const tips = buildAntSpendTips(
    transactions,
    options.spendConcepts ?? [],
    now,
    options.currency ?? 'COP'
  ).slice(0, 3);
  if (tips.length > 0) {
    const detail = tips
      .map((tip) =>
        t('search.answerCutItem', {
          label: labelFor(tip.categoryId),
          amount: format(tip.current),
          save: format(tip.saveHint),
        })
      )
      .join(' · ');
    const total = tips.reduce((s, tip) => s + tip.saveHint, 0);
    return t('search.answerCut', { detail, total: format(total) });
  }

  const revolving = revolvingDebtIds(options.debts);
  const fixed = new Set(
    predictMonthlySpends(transactions, options.debts ?? [], now, options.spendConcepts).map(
      (p) => p.categoryId
    )
  );
  const byCategory = new Map<string, number>();
  for (const tx of filterByPeriod(transactions, 'mes', now)) {
    if (tx.type !== 'expense' || !tx.categoryId || fixed.has(tx.categoryId)) continue;
    if (!isMonthOutflow(tx, revolving)) continue;
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return t('search.answerCutEmpty');
  return t('search.answerCutTop', {
    label: labelFor(top[0]),
    amount: format(top[1]),
    save: format(top[1] * 0.1),
  });
}

/**
 * Month: fixed payments once + day-to-day spend at its current pace (see
 * projectMonth). Week: plain run-rate, since fixed bills are monthly.
 */
export function answerProjection(
  allTransactions: Transaction[],
  list: Transaction[],
  period: QueryPeriod,
  format: (n: number) => string,
  t: TFn,
  debts?: Debt[],
  spendConcepts?: SpendConcept[],
  now = new Date()
): string {
  let projected: number;
  let spent: number;
  let income: number;
  let days: number;
  let totalDays: number;
  let pending = 0;
  let oneOffs = 0;
  let early: boolean;
  if (period.analog === 'month') {
    const p = projectMonth(allTransactions, debts, now, spendConcepts);
    ({ spent, income, days, totalDays, early, oneOffs } = p);
    projected = p.projectedSpend;
    pending = p.pendingFixed;
  } else {
    spent = sumSpendOut(list, debts);
    income = sumByType(list, 'income');
    totalDays = 7;
    days = Math.min(totalDays, Math.max(1, Math.ceil((now.getTime() - period.from.getTime()) / DAY_MS)));
    projected = (spent / days) * totalDays;
    early = days < 3;
  }
  const unit = t(period.analog === 'week' ? 'search.unitWeek' : 'search.unitMonth');

  const parts = [
    t('search.answerProjection', {
      projected: format(projected),
      unit,
      spent: format(spent),
      days,
      total: totalDays,
    }),
  ];
  if (pending > 0) {
    parts.push(t('search.answerProjectionPending', { pending: format(pending) }));
  }
  if (oneOffs > 0) {
    parts.push(t('search.answerProjectionOneOff', { amount: format(oneOffs) }));
  }
  if (income > 0) {
    const left = income - projected;
    parts.push(
      left >= 0
        ? t('search.answerProjectionLeft', { income: format(income), left: format(left) })
        : t('search.answerProjectionShort', { income: format(income), short: format(-left) })
    );
  }
  if (early) parts.push(t('search.answerProjectionEarly'));
  return parts.join(' ');
}
