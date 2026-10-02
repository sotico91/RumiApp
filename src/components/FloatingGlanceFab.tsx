import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

/**
 * ◎ opens "Add" straight away. Month totals live in the floating totals
 * panel on Home, so this no longer opens a summary sheet first.
 */
export function FloatingGlanceFab() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const keyboardVisible = useKeyboardVisible();

  if (keyboardVisible) return null;

  return (
    <Animated.View
      entering={ZoomIn.springify()}
      style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 12) + 78 }]}>
      <Pressable
        onPress={() => {
          tapFeedback();
          router.push('/agregar');
        }}
        style={styles.fab}
        accessibilityLabel={t('fab.add')}>
        <Text style={styles.fabGlyph}>◎</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 18,
    zIndex: 40,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fabGlyph: {
    fontSize: 22,
    color: palette.white,
    fontFamily: 'Fraunces_700Bold',
  },
});
