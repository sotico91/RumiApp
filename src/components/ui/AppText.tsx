import { Text, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/src/theme';

type TextColor = keyof typeof colors.text;

type Props = TextProps & {
  variant?: TypeVariant;
  /** A semantic text color; pass `style.color` for anything else. */
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
};

/** Text on the type scale. */
export function AppText({
  variant = 'body',
  color = 'primary',
  align,
  style,
  ...rest
}: Props) {
  return (
    <Text
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
