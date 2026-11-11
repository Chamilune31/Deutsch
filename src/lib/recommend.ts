import type { Pack, Section } from './types';
import type { Progress } from './storage';
import { dueItems } from './storage';

export interface PackStatus {
  practiced: boolean;
  bestPractice: number; // 0..1
  examTaken: boolean;
  bestExam: number; // 0..1
}

export function packStatus(p: Progress, packId: string): PackStatus {
  const att = p.attempts.filter((a) => a.pack === packId && a.total > 0);
  const pr = att.filter((a) => a.mode === 'practice');
  const ex = att.filter((a) => a.mode === 'exam');
  const best = (xs: typeof att) => xs.reduce((m, a) => Math.max(m, a.score / a.total), 0);
  return { practiced: pr.length > 0, bestPractice: best(pr), examTaken: ex.length > 0, bestExam: best(ex) };
}

export interface WeakTag {
  tag: string;
  rate: number;
  total: number;
}

export function weakTags(p: Progress, min = 4): WeakTag[] {
  return Object.entries(p.tags)
    .map(([tag, t]) => ({ tag, total: t.ok + t.ko, rate: t.ok / Math.max(1e-9, t.ok + t.ko) }))
    .filter((t) => t.total >= min && t.rate < 0.75)
    .sort((a, b) => a.rate - b.rate);
}

export interface Reco {
  kind: 'review' | 'new' | 'weak' | 'exam';
  title: string;
  detail: string;
  to: string;
}

/** Plan du jour : 4 recommandations maximum, dans l'ordre de priorité. */
export function dailyPlan(p: Progress, packs: Pack[], unlocked: (p: Pack) => boolean): Reco[] {
  const out: Reco[] = [];
  const due = dueItems(p);
  if (due.length)
    out.push({
      kind: 'review',
      title: `Révision : ${due.length} élément${due.length > 1 ? 's' : ''} à revoir`,
      detail: 'La répétition espacée fait revenir ce que tu as raté au bon moment.',
      to: '/revision',
    });

  const weak = weakTags(p)[0];
  if (weak) {
    const target = packs.find((pk) => unlocked(pk) && (pk.topic === weak.tag || pk.tags?.includes(weak.tag)));
    out.push({
      kind: 'weak',
      title: `Point faible : ${weak.tag}`,
      detail: `${Math.round(weak.rate * 100)} % de réussite. ${target ? `Reprends « ${target.title} ».` : 'Fais une session de révision ciblée.'}`,
      to: target ? `/pack/${target.id}` : '/revision',
    });
  }

  const order: Section[] = ['cours', 'grammaire', 'verbes', 'vocabulaire'];
  for (const s of order) {
    const fresh = packs
      .filter((pk) => pk.section === s && unlocked(pk) && !packStatus(p, pk.id).practiced)
      .sort((a, b) => (b.release ?? 0) - (a.release ?? 0) || b.createdAt.localeCompare(a.createdAt))[0];
    if (fresh && out.length < 4)
      out.push({ kind: 'new', title: fresh.title, detail: fresh.summary, to: `/pack/${fresh.id}` });
  }

  const readyForExam = packs.find((pk) => {
    const st = packStatus(p, pk.id);
    return unlocked(pk) && st.bestPractice >= 0.8 && !st.examTaken;
  });
  if (readyForExam && out.length < 5)
    out.push({
      kind: 'exam',
      title: `Prête pour l'examen : ${readyForExam.title}`,
      detail: 'Tu as bien réussi les exercices. Valide avec l’examen chronométré.',
      to: `/pack/${readyForExam.id}?tab=exam`,
    });
  return out.slice(0, 5);
}
