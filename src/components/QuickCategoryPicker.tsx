import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { InlineSubAdd } from '@/src/components/InlineSubAdd';
import { SelectPressable } from '@/src/components/SelectPressable';
import { isGeneralSubName, nextConceptColor, subColor } from '@/src/data/spendConcepts';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import type { SpendConcept } from '@/src/types/settings';
import { tapFeedback } from '@/src/utils/selectFeedback';

/**
 * "Other category" inside the quick form: category, then subcategory, or a new
 * one of either, without leaving the form (the amount stays typed).
 */
export function QuickCategoryPicker({
  concepts,
  onPick,
}: {
  concepts: SpendConcept[];
  onPick: (subId: string) => void;
}) {
  const { t } = useLanguage();
  const { addSpendConcept } = useSettings();
  const [conceptId, setConceptId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const concept = concepts.find((c) => c.id === conceptId);

  async function createConcept() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const created = await addSpendConcept(name, nextConceptColor(concepts));
      if (!created) return;
      setNewName('');
      setNewOpen(false);
      setConceptId(created.id);
    } finally {
      setBusy(false);
    }
  }

  if (concept) {
    return (
      <View style={styles.box}>
        <SelectPressable onPress={() => setConceptId(null)} hitSlop={8} style={styles.back}>
          <Text style={styles.backText}>‹ {concept.name}</Text>
        </SelectPressable>
        <View style={styles.wrap}>
          {concept.subs.map((sub) => (
            <SelectPressable key={sub.id} onPress={() => onPick(sub.id)} style={styles.chip}>
              <View style={[styles.dot, { backgroundColor: subColor(concept, sub) }]} />
              <Text style={styles.chipText}>
                {isGeneralSubName(sub.name) ? concept.name : sub.name}
              </Text>
            </SelectPressable>
          ))}
        </View>
        <InlineSubAdd conceptId={concept.id} onAdded={onPick} collapsed />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{t('quick.pickCategory')}</Text>
      <View style={styles.wrap}>
        {concepts.map((c) => (
          <SelectPressable
            key={c.id}
            onPress={() => {
              tapFeedback();
              // One sub only: that is the pick.
              if (c.subs.length === 1) onPick(c.subs[0].id);
              else setConceptId(c.id);
            }}
            style={styles.chip}>
            <ConceptIcon icon={c.icon} color={c.color} size={14} />
            <Text style={styles.chipText}>{c.name}</Text>
            {c.subs.length > 1 ? <Text style={styles.count}>{c.subs.length} ›</Text> : null}
          </SelectPressable>
        ))}
        {newOpen ? null : (
          <SelectPressable onPress={() => setNewOpen(true)} style={[styles.chip, styles.addChip]}>
            <Text style={styles.addText}>{t('quick.newCategory')}</Text>
          </SelectPressable>
        )}
      </View>
      {newOpen ? (
        <View style={styles.newRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder={t('plan.conceptsCustomPlaceholder')}
            placeholderTextColor={palette.inkSoft}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void createConcept()}
            style={styles.input}
          />
          <SelectPressable
            onPress={() => void createConcept()}
            disabled={busy || !newName.trim()}
            style={styles.createBtn}>
            {busy ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.createText}>{t('plan.conceptsAdd')}</Text>
            )}
          </SelectPressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
    gap: 8,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  back: { alignSelf: 'flex-start' },
  backText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.accentDeep,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  count: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addChip: { borderStyle: 'dashed', backgroundColor: palette.surfaceSolid },
  addText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
  newRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.ink,
  },
  createBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.accent,
  },
  createText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
});
