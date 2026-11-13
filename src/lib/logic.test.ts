import { describe, expect, it } from 'vitest';
import { clozeBlanks, grade, normalize, wordScore } from './grade';
import { forms } from './verbs';
import { examSet, practiceSet, rngFrom, exerciseFromRef } from './generate';
import { updateSrs, addDays } from './storage';
import { currentSlot, STATIC_PACKS } from './packs';
import { validateAll } from './validate';
import type { Exercise, Verb } from './types';

function perfect(ex: Exercise): string {
  switch (ex.type) {
    case 'mcq':
      return String(ex.answer);
    case 'gap':
    case 'translate':
    case 'order':
      return ex.answers[0];
    case 'match':
      return JSON.stringify(ex.pairs.map((p) => p[1]));
    case 'conjugation':
      return JSON.stringify((ex.ask ?? [0, 1, 2, 3, 4, 5]).map((i) => ex.forms[i]));
    case 'cloze':
      return JSON.stringify(clozeBlanks(ex.text).map((b) => b[0]));
    case 'dictation':
      return ex.text;
  }
}

describe('correction', () => {
  it('normalise casse, ponctuation et umlauts', () => {
    expect(normalize('  Ich gehe nach Hause. ')).toBe('ich gehe nach hause');
    expect(normalize('Mädchen')).toBe(normalize('Maedchen'));
    expect(normalize('Straße')).toBe(normalize('Strasse'));
    expect(normalize('Mädchen')).not.toBe(normalize('Madchen'));
  });
  it('accepte les réponses alternatives', () => {
    const ex: Exercise = { type: 'translate', dir: 'fr-de', q: 'x', answers: ['Ich gehe nach Hause.', 'Ich gehe heim.'] };
    expect(grade(ex, 'ich gehe heim')).toBe(1);
    expect(grade(ex, 'Ich gehe zu Hause')).toBe(0);
  });
  it('note partiellement les conjugaisons', () => {
    const ex: Exercise = { type: 'conjugation', verb: 'gehen', tense: 'praesens', forms: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'], ask: [0, 1] };
    expect(grade(ex, JSON.stringify(['gehe', 'gest']))).toBe(0.5);
  });
});

describe('verbes', () => {
  const auf: Verb = {
    inf: 'aufstehen', fr: 'se lever', kinds: ['fort', 'separable'], aux: 'sein', partizip: 'aufgestanden', sep: 'auf',
    praesens: ['stehe', 'stehst', 'steht', 'stehen', 'steht', 'stehen'],
    praeteritum: ['stand', 'standst', 'stand', 'standen', 'standet', 'standen'],
  };
  const freuen: Verb = {
    inf: 'freuen', fr: 'se réjouir', kinds: ['reflechi'], aux: 'haben', partizip: 'gefreut', refl: true,
    praesens: ['freue', 'freust', 'freut', 'freuen', 'freut', 'freuen'],
    praeteritum: ['freute', 'freutest', 'freute', 'freuten', 'freutet', 'freuten'],
  };
  it('séparables', () => {
    expect(forms(auf, 'praesens')[0]).toBe('stehe auf');
    expect(forms(auf, 'perfekt')[2]).toBe('ist aufgestanden');
    expect(forms(auf, 'futur')[1]).toBe('wirst aufstehen');
    expect(forms(auf, 'praeteritum')[3]).toBe('standen auf');
  });
  it('réfléchis', () => {
    expect(forms(freuen, 'praesens')[0]).toBe('freue mich');
    expect(forms(freuen, 'perfekt')[3]).toBe('haben uns gefreut');
    expect(forms(freuen, 'futur')[4]).toBe('werdet euch freuen');
  });
});

describe('répétition espacée', () => {
  const ref = { k: 'vocab' as const, pack: 'p', de: 'Haus' };
  it('monte de boîte si juste, revient à 0 si faux', () => {
    const a = updateSrs(undefined, ref, true, '2026-11-11');
    expect(a.box).toBe(0);
    expect(a.due).toBe('2026-11-12');
    const b = updateSrs(a, ref, true, '2026-11-12');
    expect(b.box).toBe(1);
    expect(b.due).toBe('2026-11-14');
    const c = updateSrs(b, ref, false, '2026-11-14');
    expect(c.box).toBe(0);
    expect(c.wrong).toBe(1);
    expect(c.due).toBe(addDays('2026-11-14', 1));
  });
});

describe('calendrier', () => {
  const cfg = { startDate: '2026-11-11', intervalDays: 3, repoUrl: '' };
  it('débloque un créneau tous les 3 jours', () => {
    expect(currentSlot('2026-11-11', cfg)).toBe(0);
    expect(currentSlot('2026-11-13', cfg)).toBe(0);
    expect(currentSlot('2026-11-14', cfg)).toBe(1);
    expect(currentSlot('2026-11-01', cfg)).toBe(0);
  });
});

describe('contenu', () => {
  it('tous les packs sont valides', () => {
    expect(validateAll(STATIC_PACKS)).toEqual([]);
  });

  it('chaque exercice généré est cohérent (la réponse attendue obtient 1)', () => {
    const map = new Map(STATIC_PACKS.map((p) => [p.id, p]));
    for (let seed = 1; seed <= 5; seed++) {
      for (const pack of STATIC_PACKS.filter((p) => p.section !== 'ecriture' && p.section !== 'oral')) {
        const rng = rngFrom(seed);
        const sets = [practiceSet(pack, rng), examSet(pack, rng)];
        for (const set of sets) {
          expect(set.length, pack.id).toBeGreaterThanOrEqual(6);
          for (const ex of set) {
            expect(grade(ex, perfect(ex)), `${pack.id} ${JSON.stringify(ex)}`).toBe(1);
            if (ex.type === 'gap') expect(ex.q.split('___').length, pack.id).toBe(2);
            if (ex.type === 'mcq') expect(new Set(ex.options).size, pack.id).toBe(ex.options.length);
            if (ex.ref) expect(exerciseFromRef(ex.ref, map, rng), pack.id).not.toBeNull();
          }
        }
      }
    }
  });
});

import { richSegments } from '../components/Rich';
describe('mise en forme', () => {
  it('gère gras et italique imbriqués', () => {
    expect(richSegments('*…, weil ich früh **aufstehe***')).toEqual([
      { t: '…, weil ich früh ', b: false, i: true },
      { t: 'aufstehe', b: true, i: true },
    ]);
    expect(richSegments('a **b** c').map((s) => s.b)).toEqual([false, true, false]);
  });
});

describe('nouveaux exercices', () => {
  it('note les textes à trous multiples et les dictées', () => {
    const ex: Exercise = { type: 'cloze', text: 'Gestern [bin] ich nach Berlin [gefahren|gereist].' };
    expect(grade(ex, JSON.stringify(['bin', 'gereist']))).toBe(1);
    expect(grade(ex, JSON.stringify(['habe', 'gefahren']))).toBe(0.5);
    expect(wordScore('Ich hätte gern vier Brötchen', 'ich hatte gern vier Brötchen')).toBe(0.8);
    expect(grade({ type: 'dictation', text: 'Kann ich mit Karte zahlen?' }, 'kann ich mit karte zahlen')).toBe(1);
  });
  it('refuse une phrase en contexte incohérente avec la conjugaison', () => {
    const pack = STATIC_PACKS.find((p) => p.id === 'verb-mouvement')!;
    const bad = JSON.parse(JSON.stringify(pack));
    bad.verbs[0].ctx = [{ t: 'perfekt', de: 'Ich [habe] nach Hause [gegangen].', fr: 'x' }];
    expect(validateAll([bad]).join(' ')).toMatch(/ne correspond à aucune forme/);
  });
  it('chaque pack de compétence a son support', () => {
    for (const p of STATIC_PACKS) {
      if (p.section === 'lecture') expect(p.reading, p.id).toBeTruthy();
      if (p.section === 'ecoute') expect(p.listening, p.id).toBeTruthy();
      if (p.section === 'ecriture' || p.section === 'oral') expect(p.task, p.id).toBeTruthy();
    }
  });
});

import { mergeStates } from './storage';
describe('synchronisation', () => {
  it('fusionne deux appareils sans rien perdre', () => {
    const ref = { k: 'vocab' as const, pack: 'p', de: 'Haus' };
    const a = {
      progress: { v: 1 as const, srs: { x: { ref, box: 2, due: '2026-11-20', seen: 3, wrong: 0, last: '2026-11-12' } }, tags: { T: { ok: 3, ko: 1 } },
        attempts: [{ pack: 'p', mode: 'exam' as const, date: '2026-11-12T10:00:00Z', score: 8, total: 10 }], days: ['2026-11-12'] },
      imported: [], writings: [{ id: 'w1', pack: 'e', date: '2026-11-12', text: 'a', sent: true }],
    };
    const b = {
      progress: { v: 1 as const, srs: { x: { ref, box: 0, due: '2026-11-14', seen: 4, wrong: 1, last: '2026-11-13' } }, tags: { T: { ok: 2, ko: 0 } },
        attempts: [{ pack: 'q', mode: 'practice' as const, date: '2026-11-13T09:00:00Z', score: 5, total: 6 }], days: ['2026-11-13'] },
      imported: [], writings: [],
    };
    const m = mergeStates(a, b);
    expect(m.progress.attempts).toHaveLength(2);
    expect(m.progress.days).toEqual(['2026-11-12', '2026-11-13']);
    expect(m.progress.srs.x.seen).toBe(4);
    expect(m.progress.tags.T).toEqual({ ok: 3, ko: 1 });
    expect(m.writings).toHaveLength(1);
    expect(mergeStates(m, m)).toEqual(m);
  });
});
