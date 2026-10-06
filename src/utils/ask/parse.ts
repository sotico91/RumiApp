import type { Period } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import {
  detectCategoryList,
  isIncomeUsedAsReference,
  skipIncomeCategoryMatch,
  type CategoryHit,
} from './categories';
import { LEXICON } from './lexicon';
import { isInProgress, resolvePeriod, type QueryPeriod } from './period';
import {
  detectPaymentMethod,
  extractNoteNeedle,
  isCardPaymentQuery,
  isCardTopicQuery,
  isCompareQuery,
  type PaymentMethod,
} from './signals';
import { hasStem, includesAny, normalize } from './text';
import type { TFn } from './types';

/** What the question asks for. Several can be on at once; handlers decide who answers. */
export type QueryWants = {
  count: boolean;
  income: boolean;
  savings: boolean;
  projection: boolean;
  cut: boolean;
  afford: boolean;
  ant: boolean;
  spendVerb: boolean;
  payVerb: boolean;
  cardPay: boolean;
  debt: boolean;
  debtPayments: boolean;
  available: boolean;
  leftNow: boolean;
  compare: boolean;
  origin: boolean;
  transfer: boolean;
  top: boolean;
  average: boolean;
  budget: boolean;
  percent: boolean;
  totals: boolean;
};

export type ParsedQuery = {
  /** Normalized text: lower case, no accents. */
  q: string;
  language: 'en' | 'es';
  period: QueryPeriod;
  /** The period has started and not ended yet. */
  inProgress: boolean;
  wants: QueryWants;
  cats: CategoryHit | null;
  method: PaymentMethod | null;
  /** Quoted text or "para Ana": a word to look for in notes. */
  noteNeedle: string | null;
};

/** Turns a question into a structured request. Pure: no amounts, no answers. */
export function parseQuery(
  query: string,
  options: {
    language: 'en' | 'es';
    defaultPeriod: Period;
    spendConcepts: SpendConcept[];
    t: TFn;
    now?: Date;
  }
): ParsedQuery {
  const q = normalize(query);
  const now = options.now ?? new Date();
  const L = LEXICON;
  const period = resolvePeriod(q, options.defaultPeriod, options.language, options.t, now);

  const spendVerb = includesAny(q, L.spendVerb);
  const payVerb = includesAny(q, L.payVerb);
  const cardPay = isCardPaymentQuery(q) || (isCardTopicQuery(q) && payVerb && !spendVerb);
  const income =
    includesAny(q, L.earnedIncome) ||
    (includesAny(q, L.incomeWord) && !skipIncomeCategoryMatch(q) && !isIncomeUsedAsReference(q));

  const wants: QueryWants = {
    count: includesAny(q, L.count),
    income,
    savings: L.savingsStems.some((stem) => hasStem(q, stem)) || includesAny(q, L.savings),
    projection: includesAny(q, L.projection),
    cut: includesAny(q, L.cut),
    afford: includesAny(q, L.afford),
    ant: includesAny(q, L.ant),
    spendVerb,
    payVerb,
    cardPay,
    debt: includesAny(q, L.debt),
    debtPayments: cardPay || includesAny(q, L.debtPayment),
    available: includesAny(q, L.available),
    leftNow: includesAny(q, L.leftNow) && !includesAny(q, L.monthEnd),
    compare: isCompareQuery(q),
    origin: includesAny(q, L.origin),
    transfer: includesAny(q, L.transfer),
    top: includesAny(q, L.top),
    average: includesAny(q, L.average),
    budget: includesAny(q, L.budget),
    percent: includesAny(q, L.percent),
    totals: includesAny(q, L.totals),
  };

  return {
    q,
    language: options.language,
    period,
    inProgress: isInProgress(period, now),
    wants,
    cats: detectCategoryList(q, options.spendConcepts),
    method: detectPaymentMethod(q),
    noteNeedle: extractNoteNeedle(q),
  };
}
