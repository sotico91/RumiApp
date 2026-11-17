import { habitPilotVisible, localDateKey } from '@/src/utils/habitPilot';
import { planLogReminders } from '@/src/utils/logReminder';
import { computeStreak, streakFromLedger, streakMilestone, withNoSpendDay } from '@/src/utils/streak';

const NOW = new Date(2026, 10, 17, 10, 0); // Tue 17 Nov 2026, 10:00

function key(daysAgo: number): string {
  return localDateKey(new Date(2026, 10, 17 - daysAgo));
}

function days(...ago: number[]): Set<string> {
  return new Set(ago.map(key));
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

describe('computeStreak', () => {
  it('is zero with no history', () => {
    const s = computeStreak(new Set(), NOW);
    expect(s.current).toBe(0);
    expect(s.freezes).toBe(0);
    expect(s.todayDone).toBe(false);
    expect(s.week.map((d) => d.state)).toEqual([
      'missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending',
    ]);
  });

  it('counts consecutive days including today', () => {
    const s = computeStreak(days(0, 1, 2), NOW);
    expect(s.current).toBe(3);
    expect(s.todayDone).toBe(true);
  });

  it('keeps the streak alive while today is still pending', () => {
    const s = computeStreak(days(1, 2, 3), NOW);
    expect(s.current).toBe(3);
    expect(s.todayDone).toBe(false);
    expect(s.week[6].state).toBe('pending');
  });

  it('breaks on a missed day without freezes', () => {
    const s = computeStreak(days(0, 2, 3, 4), NOW);
    expect(s.current).toBe(1);
    expect(s.week.find((d) => d.key === key(1))?.state).toBe('missed');
  });

  it('earns a freeze every 7 days in a row and spends it on a missed day', () => {
    // 7 days in a row (ago 9..3), miss ago 2, then ago 1 and today.
    const s = computeStreak(days(...range(3, 9), 1, 0), NOW);
    expect(s.current).toBe(9);
    expect(s.freezes).toBe(0);
    expect(s.week.find((d) => d.key === key(2))?.state).toBe('frozen');
  });

  it('caps freezes at 2', () => {
    const s = computeStreak(days(...range(0, 29)), NOW);
    expect(s.current).toBe(30);
    expect(s.freezes).toBe(2);
  });

  it('two missed days with one freeze breaks the streak', () => {
    const s = computeStreak(days(...range(3, 9), 0), NOW);
    expect(s.current).toBe(1);
    expect(s.freezes).toBe(0);
  });

  it('builds from logged time and "no spend" days', () => {
    const tx = [{ createdAt: new Date(2026, 10, 16, 21, 5).toISOString() }];
    const s = streakFromLedger(tx, [key(0)], NOW);
    expect(s.current).toBe(2);
    expect(s.todayDone).toBe(true);
  });
});

describe('withNoSpendDay', () => {
  it('adds once and keeps order', () => {
    expect(withNoSpendDay(undefined, '2026-11-17')).toEqual(['2026-11-17']);
    expect(withNoSpendDay(['2026-11-17'], '2026-11-17')).toEqual(['2026-11-17']);
    expect(withNoSpendDay(['2026-11-17'], '2026-11-10')).toEqual(['2026-11-10', '2026-11-17']);
  });
});

describe('planLogReminders', () => {
  it('defaults to 8pm, today included while not logged', () => {
    const plan = planLogReminders({ reminder: undefined, todayDone: false, now: NOW, days: 3 });
    expect(plan.map((o) => o.id)).toEqual(['log-2026-11-17', 'log-2026-11-18', 'log-2026-11-19']);
    expect(plan[0].date.getHours()).toBe(20);
  });

  it('skips today once something is logged', () => {
    const plan = planLogReminders({ reminder: undefined, todayDone: true, now: NOW, days: 3 });
    expect(plan[0].id).toBe('log-2026-11-18');
    expect(plan).toHaveLength(2);
  });

  it('skips today after the hour has passed', () => {
    const late = new Date(2026, 10, 17, 21, 0);
    const plan = planLogReminders({ reminder: { enabled: true, hour: 20, minute: 0 }, todayDone: false, now: late, days: 2 });
    expect(plan.map((o) => o.id)).toEqual(['log-2026-11-18']);
  });

  it('plans nothing when off', () => {
    expect(planLogReminders({ reminder: { enabled: false, hour: 20, minute: 0 }, todayDone: false, now: NOW })).toEqual([]);
  });

  it('keeps the same copy variant for a day across syncs', () => {
    const a = planLogReminders({ reminder: undefined, todayDone: false, now: NOW, days: 2 });
    const b = planLogReminders({ reminder: undefined, todayDone: false, now: new Date(2026, 10, 17, 15), days: 2 });
    expect(a.map((o) => o.variant)).toEqual(b.map((o) => o.variant));
  });
});

describe('habitPilotVisible', () => {
  it('shows during the 14 days and after until dismissed', () => {
    expect(habitPilotVisible({}, NOW)).toBe(false);
    expect(habitPilotVisible({ habitPilotStartedAt: key(3) }, NOW)).toBe(true);
    expect(habitPilotVisible({ habitPilotStartedAt: key(20) }, NOW)).toBe(true);
    expect(habitPilotVisible({ habitPilotStartedAt: key(20), habitPilotDismissed: true }, NOW)).toBe(false);
  });
});

describe('streakMilestone', () => {
  it('celebrates 7, 15, 30 and later marks only', () => {
    expect([1, 6, 7, 8, 15, 30, 31, 100].map((n) => streakMilestone(n))).toEqual([
      null, null, 7, null, 15, 30, null, 100,
    ]);
  });
});
