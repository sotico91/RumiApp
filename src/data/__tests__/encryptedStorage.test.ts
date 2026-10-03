import AsyncStorage from '@react-native-async-storage/async-storage';

import { base64ToBytes } from '@/src/data/crypto/base64';
import { utf8Decode, utf8Encode } from '@/src/data/crypto/utf8';
import { loadAccounts, loadTransactions, saveTransactions } from '@/src/data/financeStorage';
import { setCipherForTests, takeUnreadableNotice } from '@/src/data/secureStorage';
import { LEGACY_TX_KEY, resetShardCacheForTests } from '@/src/data/transactionShards';
import type { Transaction } from '@/src/types/finance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reversible stand-in for native AES-GCM (text reversed, so words are not
// readable on disk); rejects anything it did not produce, like a wrong key.
const reverse = (text: string) => [...text].reverse().join('');
const fakeCipher = {
  encrypt: async (plain: string) => `F${reverse(plain)}`,
  decrypt: async (sealed: string) => {
    if (!sealed.startsWith('F')) throw new Error('bad tag');
    return reverse(sealed.slice(1));
  },
  keyWorks: async () => true,
};

function tx(id: string, createdAt: string, note = ''): Transaction {
  return { id, type: 'expense', amount: 1000, categoryId: 'sub-cafe', note, createdAt };
}

async function stored(): Promise<Record<string, string>> {
  const keys = await AsyncStorage.getAllKeys();
  const out: Record<string, string> = {};
  for (const [k, v] of await AsyncStorage.multiGet(keys)) out[k] = v ?? '';
  return out;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetShardCacheForTests();
  setCipherForTests(fakeCipher);
  takeUnreadableNotice();
  jest.clearAllMocks();
});

describe('utf8', () => {
  it('round-trips accents, ñ and emoji', () => {
    const text = 'Café con señora 🐜 — ¿cuánto? 2.500.000';
    expect(utf8Decode(utf8Encode(text))).toBe(text);
  });

  it('produces standard UTF-8 bytes', () => {
    expect([...utf8Encode('ñ')]).toEqual([0xc3, 0xb1]);
    expect([...utf8Encode('€')]).toEqual([0xe2, 0x82, 0xac]);
    expect([...utf8Encode('🐜')]).toEqual([0xf0, 0x9f, 0x90, 0x9c]);
  });
});

describe('base64ToBytes', () => {
  it('decodes standard base64, with or without padding', () => {
    expect(utf8Decode(base64ToBytes('aGVsbG8='))).toBe('hello');
    expect(utf8Decode(base64ToBytes('aGVsbG8'))).toBe('hello');
    expect([...base64ToBytes('/+8=')]).toEqual([0xff, 0xef]);
    expect([...base64ToBytes('')]).toEqual([]);
  });

  it('rejects text that is not base64', () => {
    expect(() => base64ToBytes('no*base64')).toThrow();
  });
});

describe('monthly encrypted movements', () => {
  const legacy = [
    tx('a', '2026-10-02T10:00:00.000Z', 'Café con Juan'),
    tx('b', '2026-09-15T10:00:00.000Z'),
    tx('c', '2026-08-01T10:00:00.000Z'),
  ];

  it('moves the old single list into one encrypted entry per month', async () => {
    await AsyncStorage.setItem(LEGACY_TX_KEY, JSON.stringify(legacy));

    const loaded = await loadTransactions();

    expect(loaded.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    const data = await stored();
    expect(Object.keys(data).sort()).toEqual([
      'rumi:tx:2026-08',
      'rumi:tx:2026-09',
      'rumi:tx:2026-10',
    ]);
    for (const value of Object.values(data)) expect(value.startsWith('enc1:')).toBe(true);
    // The note never sits on disk in clear text.
    expect(JSON.stringify(data)).not.toContain('Juan');
  });

  it('rewrites only the month that changed', async () => {
    await AsyncStorage.setItem(LEGACY_TX_KEY, JSON.stringify(legacy));
    const loaded = await loadTransactions();
    (AsyncStorage.multiSet as jest.Mock).mockClear();

    await saveTransactions([tx('d', '2026-10-03T09:00:00.000Z'), ...loaded]);

    const written = (AsyncStorage.multiSet as jest.Mock).mock.calls.flatMap((call) =>
      (call[0] as [string, string][]).map(([key]) => key)
    );
    expect(written).toEqual(['rumi:tx:2026-10']);
  });

  it('drops a month once its last movement is deleted', async () => {
    await AsyncStorage.setItem(LEGACY_TX_KEY, JSON.stringify(legacy));
    const loaded = await loadTransactions();

    await saveTransactions(loaded.filter((t) => t.id !== 'c'));

    expect(Object.keys(await stored())).not.toContain('rumi:tx:2026-08');
  });

  it('reads back what it wrote after a restart', async () => {
    await AsyncStorage.setItem(LEGACY_TX_KEY, JSON.stringify(legacy));
    await loadTransactions();
    resetShardCacheForTests();

    expect((await loadTransactions()).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('data this phone cannot decrypt', () => {
  it('sets it aside untouched, loads the rest and says so once', async () => {
    await AsyncStorage.setItem(LEGACY_TX_KEY, JSON.stringify([tx('a', '2026-10-02T10:00:00.000Z')]));
    await loadTransactions();
    resetShardCacheForTests();
    await AsyncStorage.setItem('rumi:tx:2026-09', 'enc1:Zsealed-with-another-key');

    const loaded = await loadTransactions();

    expect(loaded.map((t) => t.id)).toEqual(['a']);
    const keys = Object.keys(await stored());
    expect(keys).not.toContain('rumi:tx:2026-09');
    expect(keys.some((k) => k.startsWith('rumi:unreadable:rumi:tx:2026-09:'))).toBe(true);
    expect(takeUnreadableNotice()).toBe(true);
    expect(takeUnreadableNotice()).toBe(false);
  });

  it('never overwrites the set-aside copy on the next save', async () => {
    await AsyncStorage.setItem('rumi:tx:2026-09', 'enc1:Zsealed-with-another-key');
    const loaded = await loadTransactions();
    await saveTransactions([tx('n', '2026-09-20T10:00:00.000Z'), ...loaded]);

    const data = await stored();
    const aside = Object.entries(data).find(([k]) => k.startsWith('rumi:unreadable:'));
    expect(aside?.[1]).toBe('enc1:Zsealed-with-another-key');
  });
});

describe('when the key itself fails', () => {
  it('writes nothing and reports the error instead of setting data aside', async () => {
    const sealed = 'enc1:Zsomething';
    await AsyncStorage.setItem('rumi:accounts:v2', sealed);
    setCipherForTests({ ...fakeCipher, keyWorks: async () => false });

    await expect(loadAccounts()).rejects.toThrow();

    expect(await AsyncStorage.getItem('rumi:accounts:v2')).toBe(sealed);
    expect((await AsyncStorage.getAllKeys()).some((k) => k.startsWith('rumi:unreadable:'))).toBe(
      false
    );
  });
});

describe('when this phone cannot encrypt', () => {
  it('keeps plain data as it is instead of replacing it', async () => {
    const plain = JSON.stringify([{ id: 'cash', type: 'cash', nameKey: 'account.cash', balance: 5 }]);
    await AsyncStorage.setItem('rumi:accounts:v2', plain);
    setCipherForTests({ ...fakeCipher, keyWorks: async () => false });

    const accounts = await loadAccounts();

    expect(accounts.find((a) => a.id === 'cash')?.balance).toBe(5);
    const saved = (await AsyncStorage.getItem('rumi:accounts:v2')) ?? '';
    expect(saved.startsWith('enc1:')).toBe(false);
    expect(JSON.parse(saved)[0]).toEqual(JSON.parse(plain)[0]);
  });
});

describe('set-aside data', () => {
  it('is put back when this phone can open it after all', async () => {
    const sealed = `enc1:F${[...JSON.stringify([tx('r', '2026-07-01T10:00:00.000Z')])].reverse().join('')}`;
    await AsyncStorage.setItem('rumi:unreadable:rumi:tx:2026-07:1700000000000', sealed);

    const loaded = await loadTransactions();

    expect(loaded.map((t) => t.id)).toEqual(['r']);
    expect(await AsyncStorage.getItem('rumi:tx:2026-07')).toBe(sealed);
  });
});

describe('other lists', () => {
  it('re-saves plain accounts from before encryption as encrypted', async () => {
    await AsyncStorage.setItem(
      'rumi:accounts:v2',
      JSON.stringify([{ id: 'cash', type: 'cash', nameKey: 'account.cash', balance: 150000 }])
    );

    const accounts = await loadAccounts();

    expect(accounts.find((a) => a.id === 'cash')?.balance).toBe(150000);
    expect((await AsyncStorage.getItem('rumi:accounts:v2'))?.startsWith('enc1:')).toBe(true);
  });
});
