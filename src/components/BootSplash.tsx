import { useCallback, useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** Same cream as the native Expo splash (app.json) — iOS + Android. */
const SPLASH_BG = '#F3E6D8';
const LOGO = 188;
const PX = LOGO / 1024;
/** splash-icon.png navy peeks (centroids measured on 1024²). */
const EYE = 26;
const LEFT_EYE = { left: 270.2 * PX - EYE / 2, top: 650.9 * PX - EYE / 2 };
const RIGHT_EYE = { left: 728.1 * PX - EYE / 2, top: 367.9 * PX - EYE / 2 };
/** The smile is the bottom arc of this circle. */
const SMILE = 58;
const SMILE_STROKE = 4.5;
/** Visible hold before fading into the app. */
export const BOOT_HOLD_MS = 2200;

type Props = {
  onDone: () => void;
};

/**
 * Launch screen for iOS and Android: Rumi pops in, winks one eye, smiles, then
 * the app mounts. Native splash stays until this view starts animating.
 */
export function BootSplash({ onDone }: Props) {
  const finished = useRef(false);
  const started = useRef(false);
  const screen = useSharedValue(1);
  const pop = useSharedValue(0.88);
  const eyes = useSharedValue(0);
  const wink = useSharedValue(1);
  const smile = useSharedValue(0);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const play = useCallback(() => {
    if (started.current) return;
    started.current = true;

    void SplashScreen.hideAsync();

    pop.value = withSpring(1, { damping: 11, stiffness: 150 });
    eyes.value = withDelay(120, withTiming(1, { duration: 200 }));
    // Right eye winks (upper navy peek)
    wink.value = withDelay(
      420,
      withSequence(
        withTiming(0.08, { duration: 90, easing: Easing.in(Easing.cubic) }),
        withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 180 }),
        withTiming(0.08, { duration: 80, easing: Easing.in(Easing.cubic) }),
        withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) })
      )
    );
    // Smile grows under the mark
    smile.value = withDelay(
      700,
      withSequence(
        withSpring(1, { damping: 10, stiffness: 180 }),
        withTiming(1, { duration: 700 }),
        withTiming(0.85, { duration: 200 })
      )
    );
    screen.value = withDelay(
      BOOT_HOLD_MS - 300,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }, (ok) => {
        if (ok) runOnJS(finish)();
      })
    );
  }, [eyes, finish, pop, screen, smile, wink]);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) play();
      });
    });
    const fallback = setTimeout(() => {
      void SplashScreen.hideAsync();
      finish();
    }, BOOT_HOLD_MS + 700);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      clearTimeout(fallback);
    };
  }, [finish, play]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screen.value,
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const eyesStyle = useAnimatedStyle(() => ({
    opacity: eyes.value,
  }));

  const winkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: wink.value }],
  }));

  const smileStyle = useAnimatedStyle(() => ({
    opacity: smile.value,
    transform: [
      { scaleX: 0.4 + smile.value * 0.6 },
      { scaleY: smile.value },
      { translateY: (1 - smile.value) * 8 },
    ],
  }));

  return (
    <Animated.View style={[styles.screen, screenStyle]} pointerEvents="box-only">
      <StatusBar style="dark" />
      <Animated.View style={[styles.mark, markStyle]}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View style={[StyleSheet.absoluteFill, eyesStyle]} pointerEvents="none">
          <View style={[styles.eye, LEFT_EYE]}>
            <View style={[styles.pupil, styles.pupilLeft]} />
          </View>
          <Animated.View style={[styles.eye, RIGHT_EYE, winkStyle]}>
            <View style={[styles.pupil, styles.pupilRight]} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.smileWrap, smileStyle]} pointerEvents="none">
          <View style={styles.smile} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: LOGO,
    height: LOGO,
    alignItems: 'center',
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
  eye: {
    position: 'absolute',
    width: EYE,
    height: EYE,
    borderRadius: EYE / 2,
    backgroundColor: '#FFFDF8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#061018',
        shadowOpacity: 0.18,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pupil: {
    width: EYE * 0.48,
    height: EYE * 0.48,
    borderRadius: EYE,
    backgroundColor: '#1B3A4B',
  },
  pupilLeft: {
    transform: [{ translateX: 1.5 }, { translateY: -1 }],
  },
  pupilRight: {
    transform: [{ translateX: -1.5 }, { translateY: 1 }],
  },
  smileWrap: {
    position: 'absolute',
    bottom: LOGO * 0.14,
    width: SMILE,
    height: SMILE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Only the bottom border is coloured: a round arc whose ends taper to a
  // point, with no top edge left to draw (the old open box showed a line there).
  smile: {
    width: SMILE,
    height: SMILE,
    borderRadius: SMILE / 2,
    borderWidth: SMILE_STROKE,
    borderColor: 'transparent',
    borderBottomColor: '#1B3A4B',
    backgroundColor: 'transparent',
  },
});
