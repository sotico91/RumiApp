/** Words and phrases that reveal what a question is after, one list per intent. */
export type IntentLexicon = {
  count: string[];
  earnedIncome: string[];
  incomeWord: string[];
  savings: string[];
  /** Word stems ("ahorr" → ahorré, ahorrar…). */
  savingsStems: string[];
  projection: string[];
  cut: string[];
  afford: string[];
  ant: string[];
  spendVerb: string[];
  payVerb: string[];
  debt: string[];
  debtPayment: string[];
  available: string[];
  compare: string[];
  origin: string[];
  transfer: string[];
  top: string[];
  average: string[];
  budget: string[];
  percent: string[];
  /** "¿cuánto me queda?" — cash on hand now… */
  leftNow: string[];
  /** …unless the question is about the month's end. */
  monthEnd: string[];
  /** Generic "how much / total" that still asks for spend. */
  totals: string[];
};
