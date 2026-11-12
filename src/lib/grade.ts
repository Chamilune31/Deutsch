import type { Exercise } from './types';
import { PRONOUNS } from './verbs';

export type ClozePart = { text: string } | { answers: string[] };

/** « Gestern [bin] ich [gefahren|gegangen]. » → segments texte / trous. */
export function parseCloze(text: string): ClozePart[] {
  const parts: ClozePart[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ answers: m[1].split('|').map((a) => a.trim()) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function clozeBlanks(text: string): string[][] {
  return parseCloze(text).flatMap((p) => ('answers' in p ? [p.answers] : []));
}

/** Phrase complète avec la première variante de chaque trou. */
export function clozeSolution(text: string, bold = false): string {
  return parseCloze(text)
    .map((p) => ('answers' in p ? (bold ? `**${p.answers[0]}**` : p.answers[0]) : p.text))
    .join('');
}

/** Part de mots corrects, dans l'ordre (plus longue sous-suite commune). */
export function wordScore(expected: string, given: string): number {
  const a = normalize(expected).split(' ').filter(Boolean);
  const b = normalize(given).split(' ').filter(Boolean);
  if (!a.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length] / Math.max(a.length, b.length);
}

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
    case 'cloze':
      return clozeSolution(ex.text, true);
    case 'dictation':
      return ex.text;
  }
}

/**
 * Corrige une réponse.
 * - mcq : index choisi (string)
 * - gap / translate / order : texte
 * - match : JSON string[] (réponse choisie pour chaque paire, dans l'ordre)
 * - conjugation / cloze : JSON string[] (une valeur par case)
 * - dictation : texte
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
    case 'cloze': {
      const arr = safeArr(given);
      const blanks = clozeBlanks(ex.text);
      const ok = blanks.filter((alts, j) => alts.some((a) => same(a, arr[j] ?? ''))).length;
      return ok / blanks.length;
    }
    case 'dictation':
      return same(ex.text, given) ? 1 : wordScore(ex.text, given);
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
