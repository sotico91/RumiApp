import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RaisedText } from '@/src/components/RaisedText';
import { AppText } from '@/src/components/ui/AppText';
import { colors, space, type } from '@/src/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Small line above the title (a date, a section name). */
  eyebrow?: string;
  /** Buttons on the right: help, profile, privacy eye. */
  actions?: ReactNode;
  /** `brand` for petrol backgrounds, `surface` for cream / white ones. */
  tone?: 'brand' | 'surface';
  style?: StyleProp<ViewStyle>;
};

/** The one title block every tab screen starts with. */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  tone = 'brand',
  style,
}: Props) {
  const onBrand = tone === 'brand';

  return (
    <View style={[styles.row, style]}>
      <View style={styles.copy}>
        {eyebrow ? (
          <AppText variant="overline" color={onBrand ? 'onBrandMuted' : 'tertiary'}>
            {eyebrow}
          </AppText>
        ) : null}
        {onBrand ? (
          <RaisedText accessibilityRole="header" style={[type.h1, styles.brandTitle]}>
            {title}
          </RaisedText>
        ) : (
          <AppText accessibilityRole="header" variant="h1">
            {title}
          </AppText>
        )}
        {subtitle ? (
          <AppText
            variant="caption"
            color={onBrand ? 'onBrandMuted' : 'secondary'}
            style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  copy: { flex: 1 },
  brandTitle: { color: colors.text.onBrand },
  subtitle: { marginTop: space.xxs },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xxs,
  },
});
