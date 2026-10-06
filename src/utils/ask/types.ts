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
};
