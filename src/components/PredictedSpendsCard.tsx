import { StyleSheet, Text, View } from 'react-native';

import { MoneyText } from '@/src/components/MoneyText';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { findSpendSub, isGeneralSubName, subColor } from '@/src/data/spendConcepts';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import type { PredictedSpend } from '@/src/utils/financeMath';

type Props = {
  items: PredictedSpend[];
};

type Row = {
  item: PredictedSpend;
  title: string;
  detail: string;
  color: string;
  icon?: string;
  /** Days until the typical due day (negative = already past). */
  daysLeft: number;
};

/**
 * "Payments to watch": what is still to pay this month, soonest (and
 * overdue) first, then what is already paid. Each row says what it is
 * (installment vs. repeating bill) and when it is due in plain words.
 */
export function PredictedSpendsCard({ items }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const today = new Date().getDate();

  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{t('home.predictEmpty')}</Text>
      </View>
    );
  }

  const rows: Row[] = items.map((item) => {
    const hit = findSpendSub(spendConcepts, item.categoryId);
    const conceptName = hit?.concept.name;
    const subName = hit && !isGeneralSubName(hit.sub.name) ? hit.sub.name : undefined;
    const title =
      item.label?.trim() || subName || conceptName || categoryLabel(item.categoryId, t, spendConcepts);
    const kind = t(item.source === 'debt' ? 'home.predictKindDebt' : 'home.predictKindRepeat');
    const detail = conceptName && conceptName !== title ? `${conceptName} · ${kind}` : kind;
    return {
      item,
      title,
      detail,
      color: hit ? subColor(hit.concept, hit.sub) : palette.inkMuted,
      icon: hit?.concept.icon,
      daysLeft: item.typicalDay - today,
    };
  });

  const pending = rows
    .filter((r) => r.item.status === 'pending')
    .sort((a, b) => a.daysLeft - b.daysLeft || b.item.amount - a.item.amount);
  const paid = rows
    .filter((r) => r.item.status === 'paid')
    .sort((a, b) => a.item.typicalDay - b.item.typicalDay);
  const pendingTotal = pending.reduce((s, r) => s + r.item.amount, 0);

  function dueText(r: Row): { text: string; urgent: boolean } {
    const day = r.item.typicalDay;
    if (r.daysLeft < 0) return { text: t('home.predictOverdue', { day }), urgent: true };
    if (r.daysLeft === 0) return { text: t('home.predictToday'), urgent: true };
    if (r.daysLeft === 1) return { text: t('home.predictTomorrow'), urgent: false };
    return { text: t('home.predictInDays', { count: r.daysLeft, day }), urgent: false };
  }

  return (
    <View style={styles.card}>
      {pending.length > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>{t('home.predictPendingHeader')}</Text>
            <MoneyText style={styles.headerAmount}>{format(pendingTotal)}</MoneyText>
          </View>
          {pending.map((r, index) => {
            const due = dueText(r);
            return (
              <View
                key={r.item.id}
                style={[styles.row, index < pending.length - 1 && styles.rowDivider]}>
                <RowIcon row={r} />
                <View style={styles.rowMain}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {r.detail}
                  </Text>
                </View>
                <View style={styles.right}>
                  <MoneyText style={styles.amount}>{format(r.item.amount)}</MoneyText>
                  <Text style={[styles.due, due.urgent && styles.dueUrgent]}>{due.text}</Text>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {paid.length > 0 ? (
        <>
          <View style={[styles.header, pending.length > 0 && styles.headerSpaced]}>
            <Text style={styles.headerText}>
              {t('home.predictPaidHeader', { count: paid.length })}
            </Text>
          </View>
          {paid.map((r, index) => (
            <View
              key={r.item.id}
              style={[styles.row, styles.rowPaid, index < paid.length - 1 && styles.rowDivider]}>
              <RowIcon row={r} />
              <View style={styles.rowMain}>
                <Text style={[styles.name, styles.namePaid]} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {r.detail}
                </Text>
              </View>
              <View style={styles.right}>
                <MoneyText style={[styles.amount, styles.amountPaid]}>
                  {format(r.item.amount)}
                </MoneyText>
                <Text style={styles.due}>✓ {t('home.predictPaid')}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function RowIcon({ row }: { row: Row }) {
  if (row.item.source === 'debt' && !row.icon) {
    return <ConceptIcon icon="credit-card-outline" color={row.color} size={18} />;
  }
  return row.icon ? (
    <ConceptIcon icon={row.icon} color={row.color} size={18} />
  ) : (
    <View style={[styles.dot, { backgroundColor: row.color }]} />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  empty: {
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerSpaced: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  headerText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkMuted,
  },
  headerAmount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: palette.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowPaid: {
    opacity: 0.7,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  namePaid: {
    color: palette.inkMuted,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  amountPaid: {
    color: palette.inkMuted,
    textDecorationLine: 'line-through',
  },
  due: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.inkMuted,
  },
  dueUrgent: {
    color: palette.accent,
  },
});
