import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { appAlert } from '@/src/components/AppAlert';
import { AppModal } from '@/src/components/AppModal';
import { sheetStyles } from '@/src/components/ui/sheet';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { scale } from '@/src/theme';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { streakMilestone, type StreakState } from '@/src/utils/streak';

/** The story card is laid out at this size and saved at 3x (1080×1920). */
const CARD_W = 360;
const CARD_H = 640;

const ICON = require('../../assets/images/icon.png');
const QR = require('../../assets/images/qr-descargar.png');

/** A 9:16 image of the streak for Instagram, Facebook or WhatsApp stories. No amounts. */
export function StreakShareSheet({
  visible,
  onClose,
  streak,
}: {
  visible: boolean;
  onClose: () => void;
  streak: StreakState;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  // The preview fits about half the screen; the saved image keeps full size.
  const previewH = Math.min(CARD_H, Math.max(320, height * 0.56));
  const s = previewH / CARD_H;
  const milestone = streakMilestone(streak.current);

  async function share() {
    tapFeedback();
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: CARD_W * 3,
        height: CARD_H * 3,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          UTI: 'public.png',
          dialogTitle: t('streakShare.title'),
        });
      }
    } catch {
      appAlert(t('streakShare.title'), t('streakShare.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessible={false} style={sheetStyles.scrim} onPress={onClose}>
        <Pressable
          accessible={false}
          onPress={(e) => e.stopPropagation()}
          style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={sheetStyles.grabber} />
          <View style={sheetStyles.headerRow}>
            <Text style={sheetStyles.title}>{t('streakShare.title')}</Text>
          </View>
          <Text style={styles.hint}>{t('streakShare.hint')}</Text>

          <View style={[styles.previewBox, { width: CARD_W * s, height: CARD_H * s }]}>
            <View
              style={{
                width: CARD_W,
                height: CARD_H,
                transform: [
                  { translateX: -(CARD_W - CARD_W * s) / 2 },
                  { translateY: -(CARD_H - CARD_H * s) / 2 },
                  { scale: s },
                ],
              }}>
              <View ref={cardRef} collapsable={false} style={card.root} testID="streak-share-card">
                <Text style={card.kicker}>{t('streakShare.kicker')}</Text>
                <Image source={ICON} style={card.icon} />
                <Text style={card.number}>{streak.current}</Text>
                <Text style={card.unit}>{t('streakShare.unit', { count: streak.current })}</Text>
                <View style={card.week}>
                  {streak.week.map((day) => (
                    <View
                      key={day.key}
                      style={[
                        card.dot,
                        day.state === 'done' && card.dotDone,
                        day.state === 'frozen' && card.dotFrozen,
                      ]}>
                      {day.state === 'done' ? <Text style={card.dotMark}>✓</Text> : null}
                      {day.state === 'frozen' ? <Text style={card.dotIce}>🧊</Text> : null}
                    </View>
                  ))}
                </View>
                {milestone ? (
                  <View style={card.badge}>
                    <Text style={card.badgeText}>
                      {t(`streakShare.m${milestone}` as TranslationKey)}
                    </Text>
                  </View>
                ) : null}
                <View style={card.spacer} />
                <View style={card.footer}>
                  <Image source={QR} style={card.qr} />
                  <View style={card.footerText}>
                    <Text style={card.cta}>{t('streakShare.cta')}</Text>
                    <Text style={card.stores}>{t('streakShare.stores')}</Text>
                  </View>
                </View>
                <Text style={card.tagline}>{t('streakShare.tagline')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[sheetStyles.secondary, styles.flex]}>
              <Text style={sheetStyles.secondaryText}>{t('streakShare.close')}</Text>
            </Pressable>
            <Pressable
              testID="streak-share-go"
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void share()}
              style={[sheetStyles.primary, styles.flex, busy && { opacity: 0.7 }]}>
              <Text style={sheetStyles.primaryText}>{t('streakShare.share')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: scale.ink[700],
  },
  previewBox: {
    alignSelf: 'center',
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: scale.neutral[200],
  },
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  flex: { flex: 1 },
});

/** The saved image: brand cream, the coral bill and the streak, nothing personal. */
const card = StyleSheet.create({
  root: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: scale.cream[100],
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 26,
    // Stories put their reply bar over the bottom of the image.
    paddingBottom: 56,
  },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: scale.petrol[700],
  },
  icon: {
    width: 150,
    height: 150,
    marginTop: 6,
  },
  number: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 116,
    lineHeight: 124,
    color: scale.coral[500],
    marginTop: -10,
  },
  unit: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    color: scale.petrol[700],
  },
  week: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: scale.neutral[200],
    backgroundColor: scale.cream[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: scale.teal[400],
    borderColor: scale.teal[400],
  },
  dotFrozen: {
    backgroundColor: scale.teal[100],
    borderColor: scale.teal[100],
  },
  dotMark: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: scale.neutral[0],
  },
  dotIce: { fontSize: 13 },
  badge: {
    marginTop: 16,
    backgroundColor: scale.petrol[700],
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: scale.gold[400],
  },
  spacer: { flex: 1 },
  footer: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: scale.neutral[0],
    borderRadius: 18,
    padding: 12,
  },
  qr: {
    width: 74,
    height: 74,
  },
  footerText: { flex: 1, gap: 4 },
  cta: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: scale.ink[900],
  },
  stores: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: scale.ink[700],
  },
  tagline: {
    marginTop: 12,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: scale.petrol[700],
  },
});
