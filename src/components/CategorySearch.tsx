import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { isGeneralSubName, subColor } from '@/src/data/spendConcepts';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import type { SpendConcept } from '@/src/types/settings';
import { tapFeedback } from '@/src/utils/selectFeedback';

/** Show the search box once the tree is too big to scan by eye. */
export const CATEGORY_SEARCH_MIN_SUBS = 10;
const MAX_RESULTS = 12;

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Find a subcategory across every concept ("netf" → Suscripciones · Netflix),
 * accent-insensitive. Picking one returns both ids.
 */
export function CategorySearch({
  concepts,
  onPick,
}: {
  concepts: SpendConcept[];
  onPick: (conceptId: string, subId: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = fold(query);
    if (!q) return [];
    const hits: { conceptId: string; subId: string; label: string; color: string; icon?: string }[] = [];
    for (const concept of concepts) {
      for (const sub of concept.subs) {
        const general = isGeneralSubName(sub.name);
        if (!fold(sub.name).includes(q) && !fold(concept.name).includes(q)) continue;
        hits.push({
          conceptId: concept.id,
          subId: sub.id,
          label: general ? concept.name : `${concept.name} · ${sub.name}`,
          color: subColor(concept, sub),
          icon: concept.icon,
        });
        if (hits.length >= MAX_RESULTS) return hits;
      }
    }
    return hits;
  }, [query, concepts]);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('categorySearch.placeholder')}
        placeholderTextColor={palette.inkMuted}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
      />
      {query.trim() ? (
        results.length === 0 ? (
          <Text style={styles.empty}>{t('categorySearch.empty')}</Text>
        ) : (
          <View style={styles.results}>
            {results.map((hit) => (
              <Pressable
                key={hit.subId}
                onPress={() => {
                  tapFeedback();
                  onPick(hit.conceptId, hit.subId);
                  setQuery('');
                }}
                style={styles.result}>
                <ConceptIcon icon={hit.icon} color={hit.color} size={16} />
                <Text style={styles.resultText}>{hit.label}</Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.ink,
    backgroundColor: '#fff',
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  results: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  resultText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
});
