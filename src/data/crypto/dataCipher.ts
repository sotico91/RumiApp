import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { base64ToBytes } from '@/src/data/crypto/base64';
import { utf8Decode, utf8Encode } from '@/src/data/crypto/utf8';
import type { Cipher } from '@/src/data/secureStorage';

/** Where the data key lives: iOS Keychain / Android Keystore, never next to the data. */
const KEY_NAME = 'rumi.data-key.v1';
/**
 * Readable once the phone has been unlocked after boot, so reminders and
 * background work still load data. On iOS it travels only inside encrypted
 * backups, together with the data it opens.
 */
const KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

/** A known value sealed with this phone's key, to tell "not ours" from "key not working". */
const CHECK_KEY = 'rumi:key-check';
const CHECK_TEXT = 'rumi';

let keyPromise: Promise<AESEncryptionKey> | null = null;
/** True when this session had to create the key (first run, or data restored from another phone). */
let createdKeyThisSession = false;

function loadKey(): Promise<AESEncryptionKey> {
  keyPromise ??= (async () => {
    const stored = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTIONS);
    if (stored) return AESEncryptionKey.import(stored, 'base64');
    const key = await AESEncryptionKey.generate(AESKeySize.AES256);
    createdKeyThisSession = true;
    await SecureStore.setItemAsync(KEY_NAME, await key.encoded('base64'), KEY_OPTIONS);
    return key;
  })();
  // A failed attempt must not stick: try again on the next read or write.
  keyPromise.catch(() => {
    keyPromise = null;
  });
  return keyPromise;
}

async function encrypt(plain: string): Promise<string> {
  const key = await loadKey();
  const sealed = await aesEncryptAsync(utf8Encode(plain), key);
  return sealed.combined('base64');
}

async function decrypt(sealed: string): Promise<string> {
  const key = await loadKey();
  const bytes = await aesDecryptAsync(AESSealedData.fromCombined(base64ToBytes(sealed)), key, {
    output: 'bytes',
  });
  return utf8Decode(bytes);
}

/** AES-256-GCM with a fresh random nonce per write; output is nonce+ciphertext+tag in base64. */
export const nativeCipher: Cipher = {
  encrypt,
  decrypt,
  async keyWorks() {
    try {
      const check = await AsyncStorage.getItem(CHECK_KEY);
      if (check != null) {
        try {
          if ((await decrypt(check)) === CHECK_TEXT) return true;
        } catch {
          // A check sealed by another phone's key, restored with the data.
          if (!createdKeyThisSession) return false;
        }
      }
      // No check yet, or the old one belongs to a key this phone never had.
      await AsyncStorage.setItem(CHECK_KEY, await encrypt(CHECK_TEXT));
      return (await decrypt((await AsyncStorage.getItem(CHECK_KEY)) ?? '')) === CHECK_TEXT;
    } catch {
      return false;
    }
  },
};
