export function hasStem(haystack: string, stem: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(stem)}`).test(haystack);
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Phrase/word match. Avoids short needles like "ant" matching inside "cuanto".
 */
export function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => {
    const needle = normalize(n);
    if (!needle) return false;
    if (needle.includes(' ')) return haystack.includes(needle);
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:[^a-z0-9]|$)`);
    return re.test(haystack);
  });
}

export const STOPWORDS = new Set([
  'a', 'al', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'en', 'con', 'por', 'para', 'mi', 'mis', 'tu', 'tus', 'y', 'o', 'que', 'qué',
  'cuanto', 'cuánto', 'cuanta', 'cuánta', 'cuantos', 'cuántos', 'cuantas', 'cuántas',
  'gaste', 'gasté', 'gasto', 'gastos', 'pague', 'pagué', 'pago',
  'how', 'much', 'did', 'i', 'my', 'the', 'on', 'for', 'to', 'of', 'is', 'was',
  'spend', 'spent', 'expense', 'expenses', 'this', 'that', 'me', 'do', 'what',
  'cual', 'cuál', 'como', 'cómo', 'donde', 'dónde', 'hay', 'tiene', 'tengo',
  'sobre', 'about', 'fue', 'son', 'esta', 'está', 'este', 'estos',
]);

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9áéíóúñü]+/i)
    .map((t) => normalize(t))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}
