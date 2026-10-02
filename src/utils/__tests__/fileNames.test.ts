import { backupFileName, fileSafeName } from '@/src/utils/fileNames';

describe('backup file name', () => {
  const date = new Date(2026, 9, 2, 14, 5);

  it('uses Rumi_<Name>_<date>_<time>.json', () => {
    expect(backupFileName('Edgar David', date)).toBe('Rumi_EdgarDavid_2026-10-02_14-05.json');
  });

  it('strips accents and unsafe characters', () => {
    expect(fileSafeName('  maría josé / ñoño ')).toBe('MariaJoseNono');
  });

  it('falls back when the name is empty', () => {
    expect(backupFileName('', date)).toBe('Rumi_Usuario_2026-10-02_14-05.json');
  });
});
