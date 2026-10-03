import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { RumiTabBar } from '@/src/components/RumiTabBar';
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
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="historial"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'list.bullet', android: 'list', web: 'list' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('tabs.plan'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'target', android: 'flag', web: 'flag' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wealth"
        options={{
          title: t('tabs.wealth'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'building.columns.fill',
                android: 'account_balance',
                web: 'account_balance',
              }}
              tintColor={color}
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
            <SymbolView
              name={{
                ios: 'chart.bar.fill',
                android: 'bar_chart',
                web: 'bar_chart',
              }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
