import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DictationPhase } from '@/src/hooks/useDictation';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

/** Round mic next to the amount. */
export function DictationMicButton({ onPress, active }: { onPress: () => void; active: boolean }) {
  const { t } = useLanguage();
  return (
    <Pressable
      testID="quick-dictate"
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t('voice.mic')}
      accessibilityState={{ busy: active }}
      style={[styles.mic, active && styles.micOn]}>
      <MaterialCommunityIcons name="microphone" size={24} color={active ? palette.white : palette.accent} />
    </Pressable>
  );
}

type Props = {
  phase: DictationPhase;
  transcript: string;
  /** 0..1 */
  level: number;
  onDone: () => void;
  onCancel: () => void;
};

/** While listening: what Rumi hears so far, how loud, and Done / Cancel. */
export function DictationPanel({ phase, transcript, level, onDone, onCancel }: Props) {
  const { t } = useLanguage();
  if (phase !== 'starting' && phase !== 'listening') return null;
  // A floor so the bar is visible while waiting for the voice.
  const width = `${Math.round(8 + level * 92)}%` as const;
  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      <Text style={styles.title}>{t('voice.listening')}</Text>
      <View style={styles.track}>
        <View style={[styles.bar, { width }]} />
      </View>
      <Text style={transcript ? styles.heard : styles.example}>
        {transcript || t('voice.example')}
      </Text>
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

const styles = StyleSheet.create({
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentSoft,
    marginBottom: 8,
  },
  micOn: { backgroundColor: palette.accent },
  panel: {
    backgroundColor: palette.accentSoft,
    borderRadius: radii.sm,
    padding: 14,
    gap: 10,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: palette.ink,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15,28,36,0.08)',
    overflow: 'hidden',
  },
  bar: { height: 6, borderRadius: 3, backgroundColor: palette.accent },
  heard: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: palette.ink,
  },
  example: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
  },
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
});
