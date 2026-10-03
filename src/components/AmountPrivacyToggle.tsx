import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useAmountPrivacy } from '@/src/hooks/useAmountPrivacy';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, radius } from '@/src/theme';
import { tapFeedback } from '@/src/utils/selectFeedback';

/**
 * Eye in each screen's petrol header that shows / hides every amount.
 * Same size and glass style as the ? button next to it.
 */
export function AmountPrivacyToggle() {
  const { t } = useLanguage();
  const { amountsVisible, toggleAmountsVisible } = useAmountPrivacy();

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        toggleAmountsVisible();
      }}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: amountsVisible }}
      accessibilityLabel={
        amountsVisible ? t('privacy.hideAmounts') : t('privacy.showAmounts')
      }>
      <SymbolView
        name={{
          ios: amountsVisible ? 'eye.fill' : 'eye.slash.fill',
          android: amountsVisible ? 'visibility' : 'visibility_off',
          web: amountsVisible ? 'visibility' : 'visibility_off',
        }}
        tintColor={colors.text.onBrand}
        size={18}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
});
