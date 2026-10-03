import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '@/src/theme';

/** Shrink slightly while held; stays still when the OS asks for reduced motion. */
export function usePressScale() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return {
    style,
    pressIn: () => {
      if (!reduceMotion) scale.value = withSpring(motion.pressScale, motion.spring.snappy);
    },
    pressOut: () => {
      scale.value = withSpring(1, motion.spring.snappy);
    },
  };
}
