export type Section =
  | 'cours'
  | 'grammaire'
  | 'verbes'
  | 'vocabulaire'
  | 'lecture'
  | 'ecoute'
  | 'ecriture'
  | 'oral';
export type Level = 'A2' | 'B1';
export type Teacher = 'logan' | 'brayan';
export type Tense = 'praesens' | 'perfekt' | 'praeteritum' | 'futur';

/** Blocs de contenu d'une leçon. Le texte accepte **gras** et *italique*. */
export type Block =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'examples'; items: { de: string; fr: string }[] }
  | { type: 'tip'; text: string };

/** Référence stable vers un élément, pour la révision espacée. */
export type ItemRef =
  | { k: 'ex'; pack: string; list: 'exercises' | 'exam'; i: number }
  | { k: 'vocab'; pack: string; de: string }
  | { k: 'verb'; pack: string; inf: string; tense: Tense }
  | { k: 'ctx'; pack: string; inf: string; i: number };

interface ExBase {
  tag?: string;
  why?: string;
  /** Rempli automatiquement au chargement */
  ref?: ItemRef;
}

export type Exercise =
  | (ExBase & { type: 'mcq'; q: string; options: string[]; answer: number })
  | (ExBase & { type: 'gap'; q: string; answers: string[]; hint?: string })
  | (ExBase & { type: 'translate'; q: string; dir: 'fr-de' | 'de-fr'; answers: string[] })
  | (ExBase & { type: 'order'; q?: string; answers: string[] })
  | (ExBase & { type: 'match'; q?: string; pairs: [string, string][] })
  | (ExBase & {
      type: 'conjugation';
      verb: string;
      fr?: string;
      tense: Tense;
      forms: string[];
      ask?: number[];
    })
  /** Texte à trous multiple : « Gestern [bin] ich nach Berlin [gefahren]. » ; variantes séparées par « | ». */
  | (ExBase & { type: 'cloze'; q?: string; text: string; hint?: string })
  /** Dictée : la phrase est lue par la synthèse vocale. */
  | (ExBase & { type: 'dictation'; text: string; fr?: string });

export type VerbKind =
  | 'regulier'
  | 'fort'
  | 'mixte'
  | 'modal'
  | 'separable'
  | 'reflechi'
  | 'datif'
  | 'auxiliaire';

/** Phrase en contexte : les formes du verbe sont entre crochets. */
export interface VerbContext {
  t: Tense;
  de: string;
  fr: string;
}

export interface Verb {
  /** Infinitif sans « sich » (ex. « freuen », « aufstehen ») */
  inf: string;
  fr: string;
  kinds: VerbKind[];
  aux: 'haben' | 'sein';
  partizip: string;
  /** 6 formes : ich, du, er/sie/es, wir, ihr, sie/Sie — sans particule séparable ni pronom réfléchi */
  praesens: string[];
  praeteritum: string[];
  /** Particule séparable (ex. « auf ») */
  sep?: string;
  refl?: boolean;
  example?: { de: string; fr: string };
  note?: string;
  ctx?: VerbContext[];
}

export interface VocabItem {
  de: string;
  fr: string;
  article?: 'der' | 'die' | 'das';
  plural?: string;
  ex?: { de: string; fr: string };
}

/** Texte de lecture (section lecture). */
export interface Reading {
  title: string;
  kind: string;
  paragraphs: string[];
  glossary?: { de: string; fr: string }[];
}

/** Document sonore (section écoute), lu par la synthèse vocale. */
export interface Listening {
  title: string;
  situation: string;
  lines: { who?: string; de: string }[];
  glossary?: { de: string; fr: string }[];
}

/** Sujet d'expression (sections écriture et oral). */
export interface Task {
  prompt: string;
  points: string[];
  minWords?: number;
  prepSeconds?: number;
  speakSeconds?: number;
  phrases: { de: string; fr: string }[];
  model: string;
  modelFr?: string;
  criteria?: string[];
}

export interface Pack {
  id: string;
  section: Section;
  title: string;
  level: Level;
  topic: string;
  summary: string;
  tags?: string[];
  /** Créneau de sortie (0 = dès le début, 1 = après 3 jours, …). Ignoré pour les cours. */
  release?: number;
  teacher?: Teacher;
  source?: string;
  createdAt: string;
  lesson: Block[];
  verbs?: Verb[];
  vocab?: VocabItem[];
  reading?: Reading;
  listening?: Listening;
  task?: Task;
  exercises?: Exercise[];
  exam?: Exercise[];
}

export interface Result {
  ex: Exercise;
  score: number; // 0..1
  given: string;
  expected: string;
}

/** Correction d'une rédaction, écrite par la tâche planifiée. */
export interface Correction {
  id: string;
  pack: string;
  date: string;
  text: string;
  corrected: string;
  comments: { original: string; fix: string; why: string }[];
  summary: string;
  level?: string;
}
