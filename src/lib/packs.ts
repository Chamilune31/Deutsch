import { useMemo } from 'react';
import type { Pack, Section } from './types';
import config from '../content/config.json';
import { addDays, today, unlockAll, useImportedPacks } from './storage';

const modules = import.meta.glob('../content/packs/*.json', { eager: true, import: 'default' });
export const STATIC_PACKS: Pack[] = Object.values(modules) as Pack[];

export const CONFIG = config as { startDate: string; intervalDays: number; repoUrl: string };

export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.round(ms / 86400000);
}

/** Créneau courant : 0 le jour du lancement, +1 tous les `intervalDays` jours. */
export function currentSlot(day = today(), cfg = CONFIG): number {
  return Math.max(0, Math.floor(daysBetween(cfg.startDate, day) / cfg.intervalDays));
}

export function releaseDate(pack: Pack, cfg = CONFIG): string {
  return addDays(cfg.startDate, (pack.release ?? 0) * cfg.intervalDays);
}

export function isUnlocked(pack: Pack, slot: number, all = false): boolean {
  return all || pack.section === 'cours' || (pack.release ?? 0) <= slot;
}

export function nextUnlock(day = today(), cfg = CONFIG): { date: string; inDays: number } {
  const slot = currentSlot(day, cfg);
  const date = addDays(cfg.startDate, (slot + 1) * cfg.intervalDays);
  return { date, inDays: daysBetween(day, date) };
}

export function usePacks() {
  const imported = useImportedPacks();
  return useMemo(() => {
    const seen = new Set<string>();
    const all: Pack[] = [];
    for (const p of [...imported, ...STATIC_PACKS]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      all.push(p);
    }
    const byId = new Map(all.map((p) => [p.id, p]));
    const slot = currentSlot();
    const unlockedAll = unlockAll();
    const unlocked = (p: Pack) => isUnlocked(p, slot, unlockedAll);
    const inSection = (s: Section) =>
      all
        .filter((p) => p.section === s)
        .sort((a, b) => (a.release ?? 0) - (b.release ?? 0) || a.createdAt.localeCompare(b.createdAt));
    return { all, byId, slot, unlocked, inSection, importedIds: new Set(imported.map((p) => p.id)) };
  }, [imported]);
}

export const SECTION_LABEL: Record<Section, string> = {
  cours: 'Mes cours',
  grammaire: 'Grammaire',
  verbes: 'Verbes',
  vocabulaire: 'Vocabulaire',
  lecture: 'Lire',
  ecoute: 'Écouter',
  ecriture: 'Écrire',
  oral: 'Parler',
};

export const LEARN: Section[] = ['grammaire', 'verbes', 'vocabulaire'];
export const SKILLS: Section[] = ['lecture', 'ecoute', 'ecriture', 'oral'];
