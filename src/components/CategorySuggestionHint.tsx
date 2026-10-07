import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { SelectPressable } from '@/src/components/SelectPressable';
import { isGeneralSubName, subColor } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import type { SpendConcept } from '@/src/types/settings';
import { buildNoteHistory, suggestCategory } from '@/src/utils/suggestCategory';

type Props = {
  note: string;
  /** Subcategory picked right now. */
  selectedSubId: string | null | undefined;
  concepts: SpendConcept[];
  onApply: (conceptId: string, subId: string) => void;
};

/**
 * Under the description: where this spend seems to belong. Confirms when the
 * pick already fits; otherwise offers the subcategory with one tap. Ignoring
 * it simply saves the spend as picked.
 */
export function CategorySuggestionHint({ note, selectedSubId, concepts, onApply }: Props) {
  const { t } = useLanguage();
  const { transactions } = useFinance();
  const history = useMemo(() => buildNoteHistory(transactions), [transactions]);
  const suggestion = useMemo(
    () => suggestCategory(note, concepts, history),
    [note, concepts, history]
  );

  if (!suggestion) return null;
  const concept = concepts.find((c) => c.id === suggestion.conceptId);
  const sub = concept?.subs.find((s) => s.id === suggestion.subId);
  if (!concept || !sub) return null;

  const label = isGeneralSubName(sub.name) ? concept.name : `${concept.name} · ${sub.name}`;

  if (suggestion.subId === selectedSubId) {
    return (
      <Text style={styles.fits} accessibilityLiveRegion="polite">
        {t('suggest.fits', { category: label })}
      </Text>
    );
  }

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <ConceptIcon icon={concept.icon} color={subColor(concept, sub)} size={14} variant="bubble" />
      <Text style={styles.text}>
        {t('suggest.seems', { category: label })}
        {sub.isAnt ? ` · ${t('plan.antBadge')}` : ''}
      </Text>
      <SelectPressable
        onPress={() => onApply(concept.id, sub.id)}
        accessibilityLabel={t('suggest.useA11y', { category: label })}
        hitSlop={8}
        style={styles.useBtn}>
        <Text style={styles.useText}>{t('suggest.use')}</Text>
      </SelectPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: palette.surfaceSolid,
    borderWidth: 1,
    borderColor: palette.border,
  },
  text: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  useBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  useText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  fits: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.success,
  },
});
