import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { MoneyText } from '@/src/components/MoneyText';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { filterBetween, periodEnd, periodStart } from '@/src/utils/financeMath';
import { buildMosaic, OTHERS_ID, readableTextOn, squarify, type MosaicTile } from '@/src/utils/mosaic';
import { tapFeedback } from '@/src/utils/selectFeedback';

const HEIGHT = 232;
const GAP = 3;
const OTHERS_COLOR = '#7A8790';

type Props = {
  transactions: Transaction[];
  spendConcepts: SpendConcept[];
  debts?: Pick<Debt, 'id' | 'kind'>[];
};

/**
 * "Where does your money go?": the month's spending as a mosaic, each category
 * a block sized by its share. Tapping one opens its subcategories and how it
 * moved against the same days of last month.
 */
export function SpendMosaic({ transactions, spendConcepts, debts = [] }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { tiles } = useMemo(
    () => buildMosaic(transactions, spendConcepts, debts),
    [transactions, spendConcepts, debts]
  );
  const rects = useMemo(
    () => squarify(tiles.map((tile) => tile.total), width, HEIGHT),
    [tiles, width]
  );

  if (tiles.length === 0) return null;

  const nameOf = (tile: MosaicTile) =>
    tile.id === OTHERS_ID ? t('mosaic.others') : categoryLabel(tile.id, t, spendConcepts);
  const colorOf = (tile: MosaicTile) => (tile.id === OTHERS_ID ? OTHERS_COLOR : tile.concept?.color ?? OTHERS_COLOR);
  const pct = (n: number) => Math.round(n);

  const top = tiles[0];
  const topDelta = top.deltaPoints != null ? Math.round(top.deltaPoints) : null;
  const headline =
    topDelta && Math.abs(topDelta) >= 1
      ? t(topDelta > 0 ? 'mosaic.headlineUp' : 'mosaic.headlineDown', {
          category: nameOf(top),
          percent: pct(top.percent),
          points: Math.abs(topDelta),
        })
      : t('mosaic.headline', { category: nameOf(top), percent: pct(top.percent) });

  const selected = tiles.find((tile) => tile.id === selectedId) ?? null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('mosaic.title')}</Text>
      <Text style={styles.headline}>{headline}</Text>

      <View
        style={styles.box}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="summary">
        {width > 0
          ? tiles.map((tile, i) => {
              const r = rects[i];
              if (!r) return null;
              const bg = colorOf(tile);
              const ink = readableTextOn(bg);
              const w = r.w - GAP;
              const h = r.h - GAP;
              const roomy = w >= 84 && h >= 70;
              const showName = w >= 64 && h >= 46;
              const isOn = tile.id === selectedId;
              const dim = selectedId != null && !isOn;
              return (
                <Animated.View
                  key={tile.id}
                  entering={FadeIn.delay(i * 70).duration(320)}
                  style={[styles.tileWrap, { left: r.x, top: r.y, width: w, height: h }]}>
                  <Pressable
                    testID={`mosaic-${tile.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}
                    accessibilityLabel={t('mosaic.tileA11y', {
                      category: nameOf(tile),
                      percent: pct(tile.percent),
                      amount: format(tile.total),
                    })}
                    onPress={() => {
                      tapFeedback();
                      setSelectedId(isOn ? null : tile.id);
                    }}
                    style={[
                      styles.tile,
                      { backgroundColor: bg, opacity: dim ? 0.45 : 1 },
                      isOn && styles.tileOn,
                    ]}>
                    {roomy ? (
                      <View style={styles.tileTop}>
                        {tile.concept?.icon ? (
                          <ConceptIcon icon={tile.concept.icon} color={ink} size={18} />
                        ) : (
                          <View />
                        )}
                        {tile.hasAnt ? <Text style={styles.ant}>🐜</Text> : null}
                      </View>
                    ) : null}
                    <View style={styles.tileBottom}>
                      <Text style={[styles.percent, { color: ink }, !showName && styles.percentSmall]} numberOfLines={1}>
                        {pct(tile.percent)}%
                      </Text>
                      {showName ? (
                        <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
                          {nameOf(tile)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })
          : null}
      </View>

      {selected ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.detail}>
          <MosaicDetail
            tile={selected}
            name={nameOf(selected)}
            color={colorOf(selected)}
            transactions={transactions}
            spendConcepts={spendConcepts}
            nameOf={nameOf}
          />
        </Animated.View>
      ) : (
        <Text style={styles.hint}>{t('mosaic.hint')}</Text>
      )}
    </View>
  );
}

function MosaicDetail({
  tile,
  name,
  color,
  transactions,
  spendConcepts,
  nameOf,
}: {
  tile: MosaicTile;
  name: string;
  color: string;
  transactions: Transaction[];
  spendConcepts: SpendConcept[];
  nameOf: (tile: MosaicTile) => string;
}) {
  const { t } = useLanguage();
  const { format } = useMoney();

  // Inside the tile: its subcategories, or the small categories folded into "Others".
  const parts = useMemo(() => {
    if (tile.others) {
      return tile.others.map((o) => ({ id: o.id, label: nameOf(o), total: o.total, color: o.concept?.color ?? color }));
    }
    const subIds = new Set((tile.concept?.subs ?? []).map((s) => s.id));
    const now = new Date();
    const month = filterBetween(transactions, periodStart('mes', now), periodEnd('mes', now));
    const map = new Map<string, number>();
    for (const tx of month) {
      if (tx.type !== 'expense' && tx.type !== 'debt_payment') continue;
      const id = tx.categoryId ?? '';
      if (!(subIds.has(id) || id === tile.id)) continue;
      map.set(id, (map.get(id) ?? 0) + tx.amount);
    }
    return [...map.entries()]
      .map(([id, total]) => {
        // The category is named above: a row only needs the subcategory's own name.
        const hit = findSpendSub(spendConcepts, id);
        const label = hit && !isGeneralSubName(hit.sub.name) ? hit.sub.name : categoryLabel(id, t, spendConcepts);
        return { id, label, total, color };
      })
      .sort((a, b) => b.total - a.total);
  }, [tile, transactions, spendConcepts, color, nameOf, t]);

  const delta = tile.deltaPoints != null ? Math.round(tile.deltaPoints) : null;
  const max = Math.max(...parts.map((p) => p.total), 1);

  return (
    <>
      <View style={styles.detailHead}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
        <Text style={styles.detailName} numberOfLines={1}>
          {name}
        </Text>
        <MoneyText style={styles.detailAmount}>{format(tile.total)}</MoneyText>
      </View>
      <Text style={styles.detailMeta}>
        {t('mosaic.detailMeta', { percent: Math.round(tile.percent), count: tile.count })}
        {delta != null && Math.abs(delta) >= 1
          ? ` · ${t(delta > 0 ? 'mosaic.deltaUp' : 'mosaic.deltaDown', { points: Math.abs(delta) })}`
          : delta === 0
            ? ` · ${t('mosaic.deltaSame')}`
            : ''}
      </Text>
      {parts.length > 1 ? (
        <View style={styles.parts}>
          {parts.map((p) => (
            <View key={p.id} style={styles.partRow}>
              <Text style={styles.partLabel} numberOfLines={1}>
                {p.label}
              </Text>
              <View style={styles.partTrack}>
                <View style={[styles.partFill, { width: `${Math.max((p.total / max) * 100, 4)}%`, backgroundColor: p.color }]} />
              </View>
              <MoneyText style={styles.partAmount}>{format(p.total)}</MoneyText>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  headline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkMuted,
  },
  box: {
    height: HEIGHT,
    position: 'relative',
    marginTop: 2,
  },
  tileWrap: {
    position: 'absolute',
  },
  tile: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tileOn: {
    borderWidth: 2,
    borderColor: palette.ink,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileBottom: {
    marginTop: 'auto',
  },
  ant: {
    fontSize: 14,
  },
  percent: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
  },
  percentSmall: {
    fontSize: 13,
  },
  name: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
  },
  detail: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 10,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  detailName: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  detailAmount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 17,
    color: palette.ink,
  },
  detailMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  parts: {
    gap: 8,
    marginTop: 2,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partLabel: {
    width: 112,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.ink,
  },
  partTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,28,36,0.06)',
    overflow: 'hidden',
  },
  partFill: {
    height: '100%',
    borderRadius: 999,
  },
  partAmount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
    minWidth: 72,
    textAlign: 'right',
  },
});
