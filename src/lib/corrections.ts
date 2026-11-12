import type { Correction } from './types';

const modules = import.meta.glob('../content/corrections/*.json', { eager: true, import: 'default' });
export const CORRECTIONS: Correction[] = Object.values(modules) as Correction[];

export function correctionsFor(pack: string): Correction[] {
  return CORRECTIONS.filter((c) => c.pack === pack).sort((a, b) => b.date.localeCompare(a.date));
}
