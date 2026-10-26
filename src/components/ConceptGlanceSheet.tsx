import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { MoneyText } from '@/src/components/MoneyText';
import { findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { sheetStyles } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { palette } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';

export type GlanceConceptItem = {
  categoryId: string;
  color: string;
  total: number;
  percent: number;
  count: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  kind: 'expense' | 'income';
  items: GlanceConceptItem[];
  total: number;
};

type GlanceGroup = {
  key: string;
  name: string;
  color: string;
  total: number;
  count: number;
  percent: number;
  subs: GlanceConceptItem[];
};

export function ConceptGlanceSheet({ visible, onClose, kind, items, total }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // Keep last open content while the Modal fade-out runs; parent clears
  // `kind`/`items` to expense defaults the moment visible becomes false.
  const [frozen, setFrozen] = useState({ kind, items, total });

  useEffect(() => {
    if (visible) {
      setFrozen({ kind, items, total });
      return;
    }
    setExpandedKey(null);
  }, [visible, kind, items, total]);

  const spendConcepts = settings.spendConcepts ?? [];
  const displayKind = frozen.kind;
  const displayItems = frozen.items;
  const displayTotal = frozen.total;
  const isExpense = displayKind === 'expense';

  const groups = useMemo((): GlanceGroup[] => {
    if (!isExpense) {
      return displayItems
        .map((item) => ({
          key: item.categoryId,
          name: categoryLabel(item.categoryId, t, spendConcepts),
          color: item.color,
          total: item.total,
          count: item.count,
          percent: displayTotal > 0 ? (item.total / displayTotal) * 100 : 0,
          subs: [] as GlanceConceptItem[],
        }))
        .sort((a, b) => b.total - a.total);
    }

    const map = new Map<string, GlanceGroup>();

    for (const item of displayItems) {
      const hit = findSpendSub(spendConcepts, item.categoryId);
      const key = hit?.concept.id ?? item.categoryId;
      const name = hit?.concept.name ?? categoryLabel(item.categoryId, t, spendConcepts);
      const color = hit?.concept.color ?? item.color;
      const cur = map.get(key) ?? {
        key,
        name,
        color,
        total: 0,
        count: 0,
        percent: 0,
        subs: [],
      };
      cur.total += item.total;
      cur.count += item.count;
      cur.subs.push(item);
      map.set(key, cur);
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        percent: displayTotal > 0 ? (g.total / displayTotal) * 100 : 0,
        subs: [...g.subs].sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [displayItems, spendConcepts, t, displayTotal, isExpense]);

  function hasExpandableSubs(group: GlanceGroup) {
    if (!isExpense) return false;
    if (group.subs.length > 1) return true;
    if (group.subs.length !== 1) return false;
    const hit = findSpendSub(spendConcepts, group.subs[0].categoryId);
    if (!hit) return false;
    if (isGeneralSubName(hit.sub.name)) return false;
    return hit.sub.name !== group.name;
  }

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={sheetStyles.scrim} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[sheetStyles.sheet, styles.panel, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={sheetStyles.grabber} />
          <View style={styles.panelHeader}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.panelEyebrow}>{t('home.glanceMonth')}</Text>
              <Text style={styles.panelTitle}>
                {t(isExpense ? 'home.glanceExpensesTitle' : 'home.glanceIncomeTitle')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tapFeedback();
                onClose();
              }}
              hitSlop={12}
              style={sheetStyles.close}>
              <Text style={sheetStyles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              {t(isExpense ? 'home.expenses' : 'home.income')}
            </Text>
            <MoneyText
              style={[
                styles.totalValue,
                isExpense ? styles.textDanger : styles.textGood,
              ]}>
              {format(displayTotal)}
            </MoneyText>
          </View>

          <Text style={styles.section}>
            {t(isExpense ? 'home.glanceByConcept' : 'home.glanceByIncomeConcept')}
          </Text>
          {groups.length > 0 && isExpense ? (
            <Text style={styles.sectionHint}>{t('home.glanceTapConcept')}</Text>
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {groups.length === 0 ? (
              <Text style={styles.empty}>
                {t(isExpense ? 'home.glanceExpensesEmpty' : 'home.glanceIncomeEmpty')}
              </Text>
            ) : (
              groups.map((group, index) => {
                const expandable = hasExpandableSubs(group);
                const open = expandedKey === group.key;
                return (
                  <View key={group.key} style={[styles.group, index > 0 && styles.groupDivider]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        if (!expandable) return;
                        tapFeedback();
                        setExpandedKey(open ? null : group.key);
                      }}
                      style={styles.conceptRow}>
                      <View style={styles.conceptLeft}>
                        <View style={[styles.swatch, { backgroundColor: group.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.conceptName}>{group.name}</Text>
                          <Text style={styles.conceptMeta}>
                            {t(
                              isExpense
                                ? 'insights.percentOfTotalShort'
                                : 'insights.percentOfIncomeShort',
                              { percent: Math.round(group.percent) }
                            )}
                            {' · '}
                            {group.count}{' '}
                            {isExpense
                              ? group.count === 1
                                ? t('insights.expense')
                                : t('insights.expenses')
                              : group.count === 1
                                ? t('insights.income')
                                : t('insights.incomes')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.conceptRight}>
                        <MoneyText
                          style={[
                            styles.conceptAmount,
                            isExpense ? styles.textDanger : styles.textGood,
                          ]}>
                          {format(group.total)}
                        </MoneyText>
                        {expandable ? (
                          <Text style={styles.rowChevron}>{open ? '▾' : '▸'}</Text>
                        ) : null}
                      </View>
                    </Pressable>

                    {open && expandable ? (
                      <View style={styles.subList}>
                        {group.subs.map((sub) => {
                          const hit = findSpendSub(spendConcepts, sub.categoryId);
                          const subName =
                            hit?.sub.name ??
                            categoryLabel(sub.categoryId, t, spendConcepts);
                          const subShare =
                            displayTotal > 0
                              ? Math.round((sub.total / displayTotal) * 100)
                              : 0;
                          return (
                            <View key={sub.categoryId} style={styles.subRow}>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.subName}>{subName}</Text>
                                <Text style={styles.subMeta}>
                                  {t(
                                    isExpense
                                      ? 'insights.percentOfTotalShort'
                                      : 'insights.percentOfIncomeShort',
                                    { percent: subShare }
                                  )}
                                  {' · '}
                                  {sub.count}{' '}
                                  {isExpense
                                    ? sub.count === 1
                                      ? t('insights.expense')
                                      : t('insights.expenses')
                                    : sub.count === 1
                                      ? t('insights.income')
                                      : t('insights.incomes')}
                                </Text>
                              </View>
                              <MoneyText style={styles.subAmount}>{format(sub.total)}</MoneyText>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: '82%',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  panelEyebrow: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  panelTitle: {
    marginTop: 2,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: palette.ink,
  },
  // The total as a figure on the page, not a tinted box.
  totalCard: {
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  totalLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  totalValue: {
    marginTop: 2,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.ink,
  },
  section: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
    marginBottom: 2,
  },
  sectionHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    marginBottom: 8,
  },
  list: {
    maxHeight: 360,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
    paddingVertical: 12,
  },
  group: {},
  groupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.strong,
  },
  conceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
  },
  conceptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  conceptRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  conceptName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  conceptMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    marginTop: 2,
  },
  conceptAmount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  rowChevron: {
    fontSize: 12,
    color: palette.inkMuted,
  },
  subList: {
    paddingBottom: 10,
    gap: 4,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 22,
    paddingVertical: 3,
  },
  subName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  subMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    marginTop: 2,
  },
  subAmount: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  textGood: { color: palette.success },
  textDanger: { color: palette.danger },
});
