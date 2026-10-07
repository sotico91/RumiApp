jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('@/src/utils/backup', () => ({ buildBackup: jest.fn() }));

import { AUTO_BACKUP_KEEP, autoBackupFileName, autoBackupsToDrop } from '@/src/data/autoBackup';

describe('silent daily copies', () => {
  it('names one file per day', () => {
    expect(autoBackupFileName('2026-10-06')).toBe('rumi-2026-10-06.enc');
  });

  it('keeps the newest days and drops the rest', () => {
    const names = Array.from({ length: AUTO_BACKUP_KEEP + 3 }, (_, i) =>
      autoBackupFileName(`2026-10-${String(i + 1).padStart(2, '0')}`)
    );
    expect(autoBackupsToDrop(names)).toEqual([
      'rumi-2026-10-03.enc',
      'rumi-2026-10-02.enc',
      'rumi-2026-10-01.enc',
    ]);
  });

  it('never touches files that are not its copies', () => {
    expect(autoBackupsToDrop(['notes.txt', 'rumi-backup.json'], 0)).toEqual([]);
  });
});
