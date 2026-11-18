import { nextReviewAsk, shouldAskForReview } from '@/src/utils/reviewPrompt';

const now = new Date('2026-11-18T12:00:00');
const good = { streakDays: 7, todayDone: true, movements: 15, now };

describe('store review prompt', () => {
  it('asks on a week-long streak with enough movements, the first time', () => {
    expect(shouldAskForReview(good)).toBe(true);
  });

  it('waits for the streak, today and enough movements', () => {
    expect(shouldAskForReview({ ...good, streakDays: 6 })).toBe(false);
    expect(shouldAskForReview({ ...good, todayDone: false })).toBe(false);
    expect(shouldAskForReview({ ...good, movements: 14 })).toBe(false);
  });

  it('leaves 120 days between asks and stops after 3', () => {
    const recent = { at: '2026-10-01T12:00:00', count: 1 };
    expect(shouldAskForReview({ ...good, last: recent })).toBe(false);
    const old = { at: '2026-07-01T12:00:00', count: 1 };
    expect(shouldAskForReview({ ...good, last: old })).toBe(true);
    expect(shouldAskForReview({ ...good, last: { ...old, count: 3 } })).toBe(false);
  });

  it('counts each ask', () => {
    expect(nextReviewAsk(undefined, now)).toEqual({ at: now.toISOString(), count: 1 });
    expect(nextReviewAsk({ at: 'x', count: 2 }, now).count).toBe(3);
  });
});
