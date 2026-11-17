import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { LogReminderSheet, logReminderTime } from '@/src/components/LogReminderSheet';
import { StreakShareSheet } from '@/src/components/StreakShareSheet';
import { sheetStyles } from '@/src/components/ui/sheet';
import { useCalendarClock } from '@/src/hooks/useCalendarClock';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { radius, scale } from '@/src/theme';
import { palette } from '@/src/theme/colors';
import { parseLocalDateKey } from '@/src/utils/habitPilot';
import { logReminderOf } from '@/src/utils/logReminder';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { streakFromLedger, streakMilestone, type StreakDayState } from '@/src/utils/streak';

const STATE_LABEL: Record<StreakDayState, TranslationKey> = {
  done: 'streak.stateDone',
  frozen: 'streak.stateFrozen',
  missed: 'streak.stateMissed',
  pending: 'streak.statePending',
};

/** Lets one sheet slide away before the next one opens (iOS drops a modal opened mid-dismiss). */
const SHEET_SWAP_MS = 380;

function weekdayName(key: string, language: string, style: 'narrow' | 'long'): string {
  const name = parseLocalDateKey(key).toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
    weekday: style,
  });
  return style === 'narrow' ? name.toUpperCase() : name;
}

/**
 * The streak in Home's header: "🐜 5". It counts itself from the days with a
 * logged movement (freezes cover a missed day). Tapping it opens the detail:
 * the last 7 days, the freezes, sharing the streak and the daily reminder.
 */
export function StreakChip() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { transactions } = useFinance();
  // Re-renders at midnight so "today" moves on while the app stays open.
  const { day: today } = useCalendarClock();
  const [detailOpen, setDetailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const streak = useMemo(
    () => streakFromLedger(transactions, settings.noSpendDays),
    [transactions, settings.noSpendDays, today]
  );
  const reminder = logReminderOf(settings.logReminder);
  // On a milestone day (7, 15, 30…) the chip turns gold and sharing takes the lead.
  const milestone = streak.todayDone ? streakMilestone(streak.current) : null;

  function swapTo(open: (v: boolean) => void) {
    tapFeedback();
    setDetailOpen(false);
    setTimeout(() => open(true), SHEET_SWAP_MS);
  }

  return (
    <>
      <Pressable
        testID="streak-chip"
        accessibilityRole="button"
        accessibilityLabel={t('streak.chipLabel', { count: streak.current })}
        hitSlop={6}
        onPress={() => {
          tapFeedback();
          setDetailOpen(true);
        }}
        style={({ pressed }) => [
          styles.chip,
          milestone && styles.chipHot,
          pressed && styles.chipPressed,
        ]}>
        <Text style={[styles.chipText, milestone && styles.chipTextHot]}>🐜 {streak.current}</Text>
        {/* A small coral dot while today has nothing logged yet. */}
        {!streak.todayDone ? <View style={styles.pendingDot} /> : null}
      </Pressable>

      <AppModal
        visible={detailOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailOpen(false)}>
        <Pressable accessible={false} style={sheetStyles.scrim} onPress={() => setDetailOpen(false)}>
          <Pressable
            accessible={false}
            onPress={(e) => e.stopPropagation()}
            style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}
            testID="streak-detail">
            <View style={sheetStyles.grabber} />
            <Text style={styles.kicker}>{t('streak.kicker')}</Text>
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
                    day: weekdayName(day.key, language, 'long'),
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
                  <Text style={styles.dayText}>{weekdayName(day.key, language, 'narrow')}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.hint}>
              {streak.todayDone ? t('streak.todayDone') : t('streak.todayPending')}
            </Text>
            <Text style={styles.small}>{t('streak.freezesHint')}</Text>

            {streak.current > 0 ? (
              <>
                {milestone ? (
                  <Text style={styles.milestone}>{t('streakShare.milestone', { count: milestone })}</Text>
                ) : null}
                <Pressable
                  testID="streak-share"
                  accessibilityRole="button"
                  onPress={() => swapTo(setShareOpen)}
                  style={[milestone ? sheetStyles.primary : sheetStyles.secondary, styles.shareBtn]}>
                  <Text style={milestone ? sheetStyles.primaryText : styles.shareText}>
                    {t('streakShare.button')}
                  </Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              testID="streak-reminder"
              accessibilityRole="button"
              onPress={() => swapTo(setReminderOpen)}
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
          </Pressable>
        </Pressable>
      </AppModal>

      <StreakShareSheet visible={shareOpen} onClose={() => setShareOpen(false)} streak={streak} />
      <LogReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    minWidth: 52,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  chipHot: { backgroundColor: scale.gold[400] },
  chipPressed: { opacity: 0.8 },
  chipText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: scale.neutral[0],
  },
  chipTextHot: { color: scale.ink[900] },
  pendingDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: scale.coral[500],
    borderWidth: 1,
    borderColor: scale.neutral[0],
  },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
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
    marginTop: 14,
  },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: palette.teal, borderColor: palette.teal },
  dotFrozen: { backgroundColor: palette.tealSoft, borderColor: palette.tealSoft },
  dotPending: {
    borderColor: palette.accent,
    borderStyle: 'dashed',
    backgroundColor: palette.surfaceSolid,
  },
  dotMark: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: palette.white },
  dotIce: { fontSize: 13 },
  dayText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: palette.inkMuted },
  hint: {
    marginTop: 14,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    lineHeight: 20,
  },
  small: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
    lineHeight: 17,
  },
  milestone: {
    marginTop: 14,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  shareBtn: { marginTop: 12 },
  shareText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.tealText,
  },
  reminderRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
  },
  reminderLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 13, color: palette.inkMuted },
  reminderValue: { fontFamily: 'DMSans_600SemiBold', color: palette.ink },
  reminderChange: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: palette.tealText },
});
