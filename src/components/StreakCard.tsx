import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appAlert } from '@/src/components/AppAlert';
import { LogReminderSheet, logReminderTime } from '@/src/components/LogReminderSheet';
import { useCalendarClock } from '@/src/hooks/useCalendarClock';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import { parseLocalDateKey } from '@/src/utils/habitPilot';
import { logReminderOf } from '@/src/utils/logReminder';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { streakFromLedger, type StreakDayState } from '@/src/utils/streak';

const STATE_LABEL: Record<StreakDayState, TranslationKey> = {
  done: 'streak.stateDone',
  frozen: 'streak.stateFrozen',
  missed: 'streak.stateMissed',
  pending: 'streak.statePending',
};

function weekdayInitial(key: string, language: string, style: 'narrow' | 'long'): string {
  const name = parseLocalDateKey(key).toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
    weekday: style,
  });
  return style === 'narrow' ? name.toUpperCase() : name;
}

/**
 * Days in a row with something logged (or marked "I spent nothing today"), the
 * last 7 days, the freezes saved up and the daily reminder to log.
 */
export function StreakCard({ compact = false }: { compact?: boolean }) {
  const { t, language } = useLanguage();
  const { settings, markNoSpendToday } = useSettings();
  const { transactions } = useFinance();
  // Re-renders at midnight so "today" moves on while the app stays open.
  const { day: today } = useCalendarClock();
  const [sheetOpen, setSheetOpen] = useState(false);

  const streak = useMemo(
    () => streakFromLedger(transactions, settings.noSpendDays),
    [transactions, settings.noSpendDays, today]
  );
  const reminder = logReminderOf(settings.logReminder);

  async function noSpend() {
    tapFeedback();
    await markNoSpendToday();
    appAlert(t('streak.noSpendTitle'), t('streak.noSpendBody'), undefined, { tone: 'success' });
  }

  return (
    <View style={[styles.card, compact && styles.compact]} testID="streak-card">
      {compact ? null : <Text style={styles.kicker}>{t('streak.kicker')}</Text>}
      <View style={styles.headRow}>
        <Text style={styles.title} testID="streak-title">
          {streak.current > 0 ? t('streak.days', { count: streak.current }) : t('streak.zero')}
        </Text>
        {streak.freezes > 0 ? (
          <View style={styles.freezePill}>
            <Text style={styles.freezeText}>{t('streak.freezes', { count: streak.freezes })}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.week}>
        {streak.week.map((day) => (
          <View
            key={day.key}
            style={styles.dayCol}
            accessible
            accessibilityLabel={t('streak.weekLabel', {
              day: weekdayInitial(day.key, language, 'long'),
              state: t(STATE_LABEL[day.state]),
            })}>
            <View
              style={[
                styles.dot,
                day.state === 'done' && styles.dotDone,
                day.state === 'frozen' && styles.dotFrozen,
                day.state === 'pending' && styles.dotPending,
              ]}>
              {day.state === 'done' ? <Text style={styles.dotMark}>✓</Text> : null}
              {day.state === 'frozen' ? <Text style={styles.dotIce}>🧊</Text> : null}
            </View>
            <Text style={styles.dayText}>{weekdayInitial(day.key, language, 'narrow')}</Text>
          </View>
        ))}
      </View>

      {compact ? null : (
        <Text style={styles.hint}>
          {streak.todayDone ? t('streak.todayDone') : t('streak.todayPending')}
        </Text>
      )}
      {streak.freezes > 0 || streak.current >= 3 ? (
        <Text style={styles.small}>{t('streak.freezesHint')}</Text>
      ) : null}

      {streak.todayDone ? null : (
        <Pressable
          testID="streak-no-spend"
          accessibilityRole="button"
          onPress={() => void noSpend()}
          style={styles.noSpend}>
          <Text style={styles.noSpendText}>{t('streak.noSpend')}</Text>
        </Pressable>
      )}

      <Pressable
        testID="streak-reminder"
        accessibilityRole="button"
        onPress={() => {
          tapFeedback();
          setSheetOpen(true);
        }}
        style={styles.reminderRow}>
        <Text style={styles.reminderLabel}>
          {t('logReminder.label')} ·{' '}
          <Text style={styles.reminderValue}>
            {reminder.enabled
              ? t('logReminder.at', { time: logReminderTime(reminder.hour, reminder.minute) })
              : t('logReminder.off')}
          </Text>
        </Text>
        <Text style={styles.reminderChange}>{t('logReminder.change')}</Text>
      </Pressable>

      <LogReminderSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
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
  compact: {
    borderWidth: 0,
    padding: 0,
    backgroundColor: 'transparent',
  },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
    flexShrink: 1,
  },
  freezePill: {
    backgroundColor: palette.tealSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freezeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.tealText,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: palette.teal,
    borderColor: palette.teal,
  },
  dotFrozen: {
    backgroundColor: palette.tealSoft,
    borderColor: palette.tealSoft,
  },
  dotPending: {
    borderColor: palette.accent,
    borderStyle: 'dashed',
    backgroundColor: palette.surfaceSolid,
  },
  dotMark: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: palette.white,
  },
  dotIce: { fontSize: 13 },
  dayText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.inkMuted,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  small: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
    lineHeight: 17,
  },
  noSpend: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noSpendText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  reminderRow: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
  },
  reminderLabel: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  reminderValue: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.ink,
  },
  reminderChange: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.tealText,
  },
});
