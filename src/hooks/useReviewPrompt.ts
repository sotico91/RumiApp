import * as StoreReview from 'expo-store-review';
import { useEffect, useRef } from 'react';

import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { shouldAskForReview } from '@/src/utils/reviewPrompt';
import { streakFromLedger } from '@/src/utils/streak';

/** Lets the saved-movement toast show before the store sheet slides up. */
const ASK_DELAY_MS = 1800;

/**
 * Right after a movement is saved on a good streak, asks the store for its own
 * rating sheet (no custom "do you like Rumi?" gate: both stores forbid it).
 * Mounted once, on Home, where the add screen returns after saving.
 */
export function useReviewPrompt(): void {
  const { transactions, loading } = useFinance();
  const { settings, markReviewAsked } = useSettings();
  const prevCount = useRef<number | null>(null);
  // Saving often rewrites settings too (learned category, pay-from account):
  // read them through refs so that does not cancel the pending ask.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const markRef = useRef(markReviewAsked);
  markRef.current = markReviewAsked;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (loading) return;
    const prev = prevCount.current;
    prevCount.current = transactions.length;
    // First load, a deletion or a restored backup is not "just saved one".
    if (prev == null) return;
    const added = transactions.length - prev;
    if (added < 1 || added > 2) return;

    const current = settingsRef.current;
    const streak = streakFromLedger(transactions, current.noSpendDays);
    if (
      !shouldAskForReview({
        streakDays: streak.current,
        todayDone: streak.todayDone,
        movements: transactions.length,
        last: current.reviewAsk,
      })
    ) {
      return;
    }
    if (timer.current) return;
    timer.current = setTimeout(() => {
      void (async () => {
        try {
          if (!(await StoreReview.isAvailableAsync())) return;
          if (!(await StoreReview.hasAction())) return;
          await markRef.current();
          await StoreReview.requestReview();
        } catch {
          // The store sheet is best effort; never block logging over it.
        } finally {
          timer.current = null;
        }
      })();
    }, ASK_DELAY_MS);
  }, [transactions, loading]);
}
