import { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
const LOGO = 220;
const PX = LOGO / 1024;
/**
 * Rumi's face on the coral bill's seal, in splash-icon.png pixels (1024²).
 * Matches the face on the app icon (scripts/generate-papel-icon.swift).
 */
const SEAL = { x: 551.7, y: 595.8 };
const EYE = 30 * PX;
const LEFT_EYE = { left: (SEAL.x - 33.8) * PX - EYE / 2, top: (SEAL.y - 17.5) * PX - EYE / 2 };
const RIGHT_EYE = { left: (SEAL.x + 33.8) * PX - EYE / 2, top: (SEAL.y - 17.5) * PX - EYE / 2 };
/** The smile is the bottom arc of this circle. */
const SMILE_RADIUS = 60;
const SMILE = SMILE_RADIUS * 2 * PX;
const SMILE_STROKE = 15 * PX;
const SMILE_BOX = {
  left: (SEAL.x - SMILE_RADIUS) * PX,
  top: (SEAL.y + 42.5 - SMILE_RADIUS * 2) * PX,
};
const FACE = '#1D3A4C';
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
    // Right eye winks
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
    // Smile grows on the seal
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
      { translateY: (1 - smile.value) * 3 },
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
          <View style={[styles.eye, LEFT_EYE]} />
          <Animated.View style={[styles.eye, RIGHT_EYE, winkStyle]} />
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
    backgroundColor: FACE,
  },
  smileWrap: {
    position: 'absolute',
    ...SMILE_BOX,
    width: SMILE,
    height: SMILE,
  },
  // Only the bottom border is coloured: a round arc whose ends taper to a
  // point, with no top edge left to draw (the old open box showed a line there).
  smile: {
    width: SMILE,
    height: SMILE,
    borderRadius: SMILE / 2,
    borderWidth: SMILE_STROKE,
    borderColor: 'transparent',
    borderBottomColor: FACE,
    backgroundColor: 'transparent',
  },
});
