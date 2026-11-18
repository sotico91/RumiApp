/**
 * When to show the store's own rating sheet (App Store / Google Play).
 * Only after a good moment: a week-long streak, enough movements logged, and
 * right after saving one. Never twice within REVIEW_GAP_DAYS, at most
 * REVIEW_MAX_ASKS times. The OS may still skip it (iOS shows it 3 times a year).
 */
export const REVIEW_MIN_STREAK = 7;
export const REVIEW_MIN_MOVEMENTS = 15;
export const REVIEW_GAP_DAYS = 120;
export const REVIEW_MAX_ASKS = 3;

export type ReviewAsk = { at: string; count: number };

export function shouldAskForReview(input: {
  streakDays: number;
  todayDone: boolean;
  movements: number;
  last?: ReviewAsk;
  now?: Date;
}): boolean {
  const { streakDays, todayDone, movements, last, now = new Date() } = input;
  if (!todayDone || streakDays < REVIEW_MIN_STREAK) return false;
  if (movements < REVIEW_MIN_MOVEMENTS) return false;
  if (!last) return true;
  if (last.count >= REVIEW_MAX_ASKS) return false;
  const at = Date.parse(last.at);
  if (!Number.isFinite(at)) return true;
  return now.getTime() - at >= REVIEW_GAP_DAYS * 24 * 60 * 60 * 1000;
}

export function nextReviewAsk(last: ReviewAsk | undefined, now = new Date()): ReviewAsk {
  return { at: now.toISOString(), count: (last?.count ?? 0) + 1 };
}
