import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/src/components/ui';
import { colors, radius, space } from '@/src/theme';

type Props = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body: string;
  /** One clear next step; omit when there is nothing to do here. */
  action?: { label: string; onPress: () => void };
};

/** Empty screen or section: says what will show up here and how to get it. */
export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={28} color={colors.action.secondary} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText color="secondary" align="center" style={styles.body}>
        {body}
      </AppText>
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    gap: space.xs,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surfaceMuted,
    marginBottom: space.xs,
  },
  body: { maxWidth: 300 },
  action: { marginTop: space.md },
});
