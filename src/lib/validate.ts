import type { Exercise, Pack, Verb } from './types';
import { clozeBlanks, normalize, parseCloze } from './grade';
import { forms } from './verbs';

const SECTIONS = ['cours', 'grammaire', 'verbes', 'vocabulaire', 'lecture', 'ecoute', 'ecriture', 'oral'];
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
    case 'cloze':
      if (!isStr(ex.text) || clozeBlanks(ex.text).length === 0) e('text doit contenir au moins un [trou]');
      else if (clozeBlanks(ex.text).some((alts) => !alts.every(isStr))) e('trou vide');
      else if (/[[\]]/.test(parseCloze(ex.text).map((p) => ('text' in p ? p.text : '')).join(''))) e('crochets mal fermés');
      break;
    case 'dictation':
      if (!isStr(ex.text) || ex.text.split(/\s+/).length < 3) e('text : phrase d’au moins 3 mots');
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
  (v.ctx ?? []).forEach((c, i) => {
    const w = `ctx[${i}]`;
    if (!['praesens', 'perfekt', 'praeteritum', 'futur'].includes(c.t)) return e(`${w} : t invalide`);
    if (!isStr(c.de) || !isStr(c.fr)) return e(`${w} : de et fr requis`);
    const blanks = clozeBlanks(c.de);
    if (!blanks.length) return e(`${w} : mettre les formes du verbe entre [crochets]`);
    if (!isStrArr(v.praesens, 6) || !isStrArr(v.praeteritum, 6)) return;
    const bag = (s: string) => normalize(s).split(' ').sort().join(' ');
    const given = bag(blanks.map((b) => b[0]).join(' '));
    const ok = forms(v, c.t).some((f, p) => {
      if (bag(f) === given) return true;
      // subordonnée : particule séparable collée au verbe
      if (v.sep && (c.t === 'praesens' || c.t === 'praeteritum')) {
        const base = (c.t === 'praesens' ? v.praesens : v.praeteritum)[p];
        const glued = v.refl ? `${v.sep}${base} ${['mich', 'dich', 'sich', 'uns', 'euch', 'sich'][p]}` : `${v.sep}${base}`;
        if (bag(glued) === given) return true;
      }
      return false;
    });
    if (!ok) e(`${w} : « ${blanks.map((b) => b[0]).join(' ')} » ne correspond à aucune forme de ${v.inf} au ${c.t}`);
  });
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

  if (p.section === 'lecture') {
    if (!p.reading || !isStr(p.reading.title) || !isStrArr(p.reading.paragraphs)) e('reading requis (title, paragraphs)');
  }
  if (p.section === 'ecoute') {
    if (!p.listening || !isStr(p.listening.title) || !Array.isArray(p.listening.lines) || p.listening.lines.length < 3 || !p.listening.lines.every((l) => isStr(l.de)))
      e('listening requis (title, au moins 3 lines)');
  }
  if (p.section === 'ecriture' || p.section === 'oral') {
    const t = p.task;
    if (!t || !isStr(t.prompt) || !isStrArr(t.points) || !isStr(t.model) || !Array.isArray(t.phrases) || t.phrases.length < 4)
      e('task requis (prompt, points, model, au moins 4 phrases)');
    else if (!t.phrases.every((x) => isStr(x.de) && isStr(x.fr))) e('task.phrases invalides');
  }

  (p.exercises ?? []).forEach((x, i) => checkExercise(x, `${id} exercises[${i}]`, errs));
  (p.exam ?? []).forEach((x, i) => checkExercise(x, `${id} exam[${i}]`, errs));

  const hasAuto = (p.verbs?.length ?? 0) >= 3 || (p.vocab?.length ?? 0) >= 6;
  if (p.section === 'ecriture' || p.section === 'oral') {
    /* pas d'exercices obligatoires */
  } else if (!hasAuto) {
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
