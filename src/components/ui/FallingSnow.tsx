import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { isChristmasSeason } from '@/src/utils/season';

/** Fixed flakes (left %, size px, fall ms, start offset) so every launch matches. */
const FLAKES: [number, number, number, number][] = [
  [4, 7, 2600, 0], [11, 5, 3200, 500], [18, 9, 2400, 200], [25, 6, 3000, 900],
  [32, 8, 2700, 300], [39, 5, 3400, 0], [46, 10, 2500, 700], [53, 6, 3100, 100],
  [60, 8, 2600, 1000], [67, 5, 3300, 400], [74, 9, 2400, 600], [81, 6, 2900, 0],
  [88, 8, 2700, 800], [95, 5, 3200, 300], [8, 6, 2800, 1200], [22, 5, 3000, 1400],
  [36, 7, 2500, 1100], [50, 5, 3300, 1300], [64, 7, 2700, 1500], [78, 5, 3100, 1200],
  [92, 7, 2600, 1000], [15, 8, 2900, 1700], [43, 6, 2800, 1800], [71, 8, 3000, 1600],
];

function Flake({ left, size, duration, delay, height }: {
  left: number; size: number; duration: number; delay: number; height: number;
}) {
  const fall = useSharedValue(0);
  useEffect(() => {
    // Start part-way down so the screen is already snowing on the first frame.
    const phase = (delay / 2000) % 1;
    fall.value = phase;
    fall.value = withSequence(
      withTiming(1, { duration: (1 - phase) * duration, easing: Easing.linear }),
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration, easing: Easing.linear })
        ),
        -1,
        false
      )
    );
  }, [delay, duration, fall]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -size * 2 + fall.value * (height + size * 4) },
      // A slow sway so flakes drift instead of dropping straight.
      { translateX: Math.sin(fall.value * Math.PI * 2) * 10 },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.flake,
        { left: `${left}%`, width: size * 1.4, height: size * 1.4, borderRadius: (size * 1.4) / 2 },
        style,
      ]}
    />
  );
}

/**
 * Snow falling over the whole parent, only in the Christmas season.
 * Purely decorative: no touches, hidden from screen readers.
 */
export function FallingSnow() {
  const { height } = useWindowDimensions();
  if (!isChristmasSeason()) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {FLAKES.map(([left, size, duration, delay], i) => (
        <Flake key={i} left={left} size={size} duration={duration} delay={delay} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flake: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#FFFFFF',
    // White on cream needs a faint edge to read.
    borderWidth: 1,
    borderColor: 'rgba(29,58,76,0.10)',
  },
});
