import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { KeyboardSafeOverlay } from '@/src/components/KeyboardSafe';

import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { appAlert } from '@/src/components/AppAlert';

/** Soft prompt for users who finished onboarding before names existed. */
export function NamePromptOverlay() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { settings, ready, updateUserName } = useSettings();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const visible =
    ready && settings.onboardingDone && !settings.userName.trim();

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      appAlert(t('onboard.nameTitle'), t('onboard.nameNeed'));
      return;
    }
    setSaving(true);
    try {
      await updateUserName(trimmed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal visible={visible} animationType="fade" transparent>
      <KeyboardSafeOverlay>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}>
        <Animated.View entering={FadeInDown.springify()} style={styles.sheet}>
          <Text style={styles.title}>{t('onboard.nameTitle')}</Text>
          <Text style={styles.copy}>{t('onboard.nameBody')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('onboard.namePlaceholder')}
            placeholderTextColor={palette.inkSoft}
            autoCapitalize="words"
            autoFocus
            maxLength={40}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={[styles.btn, saving && { opacity: 0.7 }]}>
            <Text style={styles.btnText}>{t('onboard.next')}</Text>
          </Pressable>
        </Animated.View>
      </View>
      </KeyboardSafeOverlay>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 22,
    gap: 12,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.ink,
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.inkMuted,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1.5,
    borderColor: palette.accent,
    backgroundColor: '#FFF8F4',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  btn: {
    marginTop: 4,
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.white,
  },
});
