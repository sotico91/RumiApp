import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Part of the screen the keyboard covers. On iOS the frame-change event also
 * fires while hiding, with the full height but a frame already off screen.
 */
function coveredHeight(e: KeyboardEvent) {
  const { height, screenY } = e.endCoordinates;
  if (Platform.OS === 'ios' && screenY > 0) {
    return Math.max(0, Math.round(Dimensions.get('window').height - screenY));
  }
  return Math.max(0, Math.round(height));
}

/** Keyboard height in px. Prefer this inside Android Dialog/Modal (they do not resize). */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const apply = (e: KeyboardEvent) => setHeight(coveredHeight(e));
    const hide = () => setHeight(0);

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      apply
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      hide
    );
    const change = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame',
      apply
    );
    return () => {
      show.remove();
      hideSub.remove();
      change.remove();
    };
  }, []);

  return height;
}

/** True while the software keyboard is on screen. */
export function useKeyboardVisible() {
  return useKeyboardHeight() > 0;
}
