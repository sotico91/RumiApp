import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';

import { flattenSpendSubs } from '@/src/data/spendConcepts';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { reminderPushCopy } from '@/src/utils/reminderCopy';

const REMINDER_COPY_REV_KEY = 'rumi:reminder-push-rev';
const REMINDER_COPY_REV = 'pay-concept-sub-v2';

/**
 * Drops reminder rules whose subcategory no longer exists in the user's concept tree.
 * Does not reschedule when nothing changed (avoids Android dumping many local alerts),
 * except a one-shot when notification copy is updated.
 */
export function ReminderHygiene() {
  const { t, language } = useLanguage();
  const { settings, ready, pruneRemindersToRegistered } = useSettings();
  const ranKey = useRef<string>('');

  useEffect(() => {
    if (!ready || !settings.onboardingDone) return;

    const spendConcepts = settings.spendConcepts ?? [];
    const allowed = new Set(flattenSpendSubs(spendConcepts).map((s) => s.id));
    const rules = settings.reminderRules ?? [];
    const key = [
      rules.map((r) => `${r.subId}@${r.hour}:${r.minute}:${r.dayOfMonth ?? 'd'}`).join(','),
      [...allowed].sort().join(','),
      t('reminder.pushBody'),
      language,
    ].join('|');
    if (ranKey.current === key) return;
    ranKey.current = key;

    const labels: Record<string, { title: string; body: string }> = {};
    for (const rule of rules) {
      if (!allowed.has(rule.subId)) continue;
      labels[rule.subId] = reminderPushCopy(rule.subId, spendConcepts, t, language);
    }

    void (async () => {
      const storedRev = await AsyncStorage.getItem(REMINDER_COPY_REV_KEY);
      const reschedule = storedRev !== REMINDER_COPY_REV;
      await pruneRemindersToRegistered(allowed, labels, { reschedule });
      if (reschedule) {
        await AsyncStorage.setItem(REMINDER_COPY_REV_KEY, REMINDER_COPY_REV);
      }
    })();
  }, [
    ready,
    settings.onboardingDone,
    settings.reminderRules,
    settings.spendConcepts,
    pruneRemindersToRegistered,
    t,
    language,
  ]);

  return null;
}
