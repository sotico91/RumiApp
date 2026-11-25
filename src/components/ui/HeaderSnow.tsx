import { StyleSheet, View } from 'react-native';

import { isChristmasSeason } from '@/src/utils/season';

/** Fixed flakes (left %, top %, size px) so every header looks the same. */
const FLAKES: [number, number, number][] = [
  [4, 18, 4], [13, 62, 3], [21, 30, 5], [30, 80, 3], [38, 12, 3], [46, 52, 4],
  [55, 24, 3], [63, 70, 5], [71, 14, 4], [79, 46, 3], [87, 22, 5], [94, 64, 3],
  [9, 88, 3], [50, 90, 3], [68, 40, 3], [26, 50, 2], [83, 84, 4], [42, 34, 2],
];

/**
 * Soft snow dots behind a petrol header, only in the Christmas season.
 * Purely decorative: no touches, hidden from screen readers.
 */
export function HeaderSnow() {
  if (!isChristmasSeason()) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {FLAKES.map(([left, top, size], i) => (
        <View
          key={i}
          style={[
            styles.flake,
            {
              left: `${left}%`,
              top: `${top}%`,
              width: size + 2,
              height: size + 2,
              borderRadius: (size + 2) / 2,
              opacity: size >= 4 ? 0.38 : 0.26,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flake: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
});
