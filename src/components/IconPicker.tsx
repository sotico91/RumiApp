import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { SelectPressable } from '@/src/components/SelectPressable';
import { CONCEPT_ICONS } from '@/src/data/conceptIcons';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';

/** Icons shown before "more": common spend areas, so the grid stays one or two rows. */
const COMPACT_COUNT = 11;

/** Grid of category icons; the selected one is filled with `color`. Starts compact. */
export function IconPicker({
  selected,
  color,
  onSelect,
}: {
  selected?: string;
  color: string;
  onSelect: (icon: string) => void;
}) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  let icons: readonly string[] = CONCEPT_ICONS;
  if (!showAll) {
    const head = CONCEPT_ICONS.slice(0, COMPACT_COUNT) as readonly string[];
    // The selected icon always stays visible, even when it lives further down the list.
    icons = selected && !head.includes(selected) ? [selected, ...head.slice(0, -1)] : head;
  }

  return (
    <View style={styles.grid}>
      {icons.map((icon) => {
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
      <SelectPressable
        onPress={() => setShowAll((v) => !v)}
        accessibilityLabel={showAll ? t('plan.iconLess') : t('plan.iconMore')}
        style={[styles.cell, styles.moreCell]}>
        <MaterialCommunityIcons
          name={showAll ? 'chevron-up' : 'dots-horizontal'}
          size={20}
          color={palette.inkMuted}
        />
      </SelectPressable>
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
  moreCell: { borderStyle: 'dashed' },
});
