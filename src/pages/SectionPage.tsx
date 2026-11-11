import { useState } from 'react';
import type { Pack, Section, VerbKind } from '../lib/types';
import { usePacks } from '../lib/packs';
import { KIND_LABEL } from '../lib/verbs';
import { PackCard } from '../components/PackCard';

const INTRO: Record<Exclude<Section, 'cours'>, { title: string; text: string }> = {
  grammaire: {
    title: 'Grammaire',
    text: 'Les points clés de A2 à B1 : cas, prépositions, subordonnées, adjectifs… Chaque leçon a ses exercices et son examen.',
  },
  verbes: {
    title: 'Verbes',
    text: 'Par thème ou par type, au Präsens, Perfekt, Präteritum et Futur I. Les tableaux et les exercices sont générés à partir de chaque verbe.',
  },
  vocabulaire: {
    title: 'Vocabulaire',
    text: 'Un thème par leçon, toujours avec l’article et le pluriel. Clique sur 🔊 pour écouter.',
  },
};

export function SectionPage({ section }: { section: Exclude<Section, 'cours'> }) {
  const { inSection, unlocked, slot } = usePacks();
  const [level, setLevel] = useState<'all' | 'A2' | 'B1'>('all');
  const [kind, setKind] = useState<VerbKind | 'all'>('all');
  const [topic, setTopic] = useState<string>('all');

  const packs = inSection(section);
  const kinds = Array.from(new Set(packs.flatMap((p) => p.verbs?.flatMap((v) => v.kinds) ?? []))) as VerbKind[];
  const topics = Array.from(new Set(packs.filter(unlocked).map((p) => p.topic)));

  const match = (p: Pack) =>
    (level === 'all' || p.level === level) &&
    (kind === 'all' || p.verbs?.some((v) => v.kinds.includes(kind))) &&
    (topic === 'all' || p.topic === topic);

  const open = packs.filter((p) => unlocked(p) && match(p));
  const maxRelease = Math.max(-1, ...packs.filter(unlocked).map((p) => p.release ?? 0));
  const featured = open.filter((p) => (p.release ?? 0) === maxRelease || (p.release ?? 0) === slot);
  const archive = open.filter((p) => !featured.includes(p)).reverse();
  const locked = packs.filter((p) => !unlocked(p)).slice(0, 4);

  return (
    <div className="page">
      <header className="page-head">
        <h1>{INTRO[section].title}</h1>
        <p className="muted">{INTRO[section].text}</p>
      </header>

      <div className="filters">
        <div className="chips" aria-label="Niveau">
          {(['all', 'A2', 'B1'] as const).map((l) => (
            <button key={l} type="button" className={`chip ${level === l ? 'on' : ''}`} onClick={() => setLevel(l)}>
              {l === 'all' ? 'Tous niveaux' : l}
            </button>
          ))}
        </div>
        {section === 'verbes' && kinds.length > 0 && (
          <div className="chips" aria-label="Type de verbe">
            <button type="button" className={`chip ${kind === 'all' ? 'on' : ''}`} onClick={() => setKind('all')}>
              Tous types
            </button>
            {kinds.map((k) => (
              <button key={k} type="button" className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        )}
        {section !== 'grammaire' && topics.length > 1 && (
          <div className="chips" aria-label="Thème">
            <button type="button" className={`chip ${topic === 'all' ? 'on' : ''}`} onClick={() => setTopic('all')}>
              Tous thèmes
            </button>
            {topics.map((t) => (
              <button key={t} type="button" className={`chip ${topic === t ? 'on' : ''}`} onClick={() => setTopic(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {featured.length > 0 && (
        <section>
          <h2>À la une</h2>
          <div className="grid">
            {featured.map((p) => (
              <PackCard key={p.id} pack={p} isNew />
            ))}
          </div>
        </section>
      )}

      {archive.length > 0 && (
        <section>
          <h2>Archive</h2>
          <div className="grid">
            {archive.map((p) => (
              <PackCard key={p.id} pack={p} />
            ))}
          </div>
        </section>
      )}

      {open.length === 0 && <p className="muted">Aucune leçon ne correspond à ces filtres.</p>}

      {locked.length > 0 && (
        <section>
          <h2>Bientôt</h2>
          <div className="grid">
            {locked.map((p) => (
              <PackCard key={p.id} pack={p} locked />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
