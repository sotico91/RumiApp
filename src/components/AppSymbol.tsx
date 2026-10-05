import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SymbolView, type AndroidSymbol, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

export type AppSymbolProps = {
  /** SF Symbol drawn natively on iOS. */
  ios: SFSymbol;
  /** MaterialCommunityIcons glyph used on Android (AppSymbol.android.tsx). */
  android: ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** Material Symbol for web. */
  web: AndroidSymbol;
  color: ColorValue;
  size: number;
  /** iOS stroke weight. */
  weight?: SymbolWeight;
};

/**
 * System icon: SF Symbols on iOS. Android draws the same idea with
 * MaterialCommunityIcons (already bundled for categories) so the APK does not
 * also ship the Material Symbols font.
 */
export function AppSymbol({ ios, web, color, size, weight }: AppSymbolProps) {
  return <SymbolView name={{ ios, web }} tintColor={color} size={size} weight={weight} />;
}
