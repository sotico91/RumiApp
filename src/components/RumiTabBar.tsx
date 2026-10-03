import { type Tabs } from 'expo-router';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { colors, radius, shadow, space, type } from '@/src/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_HEIGHT = 64;

function tabBarBottomPadding(bottomInset: number) {
  return Math.max(bottomInset, space.xs);
}

/** Full height of the bar, so things floating above it (Home's +) can sit clear. */
export function tabBarHeight(bottomInset: number) {
  return BAR_HEIGHT + tabBarBottomPadding(bottomInset);
}

/** Light tab bar: five even tabs, the active one on a soft petrol pill. */
export function RumiTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  if (keyboardVisible) return null;

  return (
    <View style={[styles.bar, { paddingBottom: tabBarBottomPadding(insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? colors.action.secondary : colors.text.tertiary;
        const label = typeof options.title === 'string' ? options.title : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}>
            {/* Keyed by state: Android drops the corners when the background
                changes on an existing view, so the pill is drawn fresh. */}
            <View
              key={focused ? 'on' : 'off'}
              style={[styles.iconPill, focused && styles.iconPillOn]}>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
            </View>
            <Text numberOfLines={1} style={[styles.label, { color }, focused && styles.labelOn]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    ...shadow.e2,
  },
  tab: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 52,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillOn: {
    backgroundColor: 'rgba(27,58,75,0.08)',
  },
  label: {
    ...type.caption,
    fontFamily: type.overline.fontFamily,
    fontSize: 11,
    lineHeight: 14,
  },
  labelOn: {
    fontFamily: type.title.fontFamily,
  },
});
