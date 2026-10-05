import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_CONCEPT_ICON, isConceptIcon } from '@/src/data/conceptIcons';
import { palette } from '@/src/theme/colors';

/**
 * A category's icon. `plain` draws just the glyph in `color` (chips, rows);
 * `bubble` puts a white glyph on a filled circle (headers, pickers).
 */
export function ConceptIcon({
  icon,
  color = palette.inkMuted,
  size = 16,
  variant = 'plain',
}: {
  icon?: string;
  color?: string;
  size?: number;
  variant?: 'plain' | 'bubble';
}) {
  const name = isConceptIcon(icon) ? icon : DEFAULT_CONCEPT_ICON;
  if (variant === 'plain') {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  const box = Math.round(size * 1.9);
  return (
    <View
      style={[
        styles.bubble,
        { width: box, height: box, borderRadius: box / 2, backgroundColor: color },
      ]}>
      <MaterialCommunityIcons name={name} size={size} color={palette.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
