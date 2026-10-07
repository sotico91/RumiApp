import { StyleSheet, Text, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { SelectPressable } from '@/src/components/SelectPressable';
import { isGeneralSubName, subColor } from '@/src/data/spendConcepts';
import { palette } from '@/src/theme/colors';
import type { SpendConcept } from '@/src/types/settings';

/**
 * Every subcategory, grouped under its category, to pick where things go
 * (join with, or where a deleted one's movements move to).
 */
export function SubDestinationPicker({
  concepts,
  excludeSubIds = [],
  excludeConceptId,
  onPick,
}: {
  concepts: SpendConcept[];
  excludeSubIds?: string[];
  excludeConceptId?: string;
  onPick: (conceptId: string, subId: string, label: string) => void;
}) {
  const skip = new Set(excludeSubIds);
  const groups = concepts
    .filter((c) => c.id !== excludeConceptId)
    .map((c) => ({ concept: c, subs: c.subs.filter((s) => !skip.has(s.id)) }))
    .filter((g) => g.subs.length > 0);

  return (
    <View style={styles.wrap}>
      {groups.map(({ concept, subs }) => (
        <View key={concept.id} style={styles.group}>
          <View style={styles.groupHeader}>
            <ConceptIcon icon={concept.icon} color={concept.color} size={14} />
            <Text style={styles.groupTitle}>{concept.name}</Text>
          </View>
          <View style={styles.chips}>
            {subs.map((sub) => {
              const label = isGeneralSubName(sub.name)
                ? concept.name
                : `${concept.name} · ${sub.name}`;
              return (
                <SelectPressable
                  key={sub.id}
                  onPress={() => onPick(concept.id, sub.id, label)}
                  accessibilityLabel={label}
                  style={styles.chip}>
                  <View style={[styles.dot, { backgroundColor: subColor(concept, sub) }]} />
                  <Text style={styles.chipText}>{sub.name}</Text>
                </SelectPressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  group: { gap: 6 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
});
