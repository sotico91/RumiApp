import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors } from '@/src/theme';
import { tapFeedback } from '@/src/utils/selectFeedback';

const COPYRIGHT_YEAR = 2026;
const DEVELOPER = 'Sotico91';
const APP_VERSION = Constants.expoConfig?.version ?? '';

/** Footer credit + copyright for settings-style screens. */
export function AppCopyright() {
  const { t } = useLanguage();

  function openPrivacy() {
    tapFeedback();
    router.push('/privacidad');
  }

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.developed}>
        {t('about.developedBy', { name: DEVELOPER })}
      </Text>
      <Text style={styles.copy}>
        {t('about.copyright', { year: COPYRIGHT_YEAR, name: DEVELOPER })}
      </Text>
      <Text style={styles.rights}>{t('about.allRights')}</Text>
      {APP_VERSION ? (
        <Text style={styles.version}>{t('about.version', { version: APP_VERSION })}</Text>
      ) : null}
      <Pressable onPress={openPrivacy} hitSlop={8} style={styles.privacyBtn}>
        <Text style={styles.privacy}>{t('about.privacyPolicy')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  developed: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  rights: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    opacity: 0.85,
  },
  version: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    opacity: 0.6,
    letterSpacing: 0.4,
  },
  privacyBtn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  privacy: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.action.primary,
    textAlign: 'center',
  },
});
