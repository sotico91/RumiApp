import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { SelectPressable } from '@/src/components/SelectPressable';
import { AppText } from '@/src/components/ui/AppText';
import { usePressScale } from '@/src/components/ui/usePressScale';
import { colors, radius, space } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type Size = 'md' | 'sm';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  /** Leading icon, drawn in the label color by the caller. */
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Secondary / tertiary drawn for a petrol background. */
  onBrand?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onBrand = false,
  accessibilityLabel,
  style,
}: Props) {
  const press = usePressScale();
  const inactive = disabled || loading;
  const labelColor = labelColorFor(variant, onBrand);

  return (
    <AnimatedView style={[press.style, fullWidth && styles.fullWidth, style]}>
      <SelectPressable
        onPress={onPress}
        onPressIn={press.pressIn}
        onPressOut={press.pressOut}
        disabled={inactive}
        feedback={variant !== 'destructive'}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          size === 'sm' ? styles.sm : styles.md,
          containerFor(variant, onBrand, pressed),
          disabled && styles.disabled,
        ]}>
        {/* Keep the label laid out while loading so the width never jumps. */}
        <View style={[styles.content, loading && styles.hidden]}>
          {icon}
          <AppText
            variant="label"
            numberOfLines={1}
            style={[{ color: labelColor }, size === 'sm' && styles.smLabel]}>
            {label}
          </AppText>
        </View>
        {loading ? (
          <ActivityIndicator color={labelColor} style={StyleSheet.absoluteFill} />
        ) : null}
      </SelectPressable>
    </AnimatedView>
  );
}

function labelColorFor(variant: Variant, onBrand: boolean): string {
  switch (variant) {
    case 'primary':
    case 'destructive':
      return colors.text.onAction;
    case 'secondary':
      return onBrand ? colors.action.secondary : colors.text.onAction;
    case 'tertiary':
      return onBrand ? colors.text.onBrand : colors.action.secondary;
  }
}

function containerFor(variant: Variant, onBrand: boolean, pressed: boolean): ViewStyle {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: pressed ? colors.action.primaryPressed : colors.action.primary,
      };
    case 'destructive':
      return { backgroundColor: colors.status.danger, opacity: pressed ? 0.88 : 1 };
    case 'secondary':
      if (onBrand) {
        return { backgroundColor: colors.bg.surface, opacity: pressed ? 0.88 : 1 };
      }
      return {
        backgroundColor: pressed ? colors.action.secondaryPressed : colors.action.secondary,
      };
    case 'tertiary':
      return {
        backgroundColor: pressed
          ? onBrand
            ? 'rgba(255,255,255,0.12)'
            : colors.bg.surfaceMuted
          : 'transparent',
      };
  }
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    minHeight: 52,
    paddingHorizontal: space.lg,
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: space.md,
  },
  smLabel: {
    fontSize: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.4 },
});
