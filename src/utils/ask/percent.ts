import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { antExpenseBreakdown, sumByType } from '@/src/utils/financeMath';
import {
  INCOME_CATEGORY_IDS,
  isCreditsCategoryHit,
  matchTransactionsToCategories,
  skipIncomeCategoryMatch,
  type CategoryHit,
} from './categories';
import {
  rankCategoriesByIncomePercent,
  resolveCategoryDisplayName,
  topCategoryByIncomePercent,
} from './ledger';
import { hasStem, includesAny } from './text';
import type { TFn } from './types';

export type PercentQueryFlags = {
  wantsPercent: boolean;
  wantsTop: boolean;
  wantsSavings: boolean;
  wantsAnt: boolean;
  wantsIncome: boolean;
  cats: CategoryHit | null;
};

/** Salary/income-based percentage answers — adaptive intent matching. */
export function tryAnswerPercentQuery(
  q: string,
  list: Transaction[],
  periodLabel: string,
  format: (n: number) => string,
  t: TFn,
  spendConcepts: SpendConcept[],
  categoryLabel: (id: string) => string,
  flags: PercentQueryFlags
): string | null {
  const asksIncomeBasis = includesAny(q, [
    'salario',
    'sueldo',
    'ingreso',
    'ingresos',
    'nomina',
    'nómina',
    'income',
    'payroll',
    'mi sueldo',
  ]);
  const asksPercent =
    flags.wantsPercent ||
    includesAny(q, [
      'porcentaje',
      'por ciento',
      'percent',
      'proporcion',
      'proporción',
      'cuota del',
      'parte del',
      'share of',
    ]) ||
    (flags.wantsTop && asksIncomeBasis) ||
    (hasStem(q, 'consum') && asksIncomeBasis);

  if (!asksPercent || !asksIncomeBasis) return null;

  const income = sumByType(list, 'income');
  if (income <= 0) return t('search.answerNoIncome', { period: periodLabel });

  const spendTotal = sumByType(list, 'expense');

  let cats = flags.cats;
  if (
    cats &&
    skipIncomeCategoryMatch(q) &&
    cats.ids.some((id) => INCOME_CATEGORY_IDS.includes(id))
  ) {
    cats = null;
  }

  const wantsRanking = includesAny(q, [
    'ranking',
    'lista',
    'listado',
    'cuales',
    'cuáles',
    'categorias',
    'categorías',
    'categories',
  ]);
  const wantsHighestShare =
    !wantsRanking &&
    (flags.wantsTop ||
      hasStem(q, 'consum') ||
      includesAny(q, [
        'mayor porcentaje',
        'mas porcentaje',
        'más porcentaje',
        'mas alto',
        'más alto',
        'mayor gasto',
        'highest percent',
        'biggest share',
        'largest share',
        'categoria mas alta',
        'categoría más alta',
        'que categoria',
        'qué categoría',
        'which category',
        'uses the most',
      ]));

  if (wantsRanking) {
    const ranked = rankCategoriesByIncomePercent(
      list,
      income,
      spendConcepts,
      categoryLabel,
      4
    );
    if (ranked.length === 0) return t('search.answerEmptyPeriod', { period: periodLabel });
    return t('search.answerRankingPercentIncome', {
      period: periodLabel,
      income: format(income),
      detail: ranked
        .map((r) => `${r.label} ${Math.round(r.percent)}% (${format(r.amount)})`)
        .join(' · '),
    });
  }

  if (wantsHighestShare) {
    const top = topCategoryByIncomePercent(list, income, spendConcepts);
    if (!top) return t('search.answerEmptyPeriod', { period: periodLabel });
    return t('search.answerTopPercentIncome', {
      label: resolveCategoryDisplayName(top.categoryId, spendConcepts, categoryLabel),
      percent: Math.round(top.percent),
      amount: format(top.amount),
      period: periodLabel,
      income: format(income),
      count: top.count,
    });
  }

  if (flags.wantsSavings || hasStem(q, 'ahorr') || includesAny(q, ['sobro', 'sobró', 'savings', 'me queda', 'saved', 'save'])) {
    const saved = income - spendTotal;
    return t('search.answerSavingsPercentIncome', {
      percent: Math.round((saved / income) * 100),
      amount: format(saved),
      income: format(income),
      period: periodLabel,
    });
  }

  if (flags.wantsAnt) {
    const ant = antExpenseBreakdown(list, spendConcepts);
    if (ant.total <= 0) return t('search.answerAntEmpty', { period: periodLabel });
    return t('search.answerAntPercentIncome', {
      percent: Math.round((ant.total / income) * 100),
      amount: format(ant.total),
      income: format(income),
      period: periodLabel,
    });
  }

  if (cats) {
    const creditsAsk = isCreditsCategoryHit(cats, spendConcepts);
    const matched = matchTransactionsToCategories(
      list,
      cats,
      spendConcepts,
      creditsAsk ? 'obligation' : 'expense'
    );
    const amount = matched.reduce((s, x) => s + x.amount, 0);
    const label =
      cats.label === 'food-group'
        ? t('search.labelFood')
        : cats.displayName && !cats.displayName.startsWith('concept-')
          ? cats.displayName
          : cats.ids.map(categoryLabel).join(' + ');
    if (matched.length === 0) {
      return t('search.answerCategoryEmpty', { label, period: periodLabel });
    }
    return t('search.answerCategoryPercentIncome', {
      label,
      percent: Math.round((amount / income) * 100),
      amount: format(amount),
      income: format(income),
      period: periodLabel,
    });
  }

  if (
    includesAny(q, [
      'total',
      'gastos',
      'gasto total',
      'gasto',
      'spend',
      'spent',
      'expenses',
      'gaste',
      'gasté',
    ]) &&
    !flags.wantsIncome
  ) {
    return t('search.answerSpendPercentIncome', {
      percent: Math.round((spendTotal / income) * 100),
      amount: format(spendTotal),
      income: format(income),
      period: periodLabel,
    });
  }

  return null;
}
