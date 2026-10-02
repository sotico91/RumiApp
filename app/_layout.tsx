import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppLockOverlay } from '@/src/components/AppLockOverlay';
import { ModalHost } from '@/src/components/AppModal';
import { BootSplash } from '@/src/components/BootSplash';
import { CoachMarksOverlay } from '@/src/components/CoachMarksOverlay';
import { NamePromptOverlay } from '@/src/components/NamePromptOverlay';
import { OnboardingOverlay } from '@/src/components/OnboardingOverlay';
import { HabitPilotHygiene } from '@/src/components/HabitPilotHygiene';
import { AntSpendTipHygiene } from '@/src/components/AntSpendTipHygiene';
import { ReminderDeepLink } from '@/src/components/ReminderDeepLink';
import { ReminderHygiene } from '@/src/components/ReminderHygiene';
import { HowToGuideProvider } from '@/src/hooks/useHowToGuide';
import { AmountPrivacyProvider } from '@/src/hooks/useAmountPrivacy';
import { ExpensesProvider } from '@/src/hooks/useExpenses';
import { SettingsProvider } from '@/src/hooks/useSettings';
import { LanguageProvider, useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { startBadgeClearOnActive } from '@/src/utils/notifications';
import { prepareSelectFeedback } from '@/src/utils/selectFeedback';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: false, duration: 0 });

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded || !bootDone) return;
    prepareSelectFeedback();
    return startBadgeClearOnActive();
  }, [loaded, bootDone]);

  // Native splash stays until fonts are ready, then BootSplash takes over.
  if (!loaded) {
    return null;
  }

  // Only the animated mark — do not mount Home underneath or the wink is lost.
  if (!bootDone) {
    return (
      <View style={styles.bootRoot}>
        <BootSplash onDone={() => setBootDone(true)} />
      </View>
    );
  }

  return (
    <View style={styles.appRoot}>
      <LanguageProvider>
        <SettingsProvider>
          <AmountPrivacyProvider>
            <ExpensesProvider>
              <ModalHost>
                <HowToGuideProvider>
                  <StatusBar style="light" />
                  <RootNavigator />
                  <ReminderHygiene />
                  <HabitPilotHygiene />
                  <AntSpendTipHygiene />
                  <ReminderDeepLink />
                  <OnboardingOverlay />
                  <NamePromptOverlay />
                  <CoachMarksOverlay />
                  <AppLockOverlay />
                </HowToGuideProvider>
              </ModalHost>
            </ExpensesProvider>
          </AmountPrivacyProvider>
        </SettingsProvider>
      </LanguageProvider>
    </View>
  );
}

function RootNavigator() {
  const { t } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.white,
        headerTitleStyle: {
          fontFamily: 'DMSans_600SemiBold',
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="agregar"
        options={{
          presentation: 'modal',
          title: t('add.title'),
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="privacidad"
        options={{
          presentation: 'modal',
          title: t('about.privacyPolicy'),
          headerLargeTitle: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  bootRoot: {
    flex: 1,
    backgroundColor: '#F3E6D8',
  },
  appRoot: {
    flex: 1,
    backgroundColor: palette.bg,
  },
});
