import type { TranslationKey } from '@/src/i18n/translations';
import type { Account, Debt, Period } from '@/src/types/finance';
import type { Currency, SpendConcept } from '@/src/types/settings';

export type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type AskOptions = {
  defaultPeriod?: Period;
  debtsTotal?: number;
  availableCash?: number;
  spendConcepts?: SpendConcept[];
  budgetStatus?: { categoryId: string; ratio: number; limit: number }[];
  debts?: Debt[];
  language?: 'en' | 'es';
  accounts?: Account[];
  currency?: Currency;
  /** Days marked "no spend" in 1.11.0: they still count for the streak. */
  noSpendDays?: string[];
  /** False on the free plan: Pro-only answers show what Pro adds instead. Missing = allowed. */
  isPro?: boolean;
};

/**
 * How sure an answer is. fact: sums of logged movements and balances.
 * inference: read from patterns in the data (a trend, a partial note match).
 * estimate: a projection with assumptions. hypothesis: needs the person to confirm.
 */
export type AskBasis = 'fact' | 'inference' | 'estimate' | 'hypothesis';
