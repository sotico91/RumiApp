import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DictationPhase } from '@/src/hooks/useDictation';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { dictatedDate } from '@/src/utils/dictation';
import { tapFeedback } from '@/src/utils/selectFeedback';

type BarProps = {
  phase: DictationPhase;
  transcript: string;
  /** 0..1 */
  level: number;
  /** Last sentence used, shown so the person can check it. */
  heard: string | null;
  /** Heard, but no amount in it. */
  noAmount: boolean;
  onStart: () => void;
  onDone: () => void;
  onCancel: () => void;
};

/**
 * Top of Add: one place to dictate any movement (spend, income, move, debt).
 * Idle it invites to talk; listening it shows what Rumi hears and how loud.
 */
export function DictationBar({
  phase,
  transcript,
  level,
  heard,
  noAmount,
  onStart,
  onDone,
  onCancel,
}: BarProps) {
  const { t } = useLanguage();
  const listening = phase === 'starting' || phase === 'listening';

  if (listening) {
    // A floor so the bar is visible while waiting for the voice.
    const width = `${Math.round(8 + level * 92)}%` as const;
    return (
      <View style={[styles.bar, styles.barOn]} accessibilityLiveRegion="polite">
        <View style={styles.row}>
          <View style={[styles.micDot, styles.micDotOn]}>
            <MaterialCommunityIcons name="microphone" size={22} color={palette.white} />
          </View>
          <Text style={styles.title}>{t('voice.listening')}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.level, { width }]} />
        </View>
        <Text style={transcript ? styles.heardLive : styles.sub}>{transcript || t('voice.example')}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onCancel} accessibilityRole="button" style={styles.ghost} hitSlop={6}>
            <Text style={styles.ghostText}>{t('voice.cancel')}</Text>
          </Pressable>
          <Pressable onPress={onDone} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneText}>{t('voice.done')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const error =
    phase === 'denied'
      ? t('voice.denied')
      : phase === 'notHeard'
        ? t('voice.notHeard')
        : phase === 'failed'
          ? t('voice.failed')
          : null;

  const title = heard ? t('voice.again') : t('voice.mic');
  const status = error
    ? error
    : heard
      ? `${t('voice.heard', { text: heard })}${noAmount ? ` ${t('voice.noAmount')}` : ''}`
      : t('voice.example');

  return (
    <Pressable
      testID="dictate-bar"
      onPress={() => {
        tapFeedback();
        onStart();
      }}
      accessibilityRole="button"
      // One label with the status, so VoiceOver reads the error or what was heard.
      accessibilityLabel={`${title}. ${status}`}
      style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}>
      <View style={styles.row}>
        <View style={styles.micDot}>
          <MaterialCommunityIcons name="microphone" size={22} color={palette.accent} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={error ? styles.error : styles.sub}>
            {status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** The day a dictated movement happened, when it was not today; ✕ goes back to today. */
export function DictatedDateChip({ daysAgo, onClear }: { daysAgo: number; onClear: () => void }) {
  const { t, language } = useLanguage();
  if (daysAgo <= 0) return null;
  const day = dictatedDate(daysAgo).toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const label =
    daysAgo === 1 ? t('quick.dateYesterday', { date: day }) : day.charAt(0).toLocaleUpperCase() + day.slice(1);
  return (
    <View style={styles.dateRow}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={palette.inkMuted} />
      <Text style={styles.dateText}>{label}</Text>
      <Pressable
        onPress={() => {
          tapFeedback();
          onClear();
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('quick.dateToday')}>
        <MaterialCommunityIcons name="close" size={18} color={palette.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  barPressed: { backgroundColor: palette.accentSoft },
  barOn: { backgroundColor: palette.accentSoft, borderColor: palette.accentSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 2 },
  micDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentSoft,
  },
  micDotOn: { backgroundColor: palette.accent },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: palette.ink,
  },
  sub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  error: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.danger,
  },
  heardLive: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: palette.ink,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15,28,36,0.08)',
    overflow: 'hidden',
  },
  level: { height: 6, borderRadius: 3, backgroundColor: palette.accent },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  ghost: { paddingVertical: 8 },
  ghostText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: palette.inkMuted },
  done: {
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  doneText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: palette.white },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
});
