import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { AppSymbolProps } from './AppSymbol';

/** Android side of AppSymbol: a MaterialCommunityIcons glyph. */
export function AppSymbol({ android, color, size }: AppSymbolProps) {
  return <MaterialCommunityIcons name={android} color={color} size={size} />;
}
