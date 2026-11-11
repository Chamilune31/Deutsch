import type { Exercise } from './types';
import { PRONOUNS } from './verbs';

/** Normalise une réponse : casse, espaces, ponctuation, ä→ae, ö→oe, ü→ue, ß→ss. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[„“”"«»‚‘’]/g, '')
    .replace(/[.,!?;:]/g, ' ')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

export function same(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** Libellé de la réponse attendue, pour l'affichage. */
export function expectedLabel(ex: Exercise): string {
  switch (ex.type) {
    case 'mcq':
      return ex.options[ex.answer];
    case 'gap':
    case 'translate':
    case 'order':
      return ex.answers[0];
    case 'match':
      return ex.pairs.map(([a, b]) => `${a} → ${b}`).join(' · ');
    case 'conjugation': {
      const ask = ex.ask ?? [0, 1, 2, 3, 4, 5];
      return ask.map((i) => `${PRONOUNS[i]} ${ex.forms[i]}`).join(' · ');
    }
  }
}

/**
 * Corrige une réponse.
 * - mcq : index choisi (string)
 * - gap / translate / order : texte
 * - match : JSON string[] (réponse choisie pour chaque paire, dans l'ordre)
 * - conjugation : JSON string[] (forme saisie pour chaque personne demandée)
 * Renvoie un score entre 0 et 1.
 */
export function grade(ex: Exercise, given: string): number {
  switch (ex.type) {
    case 'mcq':
      return Number(given) === ex.answer ? 1 : 0;
    case 'gap':
    case 'translate':
    case 'order':
      return ex.answers.some((a) => same(a, given)) ? 1 : 0;
    case 'match': {
      const arr = safeArr(given);
      const ok = ex.pairs.filter(([, b], i) => arr[i] === b).length;
      return ok / ex.pairs.length;
    }
    case 'conjugation': {
      const arr = safeArr(given);
      const ask = ex.ask ?? [0, 1, 2, 3, 4, 5];
      const ok = ask.filter((p, j) => same(arr[j] ?? '', ex.forms[p])).length;
      return ok / ask.length;
    }
  }
}

function safeArr(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
