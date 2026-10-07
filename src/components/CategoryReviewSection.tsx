import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appAlert } from '@/src/components/AppAlert';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { MoneyText } from '@/src/components/MoneyText';
import { SelectPressable } from '@/src/components/SelectPressable';
import { useCategoryReview, type ReviewItem } from '@/src/hooks/useCategoryReview';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

const PAGE = 8;

/**
 * History: saved spends whose description says they belong elsewhere
 * ("almuerzo" under Extra expenses). Move one, move all, or leave it (not
 * asked again). Hidden when there is nothing to review.
 */
export function CategoryReviewSection() {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const { items, move, leave } = useCategoryReview();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);

  if (items.length === 0) return null;

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  function moveAll() {
    appAlert(t('review.moveAllTitle', { count: items.length }), t('review.moveAllBody'), [
      { text: t('plan.setLimitCancel'), style: 'cancel' },
      { text: t('review.move'), onPress: () => void run(() => move(items)) },
    ]);
  }

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <View>
      <CollapsibleSection
        title={t('review.title')}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        summary={
          items.length === 1
            ? t('review.collapsed_one')
            : t('review.collapsed', { count: items.length })
        }>
        <View style={styles.body}>
          <Text style={styles.copy}>{t('review.body')}</Text>
          {items.length > 1 ? (
            <SelectPressable onPress={moveAll} disabled={busy} style={styles.moveAll}>
              <Text style={styles.moveAllText}>{t('review.moveAll', { count: items.length })}</Text>
            </SelectPressable>
          ) : null}

          {items.slice(0, shown).map((item) => (
            <Row
              key={item.tx.id}
              item={item}
              busy={busy}
              amount={format(item.tx.amount)}
              date={date(item.tx.createdAt)}
              onMove={() => void run(() => move([item]))}
              onLeave={() => {
                tapFeedback();
                void run(() => leave([item]));
              }}
            />
          ))}

          {items.length > shown ? (
            <SelectPressable onPress={() => setShown((n) => n + PAGE)} style={styles.more}>
              <Text style={styles.moreText}>{t('review.more', { count: items.length - shown })}</Text>
            </SelectPressable>
          ) : null}
        </View>
      </CollapsibleSection>
    </View>
  );
}

function Row({
  item,
  busy,
  amount,
  date,
  onMove,
  onLeave,
}: {
  item: ReviewItem;
  busy: boolean;
  amount: string;
  date: string;
  onMove: () => void;
  onLeave: () => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.note} numberOfLines={1}>
          {item.tx.note}
        </Text>
        <MoneyText style={styles.amount}>{amount}</MoneyText>
      </View>
      <Text style={styles.meta}>
        {date} · {t('review.from', { category: item.from })}
      </Text>
      <Text style={styles.to}>→ {t('review.to', { category: item.to })}</Text>
      <View style={styles.actions}>
        <SelectPressable onPress={onLeave} disabled={busy} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>{t('review.leave')}</Text>
        </SelectPressable>
        <SelectPressable onPress={onMove} disabled={busy} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>
            {t(item.creates ? 'review.createMove' : 'review.move')}
          </Text>
        </SelectPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkMuted,
  },
  moveAll: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.accentDeep,
  },
  moveAllText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
    gap: 4,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  note: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  amount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
  to: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.success,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.ink,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  more: { alignSelf: 'center', paddingVertical: 6 },
  moreText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.accentDeep,
  },
});
