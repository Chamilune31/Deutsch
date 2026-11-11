import type { Exercise, Pack, Verb } from './types';
import { normalize } from './grade';

const SECTIONS = ['cours', 'grammaire', 'verbes', 'vocabulaire'];
const LEVELS = ['A2', 'B1'];
const TENSES = ['praesens', 'perfekt', 'praeteritum', 'futur'];
const KINDS = ['regulier', 'fort', 'mixte', 'modal', 'separable', 'reflechi', 'datif', 'auxiliaire'];

const isStr = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const isStrArr = (x: unknown, min = 1): x is string[] =>
  Array.isArray(x) && x.length >= min && x.every(isStr);

function checkExercise(ex: Exercise, where: string, errs: string[]) {
  const e = (m: string) => errs.push(`${where} : ${m}`);
  if (!ex || typeof ex !== 'object') return e('exercice invalide');
  switch (ex.type) {
    case 'mcq':
      if (!isStr(ex.q)) e('q manquant');
      if (!isStrArr(ex.options, 2)) e('au moins 2 options');
      else if (new Set(ex.options).size !== ex.options.length) e('options en double');
      if (!Number.isInteger(ex.answer) || ex.answer < 0 || ex.answer >= (ex.options?.length ?? 0))
        e('answer hors limites');
      break;
    case 'gap':
      if (!isStr(ex.q) || (ex.q.match(/___/g) ?? []).length !== 1) e('q doit contenir exactement un « ___ »');
      if (!isStrArr(ex.answers)) e('answers manquant');
      break;
    case 'translate':
      if (!isStr(ex.q)) e('q manquant');
      if (ex.dir !== 'fr-de' && ex.dir !== 'de-fr') e('dir doit être fr-de ou de-fr');
      if (!isStrArr(ex.answers)) e('answers manquant');
      break;
    case 'order':
      if (!isStrArr(ex.answers)) e('answers manquant');
      else {
        const bag = (s: string) => normalize(s).split(' ').sort().join(' ');
        const base = bag(ex.answers[0]);
        if (ex.answers[0].split(/\s+/).length < 3) e('phrase trop courte (≥ 3 mots)');
        ex.answers.forEach((a, i) => {
          if (bag(a) !== base)
            e(`answers[${i}] n'utilise pas exactement les mêmes mots que answers[0]`);
        });
      }
      break;
    case 'match':
      if (!Array.isArray(ex.pairs) || ex.pairs.length < 3) e('au moins 3 paires');
      else if (!ex.pairs.every((p) => Array.isArray(p) && p.length === 2 && isStr(p[0]) && isStr(p[1])))
        e('paires invalides');
      else if (new Set(ex.pairs.map((p) => p[1])).size !== ex.pairs.length) e('traductions en double');
      break;
    case 'conjugation':
      if (!isStr(ex.verb)) e('verb manquant');
      if (!TENSES.includes(ex.tense)) e('tense invalide');
      if (!isStrArr(ex.forms, 6) || ex.forms.length !== 6) e('forms doit contenir 6 formes');
      break;
    default:
      e(`type inconnu « ${(ex as { type: string }).type} »`);
  }
}

function checkVerb(v: Verb, where: string, errs: string[]) {
  const e = (m: string) => errs.push(`${where} (${v?.inf}) : ${m}`);
  if (!isStr(v.inf)) return e('inf manquant');
  if (!isStr(v.fr)) e('fr manquant');
  if (!isStr(v.partizip)) e('partizip manquant');
  if (v.aux !== 'haben' && v.aux !== 'sein') e('aux doit être haben ou sein');
  if (!Array.isArray(v.kinds) || !v.kinds.length || !v.kinds.every((k) => KINDS.includes(k)))
    e(`kinds invalide (valeurs : ${KINDS.join(', ')})`);
  for (const t of ['praesens', 'praeteritum'] as const) {
    if (!isStrArr(v[t], 6) || v[t].length !== 6) {
      e(`${t} doit contenir 6 formes`);
      continue;
    }
    if (v[t][3] !== v[t][5]) e(`${t} : les formes « wir » et « sie » devraient être identiques`);
  }
  if (isStrArr(v.praeteritum, 6) && v.praeteritum[0] !== v.praeteritum[2])
    e('praeteritum : les formes « ich » et « er » devraient être identiques');
  if (v.sep && v.praesens?.some((f) => f.endsWith(` ${v.sep}`)))
    e('ne pas inclure la particule séparable dans praesens (elle est ajoutée automatiquement)');
  if (v.refl && v.praesens?.some((f) => / (mich|dich|sich|uns|euch)$/.test(f)))
    e('ne pas inclure le pronom réfléchi dans les formes (ajouté automatiquement)');
}

export function validatePack(p: Pack): string[] {
  const errs: string[] = [];
  const id = isStr(p?.id) ? p.id : '(sans id)';
  const e = (m: string) => errs.push(`${id} : ${m}`);
  if (!p || typeof p !== 'object') return ['pack invalide'];
  if (!/^[a-z0-9-]+$/.test(p.id ?? '')) e('id doit être en minuscules, chiffres et tirets');
  if (!SECTIONS.includes(p.section)) e(`section invalide (${SECTIONS.join(', ')})`);
  if (!LEVELS.includes(p.level)) e('level doit être A2 ou B1');
  for (const f of ['title', 'topic', 'summary', 'createdAt'] as const) if (!isStr(p[f])) e(`${f} manquant`);
  if (!Array.isArray(p.lesson) || p.lesson.length === 0) e('lesson vide');
  if (p.section === 'cours' && p.teacher !== 'logan' && p.teacher !== 'brayan')
    e('teacher doit être logan ou brayan pour un cours');
  if (p.section !== 'cours' && (!Number.isInteger(p.release) || (p.release ?? -1) < 0))
    e('release (entier ≥ 0) requis hors section cours');

  (p.lesson ?? []).forEach((b, i) => {
    const w = `lesson[${i}]`;
    if (b.type === 'h' || b.type === 'p' || b.type === 'tip') {
      if (!isStr(b.text)) e(`${w} : text manquant`);
    } else if (b.type === 'list') {
      if (!isStrArr(b.items)) e(`${w} : items manquant`);
    } else if (b.type === 'table') {
      if (!Array.isArray(b.head) || !b.head.length || !b.head.every((h) => typeof h === 'string') || !Array.isArray(b.rows) || !b.rows.every((r) => Array.isArray(r) && r.length === b.head.length))
        e(`${w} : tableau invalide (chaque ligne doit avoir ${b.head?.length} cellules)`);
    } else if (b.type === 'examples') {
      if (!Array.isArray(b.items) || !b.items.every((x) => isStr(x.de) && isStr(x.fr))) e(`${w} : exemples invalides`);
    } else e(`${w} : type de bloc inconnu`);
  });

  (p.verbs ?? []).forEach((v, i) => checkVerb(v, `${id} verbs[${i}]`, errs));
  (p.vocab ?? []).forEach((w, i) => {
    if (!isStr(w.de) || !isStr(w.fr)) e(`vocab[${i}] : de et fr requis`);
    if (w.article && !['der', 'die', 'das'].includes(w.article)) e(`vocab[${i}] : article invalide`);
    if (w.article && w.de && w.de[0] !== w.de[0].toUpperCase()) e(`vocab[${i}] : un nom prend une majuscule`);
  });
  const des = (p.vocab ?? []).map((w) => w.de);
  if (new Set(des).size !== des.length) e('vocab : mots en double');

  (p.exercises ?? []).forEach((x, i) => checkExercise(x, `${id} exercises[${i}]`, errs));
  (p.exam ?? []).forEach((x, i) => checkExercise(x, `${id} exam[${i}]`, errs));

  const hasAuto = (p.verbs?.length ?? 0) >= 3 || (p.vocab?.length ?? 0) >= 6;
  if (!hasAuto) {
    if ((p.exercises?.length ?? 0) < 6) e('au moins 6 exercices requis (ou ≥ 3 verbes / ≥ 6 mots)');
    if ((p.exam?.length ?? 0) < 6) e('au moins 6 questions d’examen requises (ou ≥ 3 verbes / ≥ 6 mots)');
  }
  return errs;
}

export function validateAll(packs: Pack[]): string[] {
  const errs = packs.flatMap(validatePack);
  const ids = packs.map((p) => p.id);
  ids.forEach((id, i) => {
    if (ids.indexOf(id) !== i) errs.push(`id en double : ${id}`);
  });
  return errs;
}
