import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { SelectPressable } from '@/src/components/SelectPressable';
import type { CategorySuggestionState } from '@/src/hooks/useCategorySuggestion';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';

type Props = {
  hint: CategorySuggestionState;
  /** Subcategory picked right now. */
  selectedSubId: string | null | undefined;
  /**
   * The form follows the suggestion on its own (quick add before the user
   * picks): says where it went, or what it will create on save.
   */
  auto?: boolean;
  onApply: (conceptId: string, subId: string) => void;
};

/**
 * Under the description: where this spend seems to belong. Confirms when the
 * pick already fits; otherwise offers the subcategory with one tap, creating
 * it when the user has none for that kind of spend. Ignoring it saves as picked.
 */
export function CategorySuggestionHint({ hint, selectedSubId, auto, onApply }: Props) {
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);
  const { suggestion, label, concept, isAnt } = hint;
  if (!suggestion || !label) return null;

  const ant = isAnt ? ` · ${t('plan.antBadge')}` : '';
  const icon = (
    <ConceptIcon icon={concept?.icon} color={concept?.color ?? palette.inkMuted} size={14} variant="bubble" />
  );

  if (!suggestion.create && suggestion.subId === selectedSubId) {
    return (
      <Text style={styles.fits} accessibilityLiveRegion="polite">
        {t(auto ? 'suggest.placed' : 'suggest.fits', { category: label })}
        {ant}
      </Text>
    );
  }

  if (suggestion.create && auto) {
    return (
      <View style={styles.row} accessibilityLiveRegion="polite">
        {icon}
        <Text style={styles.text}>
          {t('suggest.willCreate', { category: label })}
          {ant}
        </Text>
      </View>
    );
  }

  async function apply() {
    if (creating) return;
    setCreating(true);
    try {
      const ids = await hint.resolve();
      if (ids) onApply(ids.conceptId, ids.subId);
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      {icon}
      <Text style={styles.text}>
        {t(suggestion.create ? 'suggest.new' : 'suggest.seems', { category: label })}
        {ant}
      </Text>
      <SelectPressable
        onPress={() => void apply()}
        disabled={creating}
        accessibilityLabel={t(suggestion.create ? 'suggest.createA11y' : 'suggest.useA11y', {
          category: label,
        })}
        hitSlop={8}
        style={styles.useBtn}>
        <Text style={styles.useText}>
          {t(suggestion.create ? 'suggest.create' : 'suggest.use')}
        </Text>
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
