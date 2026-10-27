import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type {
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition';

import type { Language } from '@/src/i18n/translations';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cached: SpeechModule | null | undefined;

/**
 * The native recognizer, or null in builds without it (Expo Go, web, an
 * install older than the voice feature). Loaded lazily: importing the package
 * throws when its native side is missing.
 */
export function speechModule(): SpeechModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoSpeechRecognition')) {
    cached = null;
    return cached;
  }
  try {
    cached = (require('expo-speech-recognition') as typeof import('expo-speech-recognition'))
      .ExpoSpeechRecognitionModule;
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Whether to offer the mic. Not isRecognitionAvailable(): that flips with the
 * network and the system language at the moment, and would hide the mic
 * offline; a take that cannot start says so instead.
 */
export function speechAvailable(): boolean {
  return speechModule() !== null;
}

/** Colombian Spanish first, then any Spanish the phone has for offline use. */
const PREFERRED: Record<Language, string[]> = {
  es: ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-ES'],
  en: ['en-US', 'en-GB'],
};

/**
 * The locale to listen in and whether the phone can do it without sending
 * audio anywhere. On-device is used whenever it is installed.
 */
export async function pickLocale(
  mod: SpeechModule,
  language: Language
): Promise<{ lang: string; onDevice: boolean }> {
  const preferred = PREFERRED[language];
  try {
    if (mod.supportsOnDeviceRecognition()) {
      const { installedLocales, locales } = await mod.getSupportedLocales({});
      const installed = new Set(installedLocales.map((l) => l.replace('_', '-')));
      const hit =
        preferred.find((l) => installed.has(l)) ??
        [...installed].find((l) => l.toLowerCase().startsWith(language));
      // iOS reports no installedLocales: on-device works for any supported one.
      if (hit) return { lang: hit, onDevice: true };
      if (Platform.OS === 'ios') {
        const supported = new Set(locales.map((l) => l.replace('_', '-')));
        const iosHit = preferred.find((l) => supported.has(l));
        if (iosHit) return { lang: iosHit, onDevice: true };
      }
    }
  } catch {
    // Fall through to the system recognizer.
  }
  return { lang: preferred[0], onDevice: false };
}

/**
 * How Rumi listens. Speech in a noisy place (a shop, the street, a bus):
 * - iOS voice processing removes background noise and echo from the mic
 *   (the same processing calls use), so the recognizer hears the voice.
 * - The vocabulary (accounts, categories, "mil", "lucas") biases recognition
 *   toward the words a spend uses instead of similar-sounding ones.
 * - Several guesses come back; bestDictation keeps the one that reads as a movement.
 * - If the phone refuses one of these (no offline language, no voice
 *   processing), useDictation falls back to the next way to listen.
 * - Android uses the voice recognition mic source, which applies the phone's
 *   own noise suppression; silence limits end the take soon after the person
 *   stops talking, so less room noise gets in.
 */
export function listenOptions(
  lang: string,
  onDevice: boolean,
  vocabulary: string[],
  voiceProcessing = true
): ExpoSpeechRecognitionOptions {
  return {
    lang,
    interimResults: true,
    maxAlternatives: 5,
    continuous: false,
    requiresOnDeviceRecognition: onDevice,
    addsPunctuation: false,
    contextualStrings: vocabulary,
    iosVoiceProcessingEnabled: voiceProcessing,
    iosTaskHint: 'dictation',
    volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
    androidIntentOptions: {
      EXTRA_LANGUAGE_MODEL: 'free_form',
      EXTRA_PREFER_OFFLINE: onDevice,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1600,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1300,
      EXTRA_MASK_OFFENSIVE_WORDS: false,
    },
  };
}

export type SpeechEvents = ExpoSpeechRecognitionNativeEventMap;
