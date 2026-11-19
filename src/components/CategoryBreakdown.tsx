import { StyleSheet, Text, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { categoryVisual, findSpendSub } from '@/src/data/spendConcepts';
import { MoneyText } from '@/src/components/MoneyText';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { toneFromBudgetRatio } from '@/src/utils/signalTone';

type Insight = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percent: number;
  count: number;
};

type BudgetHint = {
  categoryId: string;
  ratio: number;
  remaining: number;
  limit?: number;
  spent?: number;
};

type Props = {
  insights: Insight[];
  emptyLabel?: string;
  budgetStatus?: BudgetHint[];
};

export function CategoryBreakdown({ insights, emptyLabel, budgetStatus }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];

  if (insights.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{emptyLabel ?? t('insights.emptyPeriod')}</Text>
      </View>
    );
  }

  const maxCount = Math.max(...insights.map((i) => i.count), 0);
  const mostFrequentId =
    maxCount >= 3
      ? insights.find((i) => i.count === maxCount)?.categoryId
      : undefined;

  const budgetMap = new Map(
    (budgetStatus ?? []).map((b) => [b.categoryId, b] as const)
  );

  function budgetFor(item: Insight) {
    const direct = budgetMap.get(item.categoryId);
    if (direct) return direct;
    let worst: BudgetHint | undefined;
    for (const b of budgetStatus ?? []) {
      const hit = findSpendSub(spendConcepts, b.categoryId);
      if (hit?.concept.id !== item.categoryId) continue;
      if (!worst || b.ratio > worst.ratio) worst = b;
    }
    return worst;
  }

  // One line per category: compact, since the mosaic above already draws the shares.
  return (
    <View style={styles.list}>
      {insights.map((item, index) => {
        const budget = budgetFor(item);
        const budgetTone = budget ? toneFromBudgetRatio(budget.ratio) : 'neutral';
        const isMostFrequent = item.categoryId === mostFrequentId;
        const flag =
          budgetTone === 'danger'
            ? { text: t('insights.overBudget'), color: palette.danger }
            : budgetTone === 'warn'
              ? { text: t('insights.nearBudget'), color: palette.accentDeep }
              : isMostFrequent
                ? { text: t('insights.mostFrequent'), color: palette.danger }
                : budgetTone === 'good'
                  ? { text: t('insights.underBudget'), color: palette.success }
                  : null;
        const limitText = budget
          ? t('insights.topeMeta', { spent: format(budget.spent ?? item.total), limit: format(budget.limit ?? 0) })
          : null;

        return (
          <View key={item.categoryId} style={[styles.row, index > 0 && styles.rowDivider]}>
            <View style={styles.line}>
              <ConceptIcon icon={categoryVisual(item.categoryId, spendConcepts).icon} color={item.color} size={16} />
              <Text style={styles.name} numberOfLines={1}>
                {categoryLabel(item.categoryId, t, spendConcepts)}
              </Text>
              <Text style={styles.percent}>{Math.round(item.percent)}%</Text>
              <MoneyText style={styles.total}>{format(item.total)}</MoneyText>
            </View>
            {flag || limitText ? (
              <Text style={styles.meta} numberOfLines={1}>
                {flag ? <Text style={[styles.flag, { color: flag.color }]}>{flag.text}</Text> : null}
                {flag && limitText ? ' · ' : ''}
                {limitText}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: {
    paddingVertical: 10,
    gap: 2,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  percent: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    minWidth: 36,
    textAlign: 'right',
  },
  total: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: palette.ink,
    minWidth: 84,
    textAlign: 'right',
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    marginLeft: 24,
  },
  flag: {
    fontFamily: 'DMSans_600SemiBold',
  },
  emptyWrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.inkMuted,
    lineHeight: 22,
  },
});
