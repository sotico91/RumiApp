const pad = (n: number) => String(n).padStart(2, '0');

/** "Edgar Dávid" → "EdgarDavid": no accents, spaces or filename-unsafe chars. */
export function fileSafeName(name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
  return clean || 'Usuario';
}

/** Local date and time, e.g. 2026-10-02_14-35 (":" is not allowed in file names). */
export function fileDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

/** Rumi_<Name>_<YYYY-MM-DD_HH-mm>.json */
export function backupFileName(userName: string, date: Date = new Date()): string {
  return `Rumi_${fileSafeName(userName)}_${fileDateTime(date)}.json`;
}
