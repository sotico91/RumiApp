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
  /** Cash advances / money drawn from a card or cupo into a pocket. */
  creditDraw: string[];
  top: string[];
  average: string[];
  budget: string[];
  percent: string[];
  /** "¿cuánto me queda?" — cash on hand now… */
  leftNow: string[];
  /** …unless the question is about the month's end. */
  monthEnd: string[];
  /** "¿cuándo…?", "¿qué día…?": the date of a movement, not its amount. */
  when: string[];
  /** "¿ya pagué netflix?": did it happen at all. */
  confirm: string[];
  /** "¿en qué gasté ayer?": the movements themselves. */
  list: string[];
  /** One movement: the largest… */
  biggest: string[];
  /** …or the most recent. */
  latest: string[];
  /** "¿cuántos días llevo?", "mi racha": the logging streak. */
  streak: string[];
  /** "¿de qué cuenta puedo pagar 100 mil?": which pockets cover an amount now. */
  payFrom: string[];
  /** Generic "how much / total" that still asks for spend. */
  totals: string[];
};
