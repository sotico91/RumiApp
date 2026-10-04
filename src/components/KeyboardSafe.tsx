import { forwardRef, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useKeyboardHeight } from '@/src/hooks/useKeyboardVisible';

const GAP = 28;

type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

function scrollHost(scroll: ScrollView): Measurable {
  const native = (scroll as unknown as { getNativeScrollRef?: () => Measurable | null })
    .getNativeScrollRef?.();
  return native ?? (scroll as unknown as Measurable);
}

/**
 * Scrolls so the focused input sits above the keyboard and inside the scroll's
 * own frame. The frame matters for scrolls inside sheets or above a footer: a
 * field can clear the keyboard and still be clipped by the sheet's bottom edge.
 */
function liftFocusedInput(
  scroll: ScrollView | null,
  scrollY: number,
  keyboardHeight: number
) {
  if (!scroll || keyboardHeight <= 0) return;
  const focused = TextInput.State.currentlyFocusedInput?.();
  if (!focused || typeof focused.measureInWindow !== 'function') return;
  const host = scrollHost(scroll);
  const winH = Dimensions.get('window').height;

  const place = (frameTop: number, frameBottom: number) => {
    focused.measureInWindow((_x, y, _w, h) => {
      const top = frameTop + GAP / 2;
      const bottom = Math.min(frameBottom, winH - keyboardHeight) - GAP;
      let delta = 0;
      // Tall inputs (multiline) keep their top in view instead of their bottom.
      if (y + h > bottom) delta = Math.min(y + h - bottom, y - top);
      else if (y < top) delta = y - top;
      if (Math.abs(delta) < 1) return;
      scroll.scrollTo({ y: Math.max(0, scrollY + delta), animated: true });
    });
  };

  if (typeof host.measureInWindow !== 'function') {
    place(0, winH);
    return;
  }
  host.measureInWindow((_x, y, _w, h) => place(y, h > 0 ? y + h : winH));
}
type SafeScrollProps = ScrollViewProps & {
  /** When false, a parent overlay already lifts the keyboard. Still scrolls the focused field. */
  avoidKeyboard?: boolean;
};

export const KeyboardSafeScroll = forwardRef<ScrollView, SafeScrollProps>(
  function KeyboardSafeScroll(
    {
      avoidKeyboard = true,
      contentContainerStyle,
      onScroll,
      keyboardShouldPersistTaps,
      keyboardDismissMode,
      automaticallyAdjustKeyboardInsets,
      children,
      ...rest
    },
    ref
  ) {
    const keyboardHeight = useKeyboardHeight();
    const innerRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);

    const setRefs = useCallback(
      (node: ScrollView | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    const lift = useCallback(() => {
      liftFocusedInput(innerRef.current, scrollY.current, keyboardHeight);
    }, [keyboardHeight]);

    useEffect(() => {
      if (keyboardHeight <= 0) return;
      const t = setTimeout(lift, Platform.OS === 'android' ? 90 : 40);
      return () => clearTimeout(t);
    }, [keyboardHeight, lift]);

    useEffect(() => {
      const show = Keyboard.addListener('keyboardDidShow', () => {
        setTimeout(lift, Platform.OS === 'android' ? 90 : 40);
      });
      return () => show.remove();
    }, [lift]);

    // Moving to another field while the keyboard stays up fires no keyboard
    // event (always on Android), so a tap inside the scroll re-checks the focus.
    const liftAfterTap = useCallback(() => {
      if (keyboardHeight <= 0) return;
      setTimeout(lift, 120);
    }, [keyboardHeight, lift]);

    const androidPad =
      avoidKeyboard && Platform.OS === 'android' && keyboardHeight > 0
        ? keyboardHeight
        : 0;
    const flat = StyleSheet.flatten(contentContainerStyle) as ViewStyle | undefined;
    const basePad = typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : 0;
    const nextPad = androidPad > 0 ? Math.max(basePad, androidPad + GAP) : basePad;

    return (
      <ScrollView
        ref={setRefs}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
        keyboardDismissMode={keyboardDismissMode ?? 'interactive'}
        automaticallyAdjustKeyboardInsets={
          automaticallyAdjustKeyboardInsets ??
          (avoidKeyboard && Platform.OS === 'ios')
        }
        contentContainerStyle={[
          contentContainerStyle,
          androidPad > 0 ? { paddingBottom: nextPad } : null,
        ]}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        scrollEventThrottle={16}
        {...rest}
        onTouchEnd={(e) => {
          liftAfterTap();
          rest.onTouchEnd?.(e);
        }}>
        {children}
      </ScrollView>
    );
  }
);

type OverlayProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  offset?: number;
};

/** Lifts modal/overlay content above the keyboard on iOS and Android. */
export function KeyboardSafeOverlay({ children, style, offset = 0 }: OverlayProps) {
  const keyboardHeight = useKeyboardHeight();
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={offset}>
      <View
        style={{
          flex: 1,
          paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
        }}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}
