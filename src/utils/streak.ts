import type { Transaction } from '@/src/types/finance';
import { localDateKey, parseLocalDateKey } from '@/src/utils/habitPilot';

/** A freeze is earned every this many logged days in a row. */
export const STREAK_FREEZE_EVERY = 7;
/** Most freezes saved up at once. */
export const STREAK_FREEZE_MAX = 2;
/** How far back the streak is rebuilt (a streak longer than this still shows this cap). */
const LOOKBACK_DAYS = 400;
/** Most "no spend" days kept in settings. */
export const NO_SPEND_DAYS_MAX = 120;

export type StreakDayState = 'done' | 'frozen' | 'missed' | 'pending';

export type StreakState = {
  /** Days counted in the current streak (frozen days keep it alive but do not add). */
  current: number;
  /** Freezes saved up, each covers one missed day automatically. */
  freezes: number;
  /** Logged something (or marked "no spend") today. */
  todayDone: boolean;
  /** The last 7 days, oldest first, ending today. */
  week: { key: string; state: StreakDayState }[];
};

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Local days with at least one saved movement (by when it was logged) or marked "no spend". */
export function activeDayKeys(
  transactions: Pick<Transaction, 'createdAt'>[],
  noSpendDays: string[] = []
): Set<string> {
  const set = new Set<string>(noSpendDays);
  for (const tx of transactions) {
    const at = Date.parse(tx.createdAt);
    if (Number.isFinite(at)) set.add(localDateKey(new Date(at)));
  }
  return set;
}

/**
 * Rebuilds the streak from history, oldest day first. A logged day adds one and
 * every 7th in a row earns a freeze (2 at most). A missed day spends a freeze
 * if there is one, otherwise the streak and the freezes go back to zero. Today
 * never breaks the streak: it is still pending until the day ends.
 */
export function computeStreak(active: Set<string>, now = new Date()): StreakState {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = localDateKey(today);
  const todayDone = active.has(todayKey);

  let earliest: Date | null = null;
  for (const key of active) {
    const d = parseLocalDateKey(key);
    if (Number.isNaN(d.getTime()) || d > today) continue;
    if (!earliest || d < earliest) earliest = d;
  }
  const floor = addDays(today, -LOOKBACK_DAYS);
  if (earliest && earliest < floor) earliest = floor;

  const states = new Map<string, StreakDayState>();
  let current = 0;
  let freezes = 0;
  let run = 0;
  if (earliest) {
    for (let d = earliest; d <= today; d = addDays(d, 1)) {
      const key = localDateKey(d);
      if (active.has(key)) {
        current += 1;
        run += 1;
        if (run % STREAK_FREEZE_EVERY === 0) freezes = Math.min(STREAK_FREEZE_MAX, freezes + 1);
        states.set(key, 'done');
      } else if (key === todayKey) {
        states.set(key, 'pending');
      } else if (freezes > 0) {
        freezes -= 1;
        // A frozen day keeps the streak but starts the count toward the next freeze over.
        run = 0;
        states.set(key, 'frozen');
      } else {
        current = 0;
        run = 0;
        states.set(key, 'missed');
      }
    }
  }

  const week: StreakState['week'] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const key = localDateKey(addDays(today, -i));
    week.push({ key, state: states.get(key) ?? (key === todayKey ? 'pending' : 'missed') });
  }
  return { current, freezes, todayDone, week };
}

/** Streak straight from the ledger and the days marked "no spend". */
export function streakFromLedger(
  transactions: Pick<Transaction, 'createdAt'>[],
  noSpendDays: string[] | undefined,
  now = new Date()
): StreakState {
  return computeStreak(activeDayKeys(transactions, noSpendDays ?? []), now);
}

/** Streak lengths worth celebrating with the share card. */
export const STREAK_MILESTONES = [7, 15, 30, 60, 100, 200, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export function streakMilestone(days: number): StreakMilestone | null {
  return (STREAK_MILESTONES as readonly number[]).includes(days) ? (days as StreakMilestone) : null;
}

/** Adds today to the "no spend" days, keeping the newest ones. */
export function withNoSpendDay(days: string[] | undefined, day: string): string[] {
  const list = days ?? [];
  if (list.includes(day)) return list;
  const next = [...list, day].sort();
  return next.length > NO_SPEND_DAYS_MAX ? next.slice(next.length - NO_SPEND_DAYS_MAX) : next;
}
