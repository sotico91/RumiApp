import AsyncStorage from '@react-native-async-storage/async-storage';

/** Turns text into an opaque string and back. Native AES-GCM in the app; a fake in tests. */
export type Cipher = {
  encrypt: (plain: string) => Promise<string>;
  decrypt: (sealed: string) => Promise<string>;
  /** False when this phone's own key cannot open its own data: a system fault, not foreign data. */
  keyWorks: () => Promise<boolean>;
};

/** Marks a value as encrypted; anything without it is legacy plain JSON. */
export const ENCRYPTED_PREFIX = 'enc1:';
/** Values that could not be decrypted are moved here and never touched again. */
const UNREADABLE_PREFIX = 'rumi:unreadable:';

let cipher: Cipher | null = null;
let unreadableFound = false;
let recovery: Promise<void> | null = null;

function getCipher(): Cipher {
  // Loaded lazily so tests can swap in a fake without the native modules.
  cipher ??= (require('@/src/data/crypto/dataCipher') as typeof import('@/src/data/crypto/dataCipher'))
    .nativeCipher;
  return cipher;
}

/** Tests only: replace the native cipher. */
export function setCipherForTests(next: Cipher | null): void {
  cipher = next;
  recovery = null;
}

/**
 * Once per session, put back any set-aside value this phone can open after
 * all (e.g. it was set aside by a fault that is now gone), as long as
 * nothing newer was saved in its place.
 */
export function recoverSetAside(): Promise<void> {
  recovery ??= (async () => {
    const keys = await AsyncStorage.getAllKeys();
    const aside = keys.filter((k) => k.startsWith(UNREADABLE_PREFIX)).sort().reverse();
    const present = new Set(keys);
    for (const asideKey of aside) {
      const original = asideKey.slice(UNREADABLE_PREFIX.length).replace(/:\d+$/, '');
      if (present.has(original)) continue;
      const raw = await AsyncStorage.getItem(asideKey);
      if (!raw?.startsWith(ENCRYPTED_PREFIX)) continue;
      try {
        await getCipher().decrypt(raw.slice(ENCRYPTED_PREFIX.length));
      } catch {
        continue;
      }
      await AsyncStorage.setItem(original, raw);
      await AsyncStorage.removeItem(asideKey);
      present.add(original);
    }
  })();
  return recovery;
}

/** True once per session if some stored data could not be decrypted on this phone. */
export function takeUnreadableNotice(): boolean {
  const found = unreadableFound;
  unreadableFound = false;
  return found;
}

export async function encryptText(json: string): Promise<string> {
  return ENCRYPTED_PREFIX + (await getCipher().encrypt(json));
}

export async function encryptJson(value: unknown): Promise<string> {
  return encryptText(JSON.stringify(value));
}

/**
 * Read a stored value. Plain JSON from before encryption is returned and
 * re-saved encrypted. A value that cannot be decrypted (another phone's key)
 * is set aside under rumi:unreadable:* and reported as missing, so the caller
 * never overwrites the only copy.
 */
export async function readSecureJson<T>(key: string): Promise<T | null> {
  await recoverSetAside();
  const raw = await AsyncStorage.getItem(key);
  return raw == null ? null : decodeStored<T>(key, raw);
}

export async function decodeStored<T>(key: string, raw: string): Promise<T | null> {
  if (!raw.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const value = JSON.parse(raw) as T;
      await AsyncStorage.setItem(key, await encryptJson(value));
      return value;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(await getCipher().decrypt(raw.slice(ENCRYPTED_PREFIX.length))) as T;
  } catch (err) {
    // Our key cannot even open our own check value: a fault, not foreign
    // data. Fail loudly and write nothing rather than hide the data.
    if (!(await getCipher().keyWorks())) throw err;
    unreadableFound = true;
    await AsyncStorage.setItem(`${UNREADABLE_PREFIX}${key}:${Date.now()}`, raw);
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function writeSecureJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, await encryptJson(value));
}
