import { Text, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/src/theme';

type TextColor = keyof typeof colors.text;

type Props = TextProps & {
  variant?: TypeVariant;
  /** A semantic text color; pass `style.color` for anything else. */
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
};

/** Big type would push layouts apart at accessibility sizes; body text keeps scaling further. */
const LARGE_VARIANTS: TypeVariant[] = ['display', 'h1', 'h2', 'amount'];

/** Text on the type scale. */
export function AppText({
  variant = 'body',
  color = 'primary',
  align,
  style,
  maxFontSizeMultiplier,
  ...rest
}: Props) {
  return (
    <Text
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? (LARGE_VARIANTS.includes(variant) ? 1.3 : 1.8)
      }
      {...rest}
      style={[
        type[variant],
        { color: colors.text[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
