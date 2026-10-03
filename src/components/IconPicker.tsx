import { StyleSheet, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { SelectPressable } from '@/src/components/SelectPressable';
import { CONCEPT_ICONS } from '@/src/data/conceptIcons';
import { palette } from '@/src/theme/colors';

/** Grid of category icons; the selected one is filled with `color`. */
export function IconPicker({
  selected,
  color,
  onSelect,
}: {
  selected?: string;
  color: string;
  onSelect: (icon: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {CONCEPT_ICONS.map((icon) => {
        const on = icon === selected;
        return (
          <SelectPressable
            key={icon}
            onPress={() => onSelect(icon)}
            accessibilityLabel={icon}
            style={[styles.cell, on && { backgroundColor: color, borderColor: color }]}>
            <ConceptIcon icon={icon} size={20} color={on ? palette.white : palette.ink} />
          </SelectPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
