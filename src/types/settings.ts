export type Currency = 'COP' | 'USD';

export type SpendSub = {
  id: string;
  name: string;
  /** Small/recurring “ant” spend the user wants to watch (café, fútbol…). */
  isAnt?: boolean;
  /** Own color; falls back to the concept color. */
  color?: string;
};

/** User-defined spend concept with optional subcategories. */
export type SpendConcept = {
  id: string;
  name: string;
  /** Accent color for this concept (charts) and default for its subs. */
  color: string;
  /** MaterialCommunityIcons name from CONCEPT_ICONS. */
  icon?: string;
  subs: SpendSub[];
};

/** Local notification rule for one subcategory. */
export type ReminderRule = {
  /** Spend subcategory id to remind about. */
  subId: string;
  hour: number;
  minute: number;
  /**
   * If set (1–28), fires every month on that day.
   * If omitted, fires every day at hour:minute.
   */
  dayOfMonth?: number;
};

/** @deprecated Flat custom concepts — migrated into spendConcepts. */
export type CustomConcept = {
  id: string;
  name: string;
};

export type UserSettings = {
  onboardingDone: boolean;
  /** First-launch coach marks over the main controls. */
  coachMarksDone: boolean;
  /** Require Face ID / fingerprint / device PIN to open the app. */
  appLockEnabled: boolean;
  /** Stable id for this install / person. Used to attribute expenses. */
  personId: string;
  userName: string;
  currency: Currency;
  /**
   * Legacy toggle list (built-in ids). Kept for reminders/onboarding compat;
   * expense logging uses spendConcepts.
   */
  enabledCategoryIds: string[];
  /** Primary user-owned concept → subcategory tree. */
  spendConcepts: SpendConcept[];
  /** @deprecated Migrated into spendConcepts. */
  customConcepts?: CustomConcept[];
  /** Bumped when settings schema / catalog changes. */
  catalogVersion?: number;
  notifyOnExpense: boolean;
  /** Per-subcategory local reminder schedules. */
  reminderRules: ReminderRule[];
  /** Debts the user muted; every other active debt is reminded the day before it is due. */
  debtRemindersOff?: string[];
  /** @deprecated Prefer reminderRules.subId list. */
  reminderCategoryIds: string[];
  /** @deprecated */
  reminderCustomConcepts: string[];
  /** Default hour when creating a new rule. */
  reminderHour: number;
  /** Default minute when creating a new rule. */
  reminderMinute: number;
  /** 14-day logging diary start (YYYY-MM-DD). */
  habitPilotStartedAt?: string;
  /** Local days the app was opened during the diary. */
  habitOpenDays?: string[];
  habitPilotDismissed?: boolean;
  /** When to cue a log: right after paying, or one minute in the evening. */
  habitCue?: HabitCue;
  /**
   * Monday date key (YYYY-MM-DD) for the week the user dismissed the ant-spend tip.
   * Cleared automatically next week.
   */
  antTipDismissedWeekKey?: string;
  /** Last random title variant index used for the weekly ant tip. */
  antTipLastTitleVariant?: number;
  /** Last random body variant index used for the weekly ant tip. */
  antTipLastBodyVariant?: number;
};

export type HabitCue = 'afterPay' | 'evening';

export type QuickTemplate = {
  id: string;
  categoryId: string;
  amount: number;
  note?: string;
  updatedAt: string;
};
