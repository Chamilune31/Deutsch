import type { Exercise, Pack } from './types';
import type { Progress } from './storage';
import { dueItems } from './storage';
import { ctxExercise, exerciseFromRef, practiceSet, sample, shuffle, shuffleOptions, type Rng } from './generate';
import { packStatus } from './recommend';

export interface SessionPart {
  label: string;
  count: number;
}

/** Choisit la leçon à travailler : la plus récente des leçons non encore pratiquées. */
export function focusPack(p: Progress, packs: Pack[], unlocked: (p: Pack) => boolean): Pack | undefined {
  const order = ['cours', 'grammaire', 'verbes', 'vocabulaire', 'lecture', 'ecoute'];
  for (const s of order) {
    const fresh = packs
      .filter((pk) => pk.section === s && unlocked(pk) && !packStatus(p, pk.id).practiced)
      .sort((a, b) => (a.release ?? 0) - (b.release ?? 0) || a.createdAt.localeCompare(b.createdAt))[0];
    if (fresh) return fresh;
  }
  return undefined;
}

/** Séance du jour d'environ 15 minutes : révisions, une leçon, verbes en contexte, vocabulaire, une dictée. */
export function buildSession(p: Progress, packs: Pack[], unlocked: (p: Pack) => boolean, rng: Rng) {
  const byId = new Map(packs.map((pk) => [pk.id, pk]));
  const open = packs.filter(unlocked);
  const parts: SessionPart[] = [];
  const out: Exercise[] = [];

  const due = dueItems(p)
    .slice(0, 6)
    .map((s) => exerciseFromRef(s.ref, byId, rng))
    .filter((x): x is Exercise => !!x);
  if (due.length) parts.push({ label: 'Révisions', count: due.length });
  out.push(...due);

  const focus = focusPack(p, packs, unlocked);
  if (focus && focus.section !== 'lecture' && focus.section !== 'ecoute') {
    const ex = practiceSet(focus, rng).slice(0, 5);
    parts.push({ label: focus.title, count: ex.length });
    out.push(...ex);
  }

  const ctx = open
    .filter((pk) => pk.section === 'verbes')
    .flatMap((pk) => (pk.verbs ?? []).flatMap((v) => (v.ctx ?? []).map((_, i) => ctxExercise(pk, v, i))))
    .filter((x): x is Exercise => !!x && !out.some((o) => JSON.stringify(o.ref) === JSON.stringify(x.ref)));
  const c = sample(ctx, 3, rng);
  if (c.length) parts.push({ label: 'Verbes en contexte', count: c.length });
  out.push(...c);

  const vocabPacks = open.filter((pk) => pk.section === 'vocabulaire' && pk.id !== focus?.id);
  if (vocabPacks.length) {
    const vp = vocabPacks[Math.floor(rng() * vocabPacks.length)];
    const v = practiceSet(vp, rng)
      .filter((e) => e.type !== 'match')
      .slice(0, 3);
    parts.push({ label: `Vocabulaire : ${vp.topic.toLowerCase()}`, count: v.length });
    out.push(...v);
  }

  const dict = open
    .filter((pk) => pk.section === 'ecoute')
    .flatMap((pk) =>
      (pk.exercises ?? []).map((e, i) => ({ ...e, tag: e.tag ?? pk.topic, ref: { k: 'ex' as const, pack: pk.id, list: 'exercises' as const, i } })),
    )
    .filter((e) => e.type === 'dictation');
  const d = sample(dict, 1, rng).map((e) => shuffleOptions(e, rng));
  if (d.length) parts.push({ label: 'Dictée', count: 1 });

  // Les révisions d'abord, le reste mélangé, la dictée à la fin.
  return { parts, exercises: [...out.slice(0, due.length), ...shuffle(out.slice(due.length), rng), ...d] };
}
