import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { decryptText, encryptText } from '@/src/data/secureStorage';
import { buildBackup, type BackupSnapshot } from '@/src/utils/backup';
import { parseBackupJson, type RumiBackup } from '@/src/utils/backupParse';
import { localDateKey } from '@/src/utils/habitPilot';

/**
 * A silent copy of everything, once a day, kept on the phone (no account or
 * cloud needed). Encrypted like the live data. Covers mistakes and damaged
 * data; the phone's own backup (iCloud / Google) carries these files too.
 */
const LAST_RUN_KEY = 'rumi:autobackup:last';
/** Days of copies kept: the oldest goes when a new day is saved. */
export const AUTO_BACKUP_KEEP = 7;
const FILE_RE = /^rumi-(\d{4}-\d{2}-\d{2})\.enc$/;

export function autoBackupFileName(dayKey: string): string {
  return `rumi-${dayKey}.enc`;
}

/** Which saved copies to delete so only the newest `keep` days remain. */
export function autoBackupsToDrop(names: string[], keep = AUTO_BACKUP_KEEP): string[] {
  return names
    .filter((name) => FILE_RE.test(name))
    .sort()
    .reverse()
    .slice(keep);
}

function folder(): Directory {
  const dir = new Directory(Paths.document, 'rumi-backups');
  if (!dir.exists) dir.create();
  return dir;
}

/** Saves today's copy unless one was saved today. Never throws: it is silent. */
export async function runAutoBackup(snapshot: BackupSnapshot, now = new Date()): Promise<boolean> {
  try {
    const day = localDateKey(now);
    if ((await AsyncStorage.getItem(LAST_RUN_KEY)) === day) return false;
    // Nothing logged yet: nothing worth keeping.
    if (snapshot.transactions.length === 0) return false;
    const sealed = await encryptText(JSON.stringify(buildBackup(snapshot)));
    const dir = folder();
    const file = new File(dir, autoBackupFileName(day));
    if (file.exists) file.delete();
    file.create();
    file.write(sealed);
    for (const name of autoBackupsToDrop(dir.list().map((entry) => entry.name))) {
      new File(dir, name).delete();
    }
    await AsyncStorage.setItem(LAST_RUN_KEY, day);
    return true;
  } catch {
    return false;
  }
}

/** Saved copies, newest first, as day keys (YYYY-MM-DD). */
export function listAutoBackups(): string[] {
  try {
    return folder()
      .list()
      .map((entry) => FILE_RE.exec(entry.name)?.[1])
      .filter((day): day is string => !!day)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function readAutoBackup(dayKey: string): Promise<RumiBackup> {
  const file = new File(folder(), autoBackupFileName(dayKey));
  return parseBackupJson(await decryptText(await file.text()));
}
