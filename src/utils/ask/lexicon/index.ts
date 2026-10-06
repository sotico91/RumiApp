import { EN } from './en';
import { ES } from './es';
import type { IntentLexicon } from './types';

export type { IntentLexicon } from './types';

/**
 * Both languages at once: people mix them ("¿cuánto spent en Uber?") and the
 * app language does not always match how they type.
 */
function merge(...lexicons: IntentLexicon[]): IntentLexicon {
  const out = {} as IntentLexicon;
  for (const key of Object.keys(lexicons[0]) as (keyof IntentLexicon)[]) {
    out[key] = lexicons.flatMap((l) => l[key]);
  }
  return out;
}

export const LEXICON = merge(ES, EN);
