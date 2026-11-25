/**
 * Seasonal touches. Christmas runs from December 1 to January 6 (Reyes),
 * in the phone's local time, so the decoration turns itself off without a release.
 */
export function isChristmasSeason(date: Date = new Date()): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  return month === 11 || (month === 0 && day <= 6);
}
