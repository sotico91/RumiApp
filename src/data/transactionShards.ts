import AsyncStorage from '@react-native-async-storage/async-storage';

import { decodeStored, encryptText, recoverSetAside } from '@/src/data/secureStorage';
import type { Transaction } from '@/src/types/finance';

/** One encrypted entry per month: rumi:tx:2026-10. */
export const SHARD_PREFIX = 'rumi:tx:';
/** Before sharding, every movement lived in this one entry. */
export const LEGACY_TX_KEY = 'rumi:transactions:v2';

const NO_MONTH = '0000-00';

export function monthOf(tx: Pick<Transaction, 'createdAt'>): string {
  const match = /^(\d{4}-\d{2})/.exec(tx.createdAt ?? '');
  return match ? match[1] : NO_MONTH;
}

export function splitByMonth(items: Transaction[]): Map<string, Transaction[]> {
  const months = new Map<string, Transaction[]>();
  for (const tx of items) {
    const month = monthOf(tx);
    const list = months.get(month);
    if (list) list.push(tx);
    else months.set(month, [tx]);
  }
  return months;
}

/** Each month's JSON as last persisted, so a save rewrites only the months that changed. */
const persisted = new Map<string, string>();

/** Tests only. */
export function resetShardCacheForTests(): void {
  persisted.clear();
}

export type ShardWrites = {
  set: [string, string][];
  remove: string[];
  /** Call once the writes have landed. */
  commit: () => void;
};

export async function planShardWrites(items: Transaction[]): Promise<ShardWrites> {
  const next = new Map<string, string>();
  for (const [month, list] of splitByMonth(items)) next.set(month, JSON.stringify(list));

  const set: [string, string][] = [];
  for (const [month, json] of next) {
    if (persisted.get(month) !== json) set.push([SHARD_PREFIX + month, await encryptText(json)]);
  }
  const remove = [...persisted.keys()]
    .filter((month) => !next.has(month))
    .map((month) => SHARD_PREFIX + month);

  return {
    set,
    remove,
    commit: () => {
      persisted.clear();
      for (const [month, json] of next) persisted.set(month, json);
    },
  };
}

async function readShards(keys: string[]): Promise<Transaction[]> {
  const out: Transaction[] = [];
  if (keys.length === 0) return out;
  for (const [key, raw] of await AsyncStorage.multiGet(keys)) {
    if (raw == null) continue;
    const list = await decodeStored<Transaction[]>(key, raw);
    if (!Array.isArray(list)) continue;
    persisted.set(key.slice(SHARD_PREFIX.length), JSON.stringify(list));
    out.push(...list);
  }
  return out;
}

/**
 * Load every month. The first time, the old single list is split into
 * encrypted months and removed only after the months read back complete.
 * Null when nothing was ever stored in either format.
 */
export async function loadShardedTransactions(): Promise<Transaction[] | null> {
  await recoverSetAside();
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(SHARD_PREFIX));
  if (keys.length > 0) {
    // Months exist only after a complete write, so any old single list is stale.
    await AsyncStorage.removeItem(LEGACY_TX_KEY);
    return readShards([...keys].sort());
  }

  const raw = await AsyncStorage.getItem(LEGACY_TX_KEY);
  if (raw == null) return null;
  const legacy = await decodeStored<Transaction[]>(LEGACY_TX_KEY, raw);
  if (!Array.isArray(legacy)) return null;
  if (legacy.length === 0) {
    // Nothing to move (AsyncStorage also rejects an empty multiSet).
    await AsyncStorage.removeItem(LEGACY_TX_KEY);
    return [];
  }

  const plan = await planShardWrites(legacy);
  await AsyncStorage.multiSet(plan.set);
  persisted.clear();
  const check = await readShards(plan.set.map(([key]) => key));
  if (check.length !== legacy.length) {
    // Keep the old list as the source of truth and try again next launch.
    await AsyncStorage.multiRemove(plan.set.map(([key]) => key));
    persisted.clear();
    return legacy;
  }
  await AsyncStorage.removeItem(LEGACY_TX_KEY);
  return check;
}
