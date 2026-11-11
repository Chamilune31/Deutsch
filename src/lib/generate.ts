import type { Exercise, ItemRef, Pack, Tense, Verb, VocabItem } from './types';
import { displayInf, forms, TENSE_SHORT } from './verbs';

export type Rng = () => number;

export function rngFrom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number, rng: Rng): T[] {
  return shuffle(arr, rng).slice(0, n);
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/* ---------- Vocabulaire ---------- */

export function wordLabel(w: VocabItem): string {
  return w.article ? `${w.article} ${w.de}` : w.de;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type VocabGen = (pack: Pack, w: VocabItem, rng: Rng) => Exercise | null;

const vocabGens: Record<string, VocabGen> = {
  meaning: (pack, w, rng) => {
    const others = (pack.vocab ?? []).filter((o) => o.fr !== w.fr).map((o) => o.fr);
    if (others.length < 2) return null;
    const options = shuffle([w.fr, ...sample(others, 3, rng)], rng);
    return { type: 'mcq', q: `Que signifie **${wordLabel(w)}** ?`, options, answer: options.indexOf(w.fr) };
  },
  article: (_pack, w) =>
    w.article
      ? {
          type: 'mcq',
          q: `Quel est l'article de **${w.de}** (${w.fr}) ?`,
          options: ['der', 'die', 'das'],
          answer: ['der', 'die', 'das'].indexOf(w.article),
          why: w.plural ? `${w.article} ${w.de} — pluriel : die ${w.plural}` : undefined,
        }
      : null,
  translate: (_pack, w) => ({
    type: 'translate',
    dir: 'fr-de',
    q: w.fr,
    answers: w.article ? [`${w.article} ${w.de}`, w.de] : [w.de],
    why: w.article ? 'Apprends toujours le nom avec son article.' : undefined,
  }),
  plural: (_pack, w) =>
    w.article && w.plural && w.plural !== '-'
      ? { type: 'gap', q: `${w.article} ${w.de} → die ___`, answers: [w.plural], hint: `pluriel de « ${w.fr} »` }
      : null,
  gap: (_pack, w) => {
    if (!w.ex) return null;
    const re = new RegExp(`(?<!\\p{L})${escapeRe(w.de)}(?!\\p{L})`, 'u');
    if (!re.test(w.ex.de)) return null;
    return { type: 'gap', q: w.ex.de.replace(re, '___'), answers: [w.de], hint: w.ex.fr };
  },
};

function vocabExercise(pack: Pack, w: VocabItem, rng: Rng, kinds: string[]): Exercise | null {
  for (const k of shuffle(kinds, rng)) {
    const ex = vocabGens[k](pack, w, rng);
    if (ex) return { ...ex, tag: pack.topic, ref: { k: 'vocab', pack: pack.id, de: w.de } };
  }
  return null;
}

function matchExercise(pack: Pack, words: VocabItem[], rng: Rng): Exercise | null {
  if (words.length < 3) return null;
  return {
    type: 'match',
    q: 'Associe chaque mot à sa traduction',
    pairs: sample(words, 5, rng).map((w) => [wordLabel(w), w.fr] as [string, string]),
    tag: pack.topic,
  };
}

/* ---------- Verbes ---------- */

export function conjugationExercise(pack: Pack, v: Verb, tense: Tense, rng: Rng, n = 3): Exercise {
  const ask = sample([0, 1, 2, 3, 4, 5], n, rng).sort();
  return {
    type: 'conjugation',
    verb: displayInf(v),
    fr: v.fr,
    tense,
    forms: forms(v, tense),
    ask,
    tag: `Verbes – ${TENSE_SHORT[tense]}`,
    ref: { k: 'verb', pack: pack.id, inf: v.inf, tense },
  };
}

function verbExtra(pack: Pack, v: Verb, rng: Rng): Exercise {
  const ref: ItemRef = { k: 'verb', pack: pack.id, inf: v.inf, tense: 'perfekt' };
  const kind = pick(['aux', 'partizip', 'meaning'], rng);
  if (kind === 'aux')
    return {
      type: 'mcq',
      q: `Au Perfekt, **${displayInf(v)}** se conjugue avec…`,
      options: ['haben', 'sein'],
      answer: v.aux === 'haben' ? 0 : 1,
      why: `er ${forms(v, 'perfekt')[2]}`,
      tag: 'Verbes – auxiliaire haben/sein',
      ref,
    };
  if (kind === 'partizip')
    return {
      type: 'gap',
      q: `Participe passé de **${displayInf(v)}** : ___`,
      answers: [v.partizip],
      hint: v.fr,
      tag: 'Verbes – participes passés',
      ref,
    };
  return {
    type: 'translate',
    dir: 'fr-de',
    q: v.fr,
    answers: [displayInf(v), v.inf],
    tag: pack.topic,
    ref: { ...ref, tense: 'praesens' },
  };
}

/* ---------- Jeux d'exercices ---------- */

function handwritten(pack: Pack, list: 'exercises' | 'exam'): Exercise[] {
  return (pack[list] ?? []).map((ex, i) => ({
    ...ex,
    tag: ex.tag ?? pack.topic,
    ref: { k: 'ex', pack: pack.id, list, i },
  }));
}

function autoPractice(pack: Pack, rng: Rng): Exercise[] {
  const out: Exercise[] = [];
  for (const v of pack.verbs ?? []) {
    out.push(conjugationExercise(pack, v, 'praesens', rng));
    out.push(conjugationExercise(pack, v, 'perfekt', rng));
    out.push(conjugationExercise(pack, v, pick(['praeteritum', 'futur'] as Tense[], rng), rng));
    out.push(verbExtra(pack, v, rng));
  }
  const words = pack.vocab ?? [];
  for (const w of words) {
    const ex = vocabExercise(pack, w, rng, ['meaning', 'article', 'translate', 'plural', 'gap']);
    if (ex) out.push(ex);
  }
  const m = matchExercise(pack, words, rng);
  if (m) out.push(m);
  return out;
}

function autoExam(pack: Pack, rng: Rng): Exercise[] {
  const out: Exercise[] = [];
  for (const v of pack.verbs ?? []) {
    const [t1, t2] = sample(['praesens', 'perfekt', 'praeteritum', 'futur'] as Tense[], 2, rng);
    out.push(conjugationExercise(pack, v, t1, rng));
    out.push(conjugationExercise(pack, v, t2, rng));
    out.push(verbExtra(pack, v, rng));
  }
  const words = pack.vocab ?? [];
  for (const w of words) {
    const ex = vocabExercise(pack, w, rng, ['translate', 'article', 'gap', 'plural']);
    if (ex) out.push(ex);
  }
  return out;
}

export const PRACTICE_MAX = 16;
export const EXAM_MAX = 14;

export function practiceSet(pack: Pack, rng: Rng): Exercise[] {
  const hand = handwritten(pack, 'exercises');
  const auto = shuffle(autoPractice(pack, rng), rng);
  if (hand.length) return [...hand, ...auto.slice(0, 6)];
  return auto.slice(0, PRACTICE_MAX);
}

export function examSet(pack: Pack, rng: Rng): Exercise[] {
  const hand = handwritten(pack, 'exam');
  const auto = autoExam(pack, rng);
  if (hand.length) return shuffle([...hand, ...sample(auto, 4, rng)], rng);
  const words = pack.vocab ?? [];
  const m = matchExercise(pack, words, rng);
  return shuffle(auto, rng).slice(0, m ? EXAM_MAX - 1 : EXAM_MAX).concat(m ? [m] : []);
}

/** Recrée un exercice à partir d'une référence (révision espacée). */
export function exerciseFromRef(ref: ItemRef, packs: Map<string, Pack>, rng: Rng): Exercise | null {
  const pack = packs.get(ref.pack);
  if (!pack) return null;
  if (ref.k === 'ex') {
    const ex = pack[ref.list]?.[ref.i];
    return ex ? { ...ex, tag: ex.tag ?? pack.topic, ref } : null;
  }
  if (ref.k === 'vocab') {
    const w = pack.vocab?.find((x) => x.de === ref.de);
    return w ? vocabExercise(pack, w, rng, ['meaning', 'article', 'translate', 'plural', 'gap']) : null;
  }
  const v = pack.verbs?.find((x) => x.inf === ref.inf);
  return v ? conjugationExercise(pack, v, ref.tense, rng) : null;
}

export function refKey(ref: ItemRef): string {
  if (ref.k === 'ex') return `ex|${ref.pack}|${ref.list}|${ref.i}`;
  if (ref.k === 'vocab') return `vocab|${ref.pack}|${ref.de}`;
  return `verb|${ref.pack}|${ref.inf}|${ref.tense}`;
}
