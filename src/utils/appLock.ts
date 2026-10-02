import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export type AppLockKind = 'face' | 'fingerprint' | 'pin' | 'none';

export type AppLockAuthResult =
  | { ok: true }
  | { ok: false; reason: 'cancel' | 'denied' | 'failed' };

type AppLockFailReason = Extract<AppLockAuthResult, { ok: false }>['reason'];

/** Read AppState fresh: it can change while an auth prompt is awaited. */
function isInBackground(): boolean {
  return (AppState.currentState as string) === 'background';
}

function cancelReason(
  error: LocalAuthentication.LocalAuthenticationError | undefined
): AppLockFailReason {
  if (error === 'user_cancel' || error === 'system_cancel' || error === 'app_cancel') {
    return 'cancel';
  }
  if (
    error === 'not_available' ||
    error === 'not_enrolled' ||
    error === 'passcode_not_set'
  ) {
    return 'denied';
  }
  return 'failed';
}

function isUserOrSystemCancel(
  error: LocalAuthentication.LocalAuthenticationError | undefined
): boolean {
  return error === 'user_cancel' || error === 'system_cancel' || error === 'app_cancel';
}

export async function getAppLockKind(): Promise<AppLockKind> {
  if (Platform.OS === 'web') return 'none';

  const [hardware, enrolled, types, level] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
  ]);

  const face = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

  if (hardware && enrolled && face) return 'face';
  if (hardware && enrolled && finger) return 'fingerprint';
  if (level >= LocalAuthentication.SecurityLevel.SECRET) return 'pin';
  return 'none';
}

function authenticateFaceId(promptMessage: string, fallbackLabel: string) {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
    fallbackLabel,
    requireConfirmation: false,
    biometricsSecurityLevel: 'strong',
  });
}

function authenticatePin(promptMessage: string) {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Face ID first. If the face is not recognized (or Face ID cannot run),
 * ask for the device passcode. Do not start either prompt in the app
 * switcher — iOS then draws a tiny passcode keyboard.
 */
export async function authenticateAppLock(
  promptMessage: string,
  pinPromptMessage?: string,
  fallbackLabel?: string
): Promise<AppLockAuthResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'denied' };

  if (AppState.currentState !== 'active') {
    return { ok: false, reason: 'cancel' };
  }

  const kind = await getAppLockKind();
  if (kind === 'none') return { ok: false, reason: 'denied' };

  const pinPrompt = pinPromptMessage ?? promptMessage;

  if (kind === 'face' || kind === 'fingerprint') {
    const bio = await authenticateFaceId(
      promptMessage,
      fallbackLabel ?? 'Passcode'
    );
    if (bio.success) return { ok: true };

    const error = 'error' in bio ? bio.error : undefined;
    // Left the prompt, or put the app in the switcher / background.
    if (isUserOrSystemCancel(error) || isInBackground()) {
      return { ok: false, reason: 'cancel' };
    }

    // Face ID not recognized, locked out, or "Use passcode" — device PIN.
    // Face ID itself sets AppState to inactive; that must not skip the PIN.
    await wait(280);
    if (isInBackground()) {
      return { ok: false, reason: 'cancel' };
    }

    const pin = await authenticatePin(pinPrompt);
    if (pin.success) return { ok: true };
    return { ok: false, reason: cancelReason('error' in pin ? pin.error : undefined) };
  }

  const pin = await authenticatePin(pinPrompt);
  if (pin.success) return { ok: true };
  return { ok: false, reason: cancelReason('error' in pin ? pin.error : undefined) };
}
