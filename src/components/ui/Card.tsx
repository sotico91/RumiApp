import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { SelectPressable } from '@/src/components/SelectPressable';
import { usePressScale } from '@/src/components/ui/usePressScale';
import { colors, radius, scale, shadow, space, type StatusTone } from '@/src/theme';

type Props = {
  children: ReactNode;
  /**
   * surface: white card · tinted: soft status background (alerts) ·
   * hero: petrol gradient, pair with `color="onBrand"` text.
   */
  variant?: 'surface' | 'tinted' | 'hero';
  /** Only for `tinted`. */
  tone?: StatusTone;
  padding?: keyof typeof space | 0;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedView = Animated.createAnimatedComponent(View);

const TINT: Record<StatusTone, { bg: string; border: string }> = {
  success: { bg: colors.status.successSoft, border: 'rgba(31,157,108,0.30)' },
  warning: { bg: colors.status.warningSoft, border: 'rgba(194,124,14,0.30)' },
  danger: { bg: colors.status.dangerSoft, border: 'rgba(214,69,69,0.30)' },
  info: { bg: colors.status.infoSoft, border: 'rgba(42,111,122,0.25)' },
};

export function Card({
  children,
  variant = 'surface',
  tone = 'info',
  padding = 'md',
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const press = usePressScale();
  const box: StyleProp<ViewStyle> = [
    styles.base,
    { padding: padding === 0 ? 0 : space[padding] },
    variant === 'surface' && styles.surface,
    variant === 'tinted' && {
      backgroundColor: TINT[tone].bg,
      borderColor: TINT[tone].border,
    },
    variant === 'hero' && styles.hero,
  ];

  const body = (
    <>
      {variant === 'hero' ? (
        <LinearGradient
          colors={[scale.petrol[600], scale.petrol[700], scale.petrol[800]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </>
  );

  if (!onPress) {
    return <View style={[box, style]}>{body}</View>;
  }

  return (
    <AnimatedView style={[press.style, style]}>
      <SelectPressable
        onPress={onPress}
        onPressIn={press.pressIn}
        onPressOut={press.pressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={box}>
        {body}
      </SelectPressable>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  surface: {
    backgroundColor: colors.bg.surface,
    borderColor: colors.border.subtle,
    ...shadow.e1,
  },
  hero: {
    borderColor: colors.border.onBrand,
    borderRadius: radius.xl,
    // Clips the gradient to the corners; surface cards stay unclipped for the shadow.
    overflow: 'hidden',
  },
});
