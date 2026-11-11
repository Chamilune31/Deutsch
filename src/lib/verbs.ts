import type { Tense, Verb, VerbKind } from './types';

export const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
export const REFL = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'];
const HABEN = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
const SEIN = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];
const WERDEN = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'];

export const TENSES: Tense[] = ['praesens', 'perfekt', 'praeteritum', 'futur'];

export const TENSE_LABEL: Record<Tense, string> = {
  praesens: 'Présent (Präsens)',
  perfekt: 'Passé composé (Perfekt)',
  praeteritum: 'Prétérit (Präteritum)',
  futur: 'Futur I',
};

export const TENSE_SHORT: Record<Tense, string> = {
  praesens: 'Präsens',
  perfekt: 'Perfekt',
  praeteritum: 'Präteritum',
  futur: 'Futur I',
};

export const KIND_LABEL: Record<VerbKind, string> = {
  regulier: 'Réguliers',
  fort: 'Forts / irréguliers',
  mixte: 'Mixtes',
  modal: 'Modaux',
  separable: 'Séparables',
  reflechi: 'Réfléchis',
  datif: 'Verbes + datif',
  auxiliaire: 'Auxiliaires',
};

/** Infinitif affiché (« sich freuen »). */
export function displayInf(v: Verb): string {
  return v.refl ? `sich ${v.inf}` : v.inf;
}

/** Les 6 formes complètes d'un temps (sans le pronom sujet). */
export function forms(v: Verb, tense: Tense): string[] {
  const r = (i: number) => (v.refl ? ` ${REFL[i]}` : '');
  const s = v.sep ? ` ${v.sep}` : '';
  switch (tense) {
    case 'praesens':
      return v.praesens.map((f, i) => `${f}${r(i)}${s}`);
    case 'praeteritum':
      return v.praeteritum.map((f, i) => `${f}${r(i)}${s}`);
    case 'perfekt': {
      const aux = v.aux === 'sein' ? SEIN : HABEN;
      return aux.map((a, i) => `${a}${r(i)} ${v.partizip}`);
    }
    case 'futur':
      return WERDEN.map((w, i) => `${w}${r(i)} ${v.inf}`);
  }
}
