import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInBlock } from '@/src/components/FadeInBlock';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { colors, radius, scale, space } from '@/src/theme';

type Props = {
  /** Drawn on petrol: titles, toggles, the hero amount. */
  header: ReactNode;
  /** Drawn on cream. Children that render nothing take no gap. */
  children: ReactNode;
  /** Gap between body blocks. */
  gap?: number;
  /** Rendered outside the scroll (sheets, modals). */
  overlay?: ReactNode;
};

/**
 * Tab screen layout: a petrol header with rounded bottom corners scrolls away
 * over a cream body. Owns the safe-area top, the status-bar band and the
 * room left for the tab bar and floating buttons.
 */
export function BrandScreen({ header, children, gap = space.xl, overlay }: Props) {
  const insets = useSafeAreaInsets();
  // The petrol status band only shows once the header has scrolled under it.
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={styles.root}>
      <KeyboardSafeScroll
        style={styles.screen}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const next = e.nativeEvent.contentOffset.y > space.xs;
          if (next !== scrolled) setScrolled(next);
        }}
        showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          {/* Pulling down past the top (iOS bounce) shows petrol, not cream. */}
          <View style={styles.overscroll} />
          <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
            <LinearGradient
              colors={[scale.petrol[700], scale.petrol[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {header}
          </View>
        </FadeInBlock>

        <FadeInBlock index={1}>
          <View style={[styles.body, { gap }]}>{children}</View>
        </FadeInBlock>
      </KeyboardSafeScroll>

      {/* Keeps the light status bar readable once the header scrolls away. */}
      {scrolled ? <View style={[styles.statusBand, { height: insets.top }]} /> : null}

      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  screen: { flex: 1 },
  // Clears the tab bar and the floating eye / add buttons.
  content: { paddingBottom: 168 },
  overscroll: {
    position: 'absolute',
    top: -1000,
    height: 1000,
    left: 0,
    right: 0,
    backgroundColor: scale.petrol[700],
  },
  header: {
    paddingHorizontal: space.gutter,
    paddingBottom: space.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    gap: space.lg,
  },
  body: {
    paddingHorizontal: space.gutter,
    paddingTop: space.xl,
  },
  statusBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: scale.petrol[700],
  },
});
