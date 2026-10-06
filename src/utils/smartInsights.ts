import type { TranslationKey } from '@/src/i18n/translations';
import type { Debt, Period, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { resolveCategoryDisplayName, topCategoryByIncomePercent } from '@/src/utils/ask/ledger';
import type { TFn } from '@/src/utils/ask/types';
import { categoryLabel as resolveCategoryLabel } from '@/src/utils/categoryLabel';
import { projectMonth } from '@/src/utils/projection';
import {
  antExpenseBreakdown,
  comparableRange,
  filterBetween,
  filterByPeriod,
  periodEnd,
  periodStart,
  previousMonthRange,
  sumByType,
  sumSpendOut,
} from '@/src/utils/financeMath';

// The question engine lives in ./ask; re-exported so screens keep one import.
export {
  answerFinanceQuery,
  askRumi,
  buildSearchSuggestions,
  parseQueryAmount,
  type AskResult,
  type SearchSuggestion,
} from '@/src/utils/ask';

export type InsightCard = {
  id: string;
  tone: 'warn' | 'good' | 'info';
  text: string;
};

function sumExpenseCategory(list: Transaction[], categoryId: string): number {
  return list
    .filter((x) => x.type === 'expense' && x.categoryId === categoryId)
    .reduce((s, x) => s + x.amount, 0);
}

/** Ignore small wiggles: a concept must grow 20%+ and be at least 5% of current spend. */
const RISE_MIN_RATIO = 1.2;

const RISE_MIN_SHARE = 0.05;

/** Only categories with real spend in both periods (or growth from a prior base). */
function topRisingExpenseCategory(
  thisMonth: Transaction[],
  lastMonth: Transaction[],
  totalSpend: number
): { categoryId: string; delta: number } | null {
  const ids = new Set<string>();
  for (const t of [...thisMonth, ...lastMonth]) {
    if (t.type === 'expense' && t.categoryId) ids.add(t.categoryId);
  }

  let best: { categoryId: string; delta: number } | null = null;
  for (const categoryId of ids) {
    const now = sumExpenseCategory(thisMonth, categoryId);
    const prev = sumExpenseCategory(lastMonth, categoryId);
    // Require prior spend so we never "predict" a category the user never used.
    if (prev <= 0 || now < prev * RISE_MIN_RATIO) continue;
    const delta = now - prev;
    if (delta < totalSpend * RISE_MIN_SHARE) continue;
    if (!best || delta > best.delta) {
      best = { categoryId, delta };
    }
  }
  return best;
}

export function buildSmartInsights(
  transactions: Transaction[],
  t: TFn,
  format: (n: number) => string,
  spendConcepts: SpendConcept[] = [],
  period: Period = 'mes',
  debts?: Debt[]
): InsightCard[] {
  const periodLabel = t(`period.${period}` as TranslationKey);
  const compareLabel =
    period === 'hoy'
      ? t('smart.compareYesterday')
      : period === 'semana'
        ? t('smart.compareLastWeek')
        : t('smart.compareLastMonth');

  const current = filterByPeriod(transactions, period);
  const now = new Date();
  const { from, to } = comparableRange(
    { from: periodStart(period, now), to: periodEnd(period, now) },
    period === 'mes' ? previousMonthRange(now) : previousAnalogRange(period, now),
    now
  );
  const previous = filterBetween(transactions, from, to);

  const spendNow = sumSpendOut(current, debts);
  const spendPrev = sumSpendOut(previous, debts);
  const incomeNow = sumByType(current, 'income');
  const ant = antExpenseBreakdown(current, spendConcepts);
  const cards: InsightCard[] = [];
  const saved = incomeNow - spendNow;
  const hasMovements = current.length > 0;

  cards.push({
    id: 'snapshot',
    tone: !hasMovements ? 'info' : saved >= 0 ? 'good' : 'warn',
    text: hasMovements
      ? t('smart.snapshot', {
          period: periodLabel,
          expenses: format(spendNow),
          income: format(incomeNow),
          result: format(saved),
        })
      : t('smart.snapshotEmpty', { period: periodLabel }),
  });

  if (spendPrev > 0) {
    const delta = ((spendNow - spendPrev) / spendPrev) * 100;
    if (Math.abs(delta) >= 5) {
      cards.push({
        id: 'spend-delta',
        tone: delta > 0 ? 'warn' : 'good',
        text:
          delta > 0
            ? t('smart.spentMore', {
                percent: Math.round(delta),
                compare: compareLabel,
              })
            : t('smart.spentLess', {
                percent: Math.round(Math.abs(delta)),
                compare: compareLabel,
              }),
      });
    }
  } else if (spendNow > 0) {
    cards.push({
      id: 'no-compare',
      tone: 'info',
      text: t('smart.noCompare', { compare: compareLabel }),
    });
  }

  const rising = topRisingExpenseCategory(current, previous, spendNow);
  if (rising) {
    cards.push({
      id: `rise-${rising.categoryId}`,
      tone: 'warn',
      text: t('smart.categoryUp', {
        category: resolveCategoryLabel(rising.categoryId, t, spendConcepts),
        compare: compareLabel,
      }),
    });
  }

  if (incomeNow > 0 && spendNow > 0) {
    const topPct = topCategoryByIncomePercent(current, incomeNow, spendConcepts);
    if (topPct && topPct.percent >= 15) {
      cards.push({
        id: 'top-income-share',
        tone: topPct.percent >= 30 ? 'warn' : 'info',
        text: t('smart.topIncomeShare', {
          category: resolveCategoryDisplayName(topPct.categoryId, spendConcepts, (id) =>
            resolveCategoryLabel(id, t, spendConcepts)
          ),
          percent: Math.round(topPct.percent),
          period: periodLabel,
        }),
      });
    }
    const spendShare = Math.round((spendNow / incomeNow) * 100);
    cards.push({
      id: 'spend-income-share',
      tone: spendShare >= 90 ? 'warn' : spendShare >= 70 ? 'info' : 'good',
      text: t('smart.spendIncomeShare', {
        percent: spendShare,
        period: periodLabel,
      }),
    });
  }

  // Forward-looking: where this month is heading, once the pace means something.
  if (period === 'mes') {
    const pace = projectMonth(transactions, debts, now, spendConcepts);
    if (!pace.early && pace.income > 0) {
      const percent = Math.round((pace.projectedLeft / pace.income) * 100);
      cards.push({
        id: 'savings-pace',
        tone: percent >= 20 ? 'good' : percent >= 0 ? 'info' : 'warn',
        text:
          pace.projectedLeft >= 0
            ? t('smart.savingsPace', { percent, amount: format(pace.projectedLeft) })
            : t('smart.savingsPaceShort', { amount: format(-pace.projectedLeft) }),
      });
    }
  }

  if (ant.total > 0) {
    cards.push({
      id: 'ant',
      tone: 'info',
      text: t('smart.antTotal', {
        amount: format(ant.total),
        period: periodLabel,
      }),
    });
  }

  return cards.slice(0, 6);
}

/** Prior day / prior week window ending at the start of the current period. */
function previousAnalogRange(period: 'hoy' | 'semana', now = new Date()) {
  if (period === 'hoy') {
    const to = new Date(now);
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    from.setDate(from.getDate() - 1);
    return { from, to };
  }
  const to = new Date(now);
  to.setHours(0, 0, 0, 0);
  const day = to.getDay();
  const diff = day === 0 ? 6 : day - 1;
  to.setDate(to.getDate() - diff);
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return { from, to };
}
