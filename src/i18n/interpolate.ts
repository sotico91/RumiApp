export type TranslateOptions = Record<string, string | number>;

/**
 * Fill {name} placeholders. {name|one|other} picks a word by number, so
 * "{count} {count|movement|movements}" reads "1 movement" / "3 movements".
 */
export function interpolate(template: string, options?: TranslateOptions): string {
  if (!options) return template;
  return template
    .replace(/\{(\w+)\|([^|{}]*)\|([^|{}]*)\}/g, (match, name: string, one: string, other: string) =>
      name in options ? (Number(options[name]) === 1 ? one : other) : match
    )
    .replace(/\{(\w+)\}/g, (match, name: string) => (name in options ? String(options[name]) : match));
}
