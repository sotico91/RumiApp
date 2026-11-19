import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { MoneyText } from '@/src/components/MoneyText';
import { findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, scale } from '@/src/theme/tokens';
import type { Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { filterBetween, periodEnd, periodStart } from '@/src/utils/financeMath';
import { buildMosaic, OTHERS_ID, readableTextOn, shade, squarify, type MosaicTile } from '@/src/utils/mosaic';
import { tapFeedback } from '@/src/utils/selectFeedback';

const HEIGHT = 250;
const GAP = 6;
const OTHERS_COLOR = scale.ink[500];
const CREAM = scale.cream[50];
const CREAM_MUTED = 'rgba(251,247,241,0.72)';

type Props = {
  transactions: Transaction[];
  spendConcepts: SpendConcept[];
  debts?: Pick<Debt, 'id' | 'kind'>[];
};

/**
 * "Where does your money go?": the month's spending as a mosaic, each category
 * a block sized by its share, with a legend that keeps the small ones readable.
 * Tapping a block (or its legend chip) opens its subcategories and how it moved
 * against the same days of last month.
 */
export function SpendMosaic({ transactions, spendConcepts, debts = [] }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Back on the tab, start clean: an old pick would leave the mosaic half open.
  useFocusEffect(useCallback(() => () => setSelectedId(null), []));

  const { tiles, total } = useMemo(
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
  const pick = (id: string) => {
    tapFeedback();
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const top = tiles[0];
  const topDelta = top.deltaPoints != null ? Math.round(top.deltaPoints) : null;
  const selected = tiles.find((tile) => tile.id === selectedId) ?? null;
  const upColor = colors.text.onBrandDanger;
  const downColor = colors.text.onBrandSuccess;

  return (
    <LinearGradient
      colors={[scale.petrol[700], scale.petrol[900]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.card}>
      <Text style={styles.eyebrow}>{t('mosaic.title')}</Text>
      <View style={styles.hero}>
        <MoneyText style={styles.total}>{format(total)}</MoneyText>
        <Text style={styles.totalLabel}>{t('mosaic.totalLabel')}</Text>
      </View>
      <Text style={styles.headline}>
        {t('mosaic.headline', { category: nameOf(top), percent: pct(top.percent) })}
      </Text>
      {topDelta != null && Math.abs(topDelta) >= 1 ? (
        <View style={[styles.chip, topDelta > 0 ? styles.chipUp : styles.chipDown]}>
          <MaterialCommunityIcons
            name={topDelta > 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
            size={14}
            color={topDelta > 0 ? upColor : downColor}
          />
          <Text style={[styles.chipText, { color: topDelta > 0 ? upColor : downColor }]}>
            {t(topDelta > 0 ? 'mosaic.chipUp' : 'mosaic.chipDown', { category: nameOf(top), points: Math.abs(topDelta) })}
          </Text>
        </View>
      ) : null}

      <View style={styles.box} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0
          ? tiles.map((tile, i) => {
              const r = rects[i];
              if (!r) return null;
              const base = colorOf(tile);
              const ink = readableTextOn(base);
              const w = r.w - GAP;
              const h = r.h - GAP;
              const roomy = w >= 110 && h >= 96;
              const showName = w >= 72 && h >= 58;
              const isOn = tile.id === selectedId;
              return (
                <Animated.View
                  key={tile.id}
                  entering={FadeIn.delay(i * 60).duration(300)}
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
                    onPress={() => pick(tile.id)}
                    style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
                    <LinearGradient
                      colors={[shade(base, 0.18), base, shade(base, -0.12)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.tile, isOn && styles.tileOn]}>
                      {roomy ? (
                        <View style={styles.tileTop}>
                          <View style={styles.iconBadge}>
                            {tile.id === OTHERS_ID ? (
                              <MaterialCommunityIcons name="dots-horizontal" size={16} color={ink} />
                            ) : (
                              <ConceptIcon icon={tile.concept?.icon} color={ink} size={16} />
                            )}
                          </View>
                          {tile.hasAnt ? <Text style={styles.ant}>🐜</Text> : null}
                        </View>
                      ) : null}
                      <View style={styles.tileBottom}>
                        <Text
                          style={[styles.percent, { color: ink }, !showName && styles.percentSmall]}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {pct(tile.percent)}%
                        </Text>
                        {showName ? (
                          <Text style={[styles.tileName, { color: ink }]} numberOfLines={1}>
                            {nameOf(tile)}
                          </Text>
                        ) : null}
                        {roomy ? (
                          <MoneyText style={[styles.tileAmount, { color: ink }]}>
                            {format(tile.total)}
                          </MoneyText>
                        ) : null}
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })
          : null}
      </View>

      {/* Every category by name, so the small blocks are readable too. */}
      <View style={styles.legend}>
        {tiles.map((tile) => {
          const isOn = tile.id === selectedId;
          return (
            <Pressable
              key={tile.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              onPress={() => pick(tile.id)}
              style={[styles.legendChip, isOn && styles.legendChipOn]}>
              <View style={[styles.legendDot, { backgroundColor: colorOf(tile) }]} />
              <Text style={styles.legendName} numberOfLines={1}>
                {nameOf(tile)}
              </Text>
              <Text style={styles.legendPct}>{pct(tile.percent)}%</Text>
            </Pressable>
          );
        })}
      </View>

      {selected ? (
        <Animated.View entering={FadeInDown.duration(240)} style={styles.detail}>
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
    </LinearGradient>
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
    borderRadius: 24,
    padding: 18,
    gap: 10,
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: scale.gold[400],
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  total: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    color: CREAM,
  },
  totalLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: CREAM_MUTED,
  },
  headline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 21,
    color: CREAM,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipUp: { backgroundColor: 'rgba(255,180,168,0.14)' },
  chipDown: { backgroundColor: 'rgba(125,255,200,0.12)' },
  chipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
  box: {
    height: HEIGHT,
    position: 'relative',
    marginTop: 6,
  },
  tileWrap: {
    position: 'absolute',
  },
  pressable: {
    flex: 1,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tileOn: {
    borderWidth: 2.5,
    borderColor: CREAM,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  ant: {
    fontSize: 14,
  },
  tileBottom: {
    marginTop: 'auto',
  },
  percent: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
  },
  percentSmall: {
    fontSize: 16,
  },
  tileName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  tileAmount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    opacity: 0.85,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    maxWidth: '100%',
  },
  legendChipOn: {
    borderColor: CREAM,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: CREAM,
    flexShrink: 1,
  },
  legendPct: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: CREAM_MUTED,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: CREAM_MUTED,
  },
  detail: {
    gap: 8,
    marginTop: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
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
    color: CREAM,
  },
  detailAmount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: CREAM,
  },
  detailMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: CREAM_MUTED,
  },
  parts: {
    gap: 9,
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
    color: CREAM,
  },
  partTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  partFill: {
    height: '100%',
    borderRadius: 999,
  },
  partAmount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: CREAM,
    minWidth: 72,
    textAlign: 'right',
  },
});
