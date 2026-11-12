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

export function ctxExercise(pack: Pack, v: Verb, i: number): Exercise | null {
  const c = v.ctx?.[i];
  if (!c) return null;
  return {
    type: 'cloze',
    text: c.de,
    hint: `${displayInf(v)}, ${TENSE_SHORT[c.t]} — ${c.fr}`,
    tag: `Verbes en contexte – ${TENSE_SHORT[c.t]}`,
    ref: { k: 'ctx', pack: pack.id, inf: v.inf, i },
  };
}

function verbPool(pack: Pack, rng: Rng, exam: boolean) {
  const ctx: Exercise[] = [];
  const conj: Exercise[] = [];
  const extra: Exercise[] = [];
  for (const v of pack.verbs ?? []) {
    (v.ctx ?? []).forEach((_, i) => {
      const ex = ctxExercise(pack, v, i);
      if (ex) ctx.push(ex);
    });
    const tenses: Tense[] = exam
      ? sample(['praesens', 'perfekt', 'praeteritum', 'futur'] as Tense[], 2, rng)
      : ['praesens', 'perfekt', pick(['praeteritum', 'futur'] as Tense[], rng)];
    for (const t of tenses) conj.push(conjugationExercise(pack, v, t, rng));
    extra.push(verbExtra(pack, v, rng));
  }
  const [nCtx, nConj, nExtra] = exam ? [6, 5, 3] : [7, 6, 3];
  const a = sample(ctx, nCtx, rng);
  const b = sample(conj, nConj + (nCtx - a.length), rng);
  return [...a, ...b, ...sample(extra, nExtra, rng)];
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

const FIXED_ORDER = new Set(['der|die|das', 'haben|sein', 'Richtig|Falsch']);

/** Mélange les options d'un QCM (sauf listes à ordre naturel) pour que la bonne réponse change de place. */
export function shuffleOptions(ex: Exercise, rng: Rng): Exercise {
  if (ex.type !== 'mcq' || ex.options.length < 3 || FIXED_ORDER.has(ex.options.join('|'))) return ex;
  const order = shuffle(ex.options.map((_, i) => i), rng);
  return { ...ex, options: order.map((i) => ex.options[i]), answer: order.indexOf(ex.answer) };
}

function handwritten(pack: Pack, list: 'exercises' | 'exam', rng: Rng): Exercise[] {
  return (pack[list] ?? []).map((ex, i) =>
    shuffleOptions({ ...ex, tag: ex.tag ?? pack.topic, ref: { k: 'ex', pack: pack.id, list, i } }, rng),
  );
}

function autoPractice(pack: Pack, rng: Rng): Exercise[] {
  const out: Exercise[] = verbPool(pack, rng, false);
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
  const out: Exercise[] = verbPool(pack, rng, true);
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
  const hand = handwritten(pack, 'exercises', rng);
  const auto = shuffle(autoPractice(pack, rng), rng);
  if (hand.length) return [...hand, ...auto.slice(0, 6)];
  return auto.slice(0, PRACTICE_MAX);
}

export function examSet(pack: Pack, rng: Rng): Exercise[] {
  const hand = handwritten(pack, 'exam', rng);
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
    return ex ? shuffleOptions({ ...ex, tag: ex.tag ?? pack.topic, ref }, rng) : null;
  }
  if (ref.k === 'vocab') {
    const w = pack.vocab?.find((x) => x.de === ref.de);
    return w ? vocabExercise(pack, w, rng, ['meaning', 'article', 'translate', 'plural', 'gap']) : null;
  }
  const v = pack.verbs?.find((x) => x.inf === ref.inf);
  if (!v) return null;
  if (ref.k === 'ctx') return ctxExercise(pack, v, ref.i);
  return conjugationExercise(pack, v, ref.tense, rng);
}

export function refKey(ref: ItemRef): string {
  if (ref.k === 'ex') return `ex|${ref.pack}|${ref.list}|${ref.i}`;
  if (ref.k === 'vocab') return `vocab|${ref.pack}|${ref.de}`;
  if (ref.k === 'ctx') return `ctx|${ref.pack}|${ref.inf}|${ref.i}`;
  return `verb|${ref.pack}|${ref.inf}|${ref.tense}`;
}
