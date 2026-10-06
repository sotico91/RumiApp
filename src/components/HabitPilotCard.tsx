import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import {
  HABIT_PILOT_DAYS,
  HABIT_PILOT_TARGET_DAYS,
  daysWithLogs,
  habitPilotWindow,
  habitSummaryLine,
  loggedToday,
  openDaysInWindow,
  pickDefaultReminderSubId,
} from '@/src/utils/habitPilot';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { appAlert } from '@/src/components/AppAlert';

export function HabitPilotCard() {
  const { t } = useLanguage();
  const {
    settings,
    updateHabitCue,
    updateReminders,
    dismissHabitPilot,
    startHabitPilot,
  } = useSettings();
  const { transactions } = useFinance();
  const [busy, setBusy] = useState(false);

  const window = habitPilotWindow(settings.habitPilotStartedAt);
  const spendConcepts = settings.spendConcepts ?? [];
  const reminderCount = (settings.reminderRules ?? []).length;

  const stats = useMemo(() => {
    if (!window) return null;
    const logged = daysWithLogs(transactions, window.startedAt);
    const opened = openDaysInWindow(settings.habitOpenDays ?? [], window.startedAt);
    return { logged: logged.length, opened: opened.length };
  }, [window, transactions, settings.habitOpenDays]);

  if (!window || !stats) return null;
  if (window.ended && settings.habitPilotDismissed) return null;
  if (!window.active && !window.ended) return null;

  const cue = settings.habitCue === 'evening' ? 'evening' : 'afterPay';
  const loggedCount = stats.logged;
  const openedCount = stats.opened;
  const pilotEnded = window.ended;
  const loggedRatio = Math.min(1, loggedCount / HABIT_PILOT_DAYS);
  const passed = loggedCount >= HABIT_PILOT_TARGET_DAYS;

  async function enableReminder() {
    const subId = pickDefaultReminderSubId(spendConcepts);
    if (!subId) {
      router.push('/(tabs)/plan');
      return;
    }
    setBusy(true);
    try {
      await updateReminders({
        reminderRules: [
          { subId, hour: 20, minute: 0 },
        ],
        reminderHour: 20,
        reminderMinute: 0,
      });
      appAlert(t('reminder.savedTitle'), t('habit.reminderOn'), undefined, { tone: 'success' });
    } finally {
      setBusy(false);
    }
  }

  async function shareSummary() {
    tapFeedback();
    try {
      await Share.share({
        title: t('habit.title'),
        message: habitSummaryLine({
          logged: loggedCount,
          opened: openedCount,
          cue,
          ended: pilotEnded,
        }),
      });
    } catch {
      /* user cancelled */
    }
  }

  function confirmRestart() {
    appAlert(t('habit.restartTitle'), t('habit.restartBody'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('habit.restartConfirm'),
        onPress: () => {
          void startHabitPilot();
        },
      },
    ]);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t('habit.title')}</Text>
      {window.active ? (
        <Text style={styles.title}>
          {t('habit.dayOf', { day: window.dayIndex, total: HABIT_PILOT_DAYS })}
        </Text>
      ) : (
        <Text style={styles.title}>{t('habit.wrapTitle')}</Text>
      )}

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(loggedRatio * 100)}%` }]} />
      </View>
      <Text style={styles.meta}>
        {t('habit.logged', { logged: loggedCount, total: HABIT_PILOT_DAYS })}
      </Text>
      <Text style={styles.meta}>
        {t('habit.opened', { opened: openedCount })}
      </Text>

      {window.active ? (
        <>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapFeedback();
                void updateHabitCue('afterPay');
              }}
              style={[styles.chip, cue === 'afterPay' && styles.chipOn]}>
              <Text style={[styles.chipText, cue === 'afterPay' && styles.chipTextOn]}>
                {t('habit.cueAfterPay')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapFeedback();
                void updateHabitCue('evening');
              }}
              style={[styles.chip, cue === 'evening' && styles.chipOn]}>
              <Text style={[styles.chipText, cue === 'evening' && styles.chipTextOn]}>
                {t('habit.cueEvening')}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {loggedToday(transactions)
              ? t('habit.todayDone')
              : cue === 'evening'
                ? t('habit.cueHintEvening')
                : t('habit.cueHintAfterPay')}
          </Text>
          {reminderCount === 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapFeedback();
                void enableReminder();
              }}
              disabled={busy}
              style={[styles.cta, busy && { opacity: 0.7 }]}>
              <Text style={styles.ctaText}>{t('habit.enableReminder')}</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>{t('habit.reminderOn')}</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            {passed
              ? t('habit.wrapPass', { logged: loggedCount })
              : t('habit.wrapFail', { logged: loggedCount })}
          </Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapFeedback();
                void dismissHabitPilot();
              }}
              style={styles.secondary}>
              <Text style={styles.secondaryText}>{t('habit.gotIt')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmRestart}
              style={styles.cta}>
              <Text style={styles.ctaText}>{t('habit.restart')}</Text>
            </Pressable>
          </View>
        </>
      )}

      <Pressable accessibilityRole="button" onPress={() => void shareSummary()} style={styles.share}>
        <Text style={styles.shareText}>{t('habit.share')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
  },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF2',
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    backgroundColor: palette.teal,
    borderRadius: 999,
  },
  meta: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  chipTextOn: { color: palette.white },
  cta: {
    marginTop: 4,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    flex: 1,
  },
  ctaText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.white,
  },
  secondary: {
    marginTop: 4,
    backgroundColor: '#EEF3F6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    flex: 1,
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.inkMuted,
  },
  share: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  shareText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.tealText,
  },
});
