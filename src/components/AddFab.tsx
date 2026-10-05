import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppSymbol } from '@/src/components/AppSymbol';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, radius, shadow, space } from '@/src/theme';
import { tapFeedback } from '@/src/utils/selectFeedback';

export const ADD_FAB_SIZE = 58;
/** Distance from the screen's right edge and from the top of the tab bar. */
export const ADD_FAB_OFFSET = space.lg;

/** Home's floating + : opens the add flow. */
export function AddFab() {
  const { t } = useLanguage();
  const keyboardVisible = useKeyboardVisible();

  if (keyboardVisible) return null;

  return (
    <Animated.View entering={ZoomIn.springify()} style={styles.wrap}>
      <Pressable
        onPress={() => {
          tapFeedback();
          router.push('/agregar');
        }}
        accessibilityRole="button"
        accessibilityLabel={t('fab.add')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <AppSymbol
          ios="plus"
          android="plus"
          web="add"
          color={colors.text.onAction}
          size={30}
          weight="semibold"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: ADD_FAB_OFFSET,
    bottom: ADD_FAB_OFFSET,
  },
  fab: {
    width: ADD_FAB_SIZE,
    height: ADD_FAB_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.e2,
  },
  pressed: {
    backgroundColor: colors.action.primaryPressed,
    transform: [{ scale: 0.96 }],
  },
});
