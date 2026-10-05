import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Shrink long amounts instead of wrapping (default true). */
  fit?: boolean;
};

/**
 * Money amounts must stay on one line so “$” / “-” never split from the digits.
 */
export function MoneyText({ children, style, fit = true }: Props) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit={fit}
      minimumFontScale={0.7}
      maxFontSizeMultiplier={1.4}
      style={[styles.base, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 1,
  },
});
