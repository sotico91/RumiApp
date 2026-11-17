import { findSpendSub } from '@/src/data/spendConcepts';
import type { TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import type { HabitCue, SpendConcept } from '@/src/types/settings';
import { startOfWeek } from '@/src/utils/financeMath';

export const HABIT_PILOT_DAYS = 14;
/** Success bar for the diary: log on at least this many distinct days. */
export const HABIT_PILOT_TARGET_DAYS = 8;

const DEFAULT_REMINDER_CONCEPT_ORDER = [
  'concept-alimentacion',
  'concept-transporte',
  'concept-recibos',
  'concept-vivienda',
] as const;

export function localDateKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffLocalDays(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function appendUniqueDay(days: string[], day: string, max = 60): string[] {
  if (days.includes(day)) return days;
  const next = [...days, day];
  return next.length > max ? next.slice(next.length - max) : next;
}

export function pickDefaultReminderConceptId(selectedIds: string[]): string | null {
  for (const id of DEFAULT_REMINDER_CONCEPT_ORDER) {
    if (selectedIds.includes(id)) return id;
  }
  return selectedIds[0] ?? null;
}

export function pickDefaultReminderSubId(concepts: SpendConcept[]): string | null {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  for (const id of DEFAULT_REMINDER_CONCEPT_ORDER) {
    const sub = byId.get(id)?.subs[0];
    if (sub) return sub.id;
  }
  return concepts.find((c) => c.subs[0])?.subs[0]?.id ?? null;
}

export type HabitPilotWindow = {
  startedAt: string;
  dayIndex: number;
  active: boolean;
  ended: boolean;
};

export function habitPilotWindow(
  startedAt: string | null | undefined,
  now = new Date()
): HabitPilotWindow | null {
  if (!startedAt) return null;
  const start = parseLocalDateKey(startedAt);
  if (Number.isNaN(start.getTime())) return null;
  const dayIndex = diffLocalDays(start, now) + 1;
  if (dayIndex < 1) {
    return { startedAt, dayIndex, active: false, ended: false };
  }
  return {
    startedAt,
    dayIndex,
    active: dayIndex <= HABIT_PILOT_DAYS,
    ended: dayIndex > HABIT_PILOT_DAYS,
  };
}

/** Whether Home shows the 14-day diary card (active, or ended and not dismissed yet). */
export function habitPilotVisible(
  settings: { habitPilotStartedAt?: string; habitPilotDismissed?: boolean },
  now = new Date()
): boolean {
  const window = habitPilotWindow(settings.habitPilotStartedAt, now);
  if (!window) return false;
  if (window.ended) return !settings.habitPilotDismissed;
  return window.active;
}

export function daysWithLogs(
  transactions: Transaction[],
  startedAt: string,
  through = new Date()
): string[] {
  const start = parseLocalDateKey(startedAt).getTime();
  const end = startOfLocalDay(through).getTime() + 86_400_000;
  const set = new Set<string>();
  for (const tx of transactions) {
    const at = Date.parse(tx.createdAt);
    if (!Number.isFinite(at) || at < start || at >= end) continue;
    set.add(localDateKey(new Date(at)));
  }
  return [...set].sort();
}

export function openDaysInWindow(openDays: string[], startedAt: string, through = new Date()): string[] {
  const start = startedAt;
  const end = localDateKey(through);
  return openDays.filter((d) => d >= start && d <= end);
}

export function loggedToday(transactions: Transaction[], now = new Date()): boolean {
  const key = localDateKey(now);
  return transactions.some((tx) => localDateKey(new Date(tx.createdAt)) === key);
}

export function weekExpenseCount(
  transactions: Transaction[],
  categoryId: string,
  now = new Date()
): number {
  const from = startOfWeek(now).getTime();
  return transactions.filter(
    (tx) =>
      tx.type === 'expense' &&
      tx.categoryId === categoryId &&
      Date.parse(tx.createdAt) >= from
  ).length;
}

export function isAntCategory(concepts: SpendConcept[], categoryId: string): boolean {
  return findSpendSub(concepts, categoryId)?.sub.isAnt === true;
}

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Copy after a save — weekly count + ant, not just “registered”. */
export function expenseRewardBody(opts: {
  t: Translate;
  label: string;
  amount: string;
  weekCount: number;
  isAnt: boolean;
}): string {
  if (opts.isAnt) {
    return opts.t('notify.bodyHabitAnt', {
      count: opts.weekCount,
      category: opts.label,
      amount: opts.amount,
    });
  }
  if (opts.weekCount >= 2) {
    return opts.t('notify.bodyHabit', {
      count: opts.weekCount,
      category: opts.label,
      amount: opts.amount,
    });
  }
  return opts.t('notify.body', {
    amount: opts.amount,
    category: opts.label,
  });
}

export function habitExpenseNotifyBody(opts: {
  t: Translate;
  transactions: Transaction[];
  categoryId: string;
  amount: string;
  label: string;
  concepts: SpendConcept[];
}): string {
  return expenseRewardBody({
    t: opts.t,
    label: opts.label,
    amount: opts.amount,
    weekCount: weekExpenseCount(opts.transactions, opts.categoryId) + 1,
    isAnt: isAntCategory(opts.concepts, opts.categoryId),
  });
}

export function habitSummaryLine(opts: {
  logged: number;
  opened: number;
  cue: HabitCue;
  ended: boolean;
}): string {
  const cue = opts.cue === 'evening' ? 'evening' : 'after-pay';
  const phase = opts.ended ? 'done' : 'in-progress';
  return `Rumi 14d · ${phase} · logged ${opts.logged}/${HABIT_PILOT_DAYS} · opened ${opts.opened}/${HABIT_PILOT_DAYS} · cue: ${cue}`;
}
