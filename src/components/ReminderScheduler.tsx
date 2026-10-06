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
import type { TranslationKey } from '@/src/i18n/translations';
import type { Debt } from '@/src/types/finance';
import {
  MAX_PLANNED_REMINDERS,
  planDebtReminders,
  planReminders,
} from '@/src/utils/reminderPlan';

/** Let a burst of edits (saving several movements) settle into one sync. */
const SYNC_DELAY_MS = 800;

/**
 * Owns the reminders: drops rules for deleted subcategories, then plans the next
 * dated reminders for every active debt (the day before it is due) and for the
 * chosen concepts, from the ledger (skipping what is already paid, saying the
 * usual amount), and applies only what changed. Runs again when
 * the app comes back to the foreground and whenever a movement is saved.
 */
function debtName(debt: Debt | undefined, t: (key: TranslationKey) => string): string {
  if (debt?.name?.trim()) return debt.name.trim();
  if (debt?.nameKey) return t(debt.nameKey as TranslationKey);
  return t('reminder.debtFallback');
}

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
    const money = (amount: number | null) =>
      amount != null && amountsVisible ? formatMoney(amount, settings.currency) : undefined;
    const raw = (amount: number | null) => (amount != null ? String(Math.round(amount)) : '');

    const expenseItems = planReminders(rules, transactions, debts, concepts).map((o) => ({
      id: o.id,
      date: o.date,
      ...reminderPushCopy(o.subId, concepts, t, language, money(o.amount)),
      data: { type: 'expense-reminder' as const, categoryId: o.subId, amount: raw(o.amount) },
    }));
    const muted = new Set(settings.debtRemindersOff ?? []);
    const debtItems = planDebtReminders(debts, transactions, concepts, muted).map((o) => {
      const name = debtName(debts.find((d) => d.id === o.debtId), t);
      const amount = money(o.amount);
      return {
        id: o.id,
        date: o.date,
        title: t('reminder.debtTitle'),
        body: amount
          ? t('reminder.debtBodyAmount', { name, amount })
          : t('reminder.debtBody', { name }),
        data: { type: 'debt-reminder' as const, debtId: o.debtId },
      };
    });
    // Debts first: when the platform limit bites, a due installment matters more.
    const items = [...debtItems, ...expenseItems].slice(0, MAX_PLANNED_REMINDERS);
    const timer = setTimeout(() => void syncPlannedReminders(items), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    ready,
    loading,
    settings.onboardingDone,
    settings.reminderRules,
    settings.debtRemindersOff,
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
