import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  title: string;
  /** Short line when collapsed (count, total, etc.). */
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Optional index for spacing consistency with FadeInBlock sections. */
  style?: object;
  /** `brand` for petrol backgrounds (default), `surface` for cream ones. */
  tone?: 'brand' | 'surface';
};

export function CollapsibleSection({
  title,
  summary,
  open,
  onToggle,
  children,
  style,
  tone = 'brand',
}: Props) {
  const surface = tone === 'surface';
  return (
    <View style={style}>
      <Pressable
        onPress={() => {
          tapFeedback();
          onToggle();
        }}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <View style={styles.headerText}>
          <Text style={[styles.title, surface && styles.titleSurface]}>{title}</Text>
          {!open && summary ? (
            <Text style={[styles.summary, surface && styles.mutedSurface]} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.chevron, surface && styles.mutedSurface]}>
          {open ? '▾' : '▸'}
        </Text>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.brand,
  },
  summary: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.brandMuted,
  },
  titleSurface: {
    color: colors.text.primary,
  },
  mutedSurface: {
    color: colors.text.tertiary,
  },
  chevron: {
    fontSize: 16,
    color: palette.brandMuted,
    paddingLeft: 4,
  },
  body: {
    marginTop: 8,
  },
});
