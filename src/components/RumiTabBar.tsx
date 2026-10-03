import { router, type Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Fragment, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, radius, shadow, space, type } from '@/src/theme';
import { tapFeedback } from '@/src/utils/selectFeedback';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Tabs before the Add button; the rest go after it. */
const ADD_AFTER = 2;
const BAR_HEIGHT = 64;
const ADD_SIZE = 56;
/** How far the Add button rises above the bar. */
const ADD_LIFT = 18;

/** Where the Add button sits on screen, for the coach mark that points at it. */
export function addButtonFrame(screenWidth: number, bottomInset: number) {
  const slots = 6;
  const centerX = (screenWidth / slots) * (ADD_AFTER + 0.5);
  const bottom = tabBarBottomPadding(bottomInset) + BAR_HEIGHT + ADD_LIFT - ADD_SIZE;
  return { centerX, bottom, size: ADD_SIZE };
}

function tabBarBottomPadding(bottomInset: number) {
  return Math.max(bottomInset, space.xs);
}

/**
 * Light tab bar with Add in the middle. Replaces the floating ◎ button, so
 * nothing floats over the screens any more.
 */
export function RumiTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
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
          <Fragment key={route.key}>
            {index === ADD_AFTER ? <AddSlot label={t('fab.add')} /> : null}
            <Pressable
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
          </Fragment>
        );
      })}
    </View>
  );
}

function AddSlot({ label }: { label: string }) {
  return (
    <View style={styles.tab}>
      <Pressable
        onPress={() => {
          tapFeedback();
          router.push('/agregar');
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          tintColor={colors.text.onAction}
          size={28}
          weight="semibold"
        />
      </Pressable>
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
  add: {
    position: 'absolute',
    top: -ADD_LIFT,
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.action.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg.surface,
    ...shadow.e2,
  },
  addPressed: {
    backgroundColor: colors.action.primaryPressed,
    transform: [{ scale: 0.96 }],
  },
});
