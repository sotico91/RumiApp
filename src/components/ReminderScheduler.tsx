import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { flattenSpendSubs } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useAmountPrivacy } from '@/src/hooks/useAmountPrivacy';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { formatMoney } from '@/src/utils/money';
import { syncPlannedReminders } from '@/src/utils/notifications';
import { reminderPushCopy } from '@/src/utils/reminderCopy';
import { planReminders } from '@/src/utils/reminderPlan';

/** Let a burst of edits (saving several movements) settle into one sync. */
const SYNC_DELAY_MS = 800;

/**
 * Owns the expense reminders: drops rules for deleted subcategories, then plans
 * the next dated reminders from the rules and the ledger (skipping bills already
 * paid, saying the usual amount) and applies only what changed. Runs again when
 * the app comes back to the foreground and whenever a movement is saved.
 */
export function ReminderScheduler() {
  const { t, language } = useLanguage();
  // Hidden amounts stay hidden on the lock screen too: the reminder then omits the amount.
  const { amountsVisible } = useAmountPrivacy();
  const { settings, ready, pruneRemindersToRegistered } = useSettings();
  const { transactions, debts, loading } = useFinance();
  const [foregrounds, setForegrounds] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegrounds((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  const spendConcepts = settings.spendConcepts;
  const allowed = useMemo(
    () => new Set(flattenSpendSubs(spendConcepts ?? []).map((s) => s.id)),
    [spendConcepts]
  );

  useEffect(() => {
    if (!ready || !settings.onboardingDone) return;
    void pruneRemindersToRegistered(allowed);
  }, [ready, settings.onboardingDone, allowed, pruneRemindersToRegistered]);

  useEffect(() => {
    if (!ready || loading || !settings.onboardingDone) return;
    const concepts = spendConcepts ?? [];
    const rules = (settings.reminderRules ?? []).filter((r) => allowed.has(r.subId));
    const items = planReminders(rules, transactions, debts, concepts).map((o) => ({
      id: o.id,
      categoryId: o.subId,
      date: o.date,
      amount: o.amount,
      ...reminderPushCopy(
        o.subId,
        concepts,
        t,
        language,
        o.amount != null && amountsVisible ? formatMoney(o.amount, settings.currency) : undefined
      ),
    }));
    const timer = setTimeout(() => void syncPlannedReminders(items), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    ready,
    loading,
    settings.onboardingDone,
    settings.reminderRules,
    spendConcepts,
    allowed,
    transactions,
    debts,
    t,
    language,
    amountsVisible,
    settings.currency,
    foregrounds,
  ]);

  return null;
}
