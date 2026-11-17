import type { LogReminder } from '@/src/types/settings';
import { localDateKey } from '@/src/utils/habitPilot';

/** Daily "log your day" reminder, on by default at 8pm. */
export const DEFAULT_LOG_REMINDER: LogReminder = { enabled: true, hour: 20, minute: 0 };
/** Hours offered in the picker. */
export const LOG_REMINDER_HOURS = [7, 9, 12, 13, 18, 19, 20, 21, 22] as const;
/** Days ahead planned on each sync; refreshed whenever the app opens or a movement is saved. */
export const LOG_REMINDER_DAYS_AHEAD = 7;
/** Copy variants per language (`logReminder.title0`…, `logReminder.body0`…). */
export const LOG_REMINDER_VARIANTS = 4;

export function logReminderOf(value: LogReminder | undefined): LogReminder {
  if (!value) return DEFAULT_LOG_REMINDER;
  const hour = Number.isInteger(value.hour) && value.hour >= 0 && value.hour <= 23 ? value.hour : 20;
  const minute =
    Number.isInteger(value.minute) && value.minute >= 0 && value.minute <= 59 ? value.minute : 0;
  return { enabled: value.enabled !== false, hour, minute };
}

export type LogReminderOccurrence = {
  /** `log-YYYY-MM-DD`; stable so a sync on every app open does not re-alert. */
  id: string;
  date: Date;
  /** Which copy variant to use, fixed per day so the text does not change between syncs. */
  variant: number;
};

function dayIndex(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * The next reminders to log, one per day at the chosen time. Today is skipped when
 * something is already logged (or marked "no spend") or the time has passed.
 */
export function planLogReminders(opts: {
  reminder: LogReminder | undefined;
  todayDone: boolean;
  now?: Date;
  days?: number;
}): LogReminderOccurrence[] {
  const reminder = logReminderOf(opts.reminder);
  if (!reminder.enabled) return [];
  const now = opts.now ?? new Date();
  const days = opts.days ?? LOG_REMINDER_DAYS_AHEAD;
  const out: LogReminderOccurrence[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, reminder.hour, reminder.minute);
    if (i === 0 && (opts.todayDone || date.getTime() <= now.getTime())) continue;
    out.push({ id: `log-${localDateKey(date)}`, date, variant: dayIndex(date) % LOG_REMINDER_VARIANTS });
  }
  return out;
}
