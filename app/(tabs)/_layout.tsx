import { AppSymbol } from '@/src/components/AppSymbol';
import { Tabs } from 'expo-router';

import { RumiTabBar } from '@/src/components/RumiTabBar';
import { colors } from '@/src/theme';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { tapFeedback } from '@/src/utils/selectFeedback';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      tabBar={(props) => <RumiTabBar {...props} />}
      screenListeners={{
        tabPress: () => {
          tapFeedback();
        },
      }}
      screenOptions={{
        headerShown: false,
        // Cream behind every tab while it mounts, instead of the petrol
        // navigation background flashing through on first open.
        sceneStyle: { backgroundColor: colors.bg.screen },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => (
            <AppSymbol ios="house.fill" android="home-outline" web="home" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => (
            <AppSymbol ios="list.bullet" android="format-list-bulleted" web="list" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('tabs.plan'),
          tabBarIcon: ({ color }) => (
            <AppSymbol ios="target" android="flag-outline" web="flag" color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="wealth"
        options={{
          title: t('tabs.wealth'),
          tabBarIcon: ({ color }) => (
            <AppSymbol
              ios="building.columns.fill"
              android="bank-outline"
              web="account_balance"
              color={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('tabs.insights'),
          tabBarIcon: ({ color }) => (
            <AppSymbol
              ios="chart.bar.fill"
              android="chart-bar"
              web="bar_chart"
              color={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
