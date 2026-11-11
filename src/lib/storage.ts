import { useSyncExternalStore } from 'react';
import type { ItemRef, Pack, Result } from './types';
import { refKey } from './generate';

export interface SrsItem {
  ref: ItemRef;
  box: number;
  due: string;
  seen: number;
  wrong: number;
  last: string;
}

export interface Attempt {
  pack: string | null;
  mode: 'practice' | 'exam' | 'review';
  date: string;
  score: number;
  total: number;
}

export interface Progress {
  v: 1;
  srs: Record<string, SrsItem>;
  tags: Record<string, { ok: number; ko: number }>;
  attempts: Attempt[];
  days: string[];
}

/** Intervalles de révision (jours) par boîte de Leitner. */
export const INTERVALS = [1, 2, 4, 8, 16, 32];

const KEY = 'deutsch-progress-v1';
const KEY_PACKS = 'deutsch-imported-packs-v1';

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return today(d);
}

function empty(): Progress {
  return { v: 1, srs: {}, tags: {}, attempts: [], days: [] };
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou indisponible */
  }
}

/* ---------- Store réactif ---------- */

let progress: Progress = typeof localStorage !== 'undefined' ? read(KEY, empty()) : empty();
let imported: Pack[] = typeof localStorage !== 'undefined' ? read(KEY_PACKS, [] as Pack[]) : [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => progress, () => progress);
}

export function useImportedPacks(): Pack[] {
  return useSyncExternalStore(subscribe, () => imported, () => imported);
}

export function getProgress() {
  return progress;
}

function setProgress(p: Progress) {
  progress = p;
  write(KEY, p);
  emit();
}

/* ---------- Logique ---------- */

/** Met à jour une fiche de révision (Leitner). Pure, testable. */
export function updateSrs(item: SrsItem | undefined, ref: ItemRef, correct: boolean, day: string): SrsItem {
  const prev = item ?? { ref, box: -1, due: day, seen: 0, wrong: 0, last: day };
  const box = correct ? Math.min(prev.box + 1, INTERVALS.length - 1) : 0;
  return {
    ref,
    box,
    due: correct ? addDays(day, INTERVALS[box]) : addDays(day, 1),
    seen: prev.seen + 1,
    wrong: prev.wrong + (correct ? 0 : 1),
    last: day,
  };
}

export function recordResults(mode: Attempt['mode'], pack: string | null, results: Result[]) {
  const day = today();
  const p: Progress = {
    ...progress,
    srs: { ...progress.srs },
    tags: { ...progress.tags },
    attempts: [...progress.attempts],
    days: progress.days.includes(day) ? progress.days : [...progress.days, day],
  };
  for (const r of results) {
    const correct = r.score >= 0.999;
    if (r.ex.ref) {
      const k = refKey(r.ex.ref);
      p.srs[k] = updateSrs(p.srs[k], r.ex.ref, correct, day);
    }
    const tag = r.ex.tag ?? 'Divers';
    const t = p.tags[tag] ?? { ok: 0, ko: 0 };
    p.tags[tag] = { ok: t.ok + r.score, ko: t.ko + (1 - r.score) };
  }
  const score = results.reduce((s, r) => s + r.score, 0);
  p.attempts.push({ pack, mode, date: new Date().toISOString(), score, total: results.length });
  if (p.attempts.length > 500) p.attempts = p.attempts.slice(-500);
  setProgress(p);
}

export function dueItems(p: Progress, day = today()): SrsItem[] {
  return Object.values(p.srs)
    .filter((s) => s.due <= day)
    .sort((a, b) => a.box - b.box || a.due.localeCompare(b.due));
}

export function streak(p: Progress, day = today()): number {
  const set = new Set(p.days);
  let n = 0;
  let d = set.has(day) ? day : addDays(day, -1);
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function exportProgress(): string {
  return JSON.stringify({ progress, imported }, null, 2);
}

export function importProgress(json: string) {
  const data = JSON.parse(json);
  if (!data?.progress?.srs) throw new Error('Fichier de sauvegarde invalide');
  progress = data.progress;
  imported = Array.isArray(data.imported) ? data.imported : imported;
  write(KEY, progress);
  write(KEY_PACKS, imported);
  emit();
}

export function resetProgress() {
  setProgress(empty());
}

/* ---------- Packs importés (collés depuis Claude) ---------- */

export function saveImportedPack(pack: Pack) {
  imported = [...imported.filter((p) => p.id !== pack.id), pack];
  write(KEY_PACKS, imported);
  emit();
}

export function removeImportedPack(id: string) {
  imported = imported.filter((p) => p.id !== id);
  write(KEY_PACKS, imported);
  emit();
}

/* ---------- Réglages ---------- */

export function unlockAll(): boolean {
  try {
    if (location.hash.includes('unlock=all') || location.search.includes('unlock=all'))
      localStorage.setItem('deutsch-unlock-all', '1');
    if (location.hash.includes('unlock=off') || location.search.includes('unlock=off'))
      localStorage.removeItem('deutsch-unlock-all');
    return localStorage.getItem('deutsch-unlock-all') === '1';
  } catch {
    return false;
  }
}
