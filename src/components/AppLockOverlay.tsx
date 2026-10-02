import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { AppModal } from '@/src/components/AppModal';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { authenticateAppLock } from '@/src/utils/appLock';
import { tapFeedback } from '@/src/utils/selectFeedback';

const FACE_ID_RESUME_MS = 250;
/** Like Nequi/banks: stay unlocked if you hop out for less than this. */
const SESSION_GRACE_MS = 60_000;

/**
 * Lives only in this JS process. Killing the app drops it, so the next
 * launch always asks for Face ID / fingerprint even if it was under 1 min.
 */
let liveUnlocked = false;

export function AppLockOverlay() {
  const { t } = useLanguage();
  const { settings, ready } = useSettings();
  const [unlocked, setUnlocked] = useState(liveUnlocked);
  const [obscured, setObscured] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  const unlockedRef = useRef(liveUnlocked);
  const promptingRef = useRef(false);
  const waitForTapRef = useRef(false);
  const autoPromptedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  const shouldLock = ready && settings.onboardingDone && settings.appLockEnabled;
  const showUnlock = shouldLock && !unlocked;
  const waitingForSettings = !ready;
  const visible =
    waitingForSettings || showUnlock || (shouldLock && unlocked && obscured);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const lockNow = useCallback(() => {
    liveUnlocked = false;
    waitForTapRef.current = false;
    autoPromptedRef.current = false;
    unlockedRef.current = false;
    backgroundedAtRef.current = null;
    setShowTapHint(false);
    setUnlocked(false);
    setObscured(true);
  }, []);

  const tryUnlock = useCallback(
    async (fromUser: boolean) => {
      if (!shouldLock || promptingRef.current || unlockedRef.current) return;
      if (!fromUser && waitForTapRef.current) return;
      if (AppState.currentState !== 'active') return;

      promptingRef.current = true;
      setShowTapHint(false);
      try {
        const result = await authenticateAppLock(
          t('lock.promptFace'),
          t('lock.promptPin'),
          t('lock.usePasscode')
        );
        if (result.ok) {
          liveUnlocked = true;
          waitForTapRef.current = false;
          unlockedRef.current = true;
          setUnlocked(true);
          setObscured(false);
          setShowTapHint(false);
          return;
        }
        waitForTapRef.current = true;
        setShowTapHint(true);
      } catch {
        waitForTapRef.current = true;
        setShowTapHint(true);
      } finally {
        promptingRef.current = false;
      }
    },
    [shouldLock, t]
  );

  useEffect(() => {
    if (!ready) return;
    if (!settings.onboardingDone || !settings.appLockEnabled) {
      liveUnlocked = true;
      unlockedRef.current = true;
      waitForTapRef.current = false;
      autoPromptedRef.current = false;
      backgroundedAtRef.current = null;
      setUnlocked(true);
      setObscured(false);
      setShowTapHint(false);
    }
  }, [ready, settings.appLockEnabled, settings.onboardingDone]);

  useEffect(() => {
    if (!shouldLock) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'inactive') {
        clearResumeTimer();
        setObscured(true);
        return;
      }

      if (state === 'background') {
        clearResumeTimer();
        setObscured(true);
        if (backgroundedAtRef.current == null) {
          backgroundedAtRef.current = Date.now();
        }
        return;
      }

      if (state === 'active') {
        const awayMs =
          backgroundedAtRef.current != null
            ? Date.now() - backgroundedAtRef.current
            : 0;
        backgroundedAtRef.current = null;

        if (unlockedRef.current && awayMs >= SESSION_GRACE_MS) {
          lockNow();
        }

        if (unlockedRef.current) {
          setObscured(false);
          return;
        }

        setObscured(true);
        clearResumeTimer();
        resumeTimerRef.current = setTimeout(() => {
          resumeTimerRef.current = null;
          if (AppState.currentState !== 'active') return;
          if (!unlockedRef.current) void tryUnlock(false);
        }, FACE_ID_RESUME_MS);
      }
    });

    return () => {
      sub.remove();
      clearResumeTimer();
    };
  }, [clearResumeTimer, lockNow, shouldLock, tryUnlock]);

  useEffect(() => {
    if (!showUnlock || autoPromptedRef.current) return;
    if (AppState.currentState !== 'active') return;
    autoPromptedRef.current = true;
    void tryUnlock(false);
  }, [showUnlock, tryUnlock]);

  if (!visible) return null;

  return (
    <AppModal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable
        style={styles.root}
        onPress={() => {
          if (!showUnlock) return;
          tapFeedback();
          waitForTapRef.current = false;
          void tryUnlock(true);
        }}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        {showUnlock && showTapHint ? (
          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint}>{t('lock.tapToUnlock')}</Text>
          </View>
        ) : null}
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(15,42,54,0.72)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 64,
  },
  hintWrap: {
    paddingHorizontal: 24,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.white,
    opacity: 0.85,
    textAlign: 'center',
  },
});
