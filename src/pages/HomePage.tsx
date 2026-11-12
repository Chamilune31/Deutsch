import { Link } from 'react-router-dom';
import { dueItems, streak, today, useProgress } from '../lib/storage';
import { LEARN, nextUnlock, SKILLS, SECTION_LABEL, usePacks } from '../lib/packs';
import { packStatus, weakTags } from '../lib/recommend';
import { buildSession } from '../lib/session';
import { rngFrom } from '../lib/generate';
import { INTRO } from './SectionPage';
import { Icon } from '../components/Icons';
import type { Section } from '../lib/types';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Guten Morgen !' : h < 18 ? 'Guten Tag !' : 'Guten Abend !';
}

export function SectionTiles({ sections }: { sections: Section[] }) {
  const progress = useProgress();
  const { inSection, unlocked } = usePacks();
  return (
    <div className="tiles">
      {sections.map((s) => {
        const open = inSection(s).filter(unlocked);
        const done = open.filter((p) => packStatus(progress, p.id).practiced).length;
        const fresh = open.length - done;
        return (
          <Link key={s} to={`/${s}`} className={`tile s-${s}`}>
            <span className="section-icon">
              <Icon name={s} size={22} />
            </span>
            <span className="tile-body">
              <strong>{SECTION_LABEL[s]}</strong>
              <span className="muted small">{s === 'cours' ? 'Logan et Brayan' : INTRO[s as Exclude<Section, 'cours'>].text.split('.')[0]}</span>
              <span className="meter" aria-label={`${done} sur ${open.length} leçons travaillées`}>
                <i style={{ width: open.length ? `${(done / open.length) * 100}%` : 0 }} />
              </span>
              <span className="small tile-count">
                {done} / {open.length} travaillées{fresh > 0 ? `, ${fresh} à découvrir` : ''}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function HomePage() {
  const progress = useProgress();
  const { all, unlocked } = usePacks();
  const session = buildSession(progress, all, unlocked, rngFrom(Number(today().replace(/-/g, ''))));
  const total = session.exercises.length;
  const due = dueItems(progress).length;
  const next = nextUnlock();
  const weak = weakTags(progress).slice(0, 4);
  const st = streak(progress);
  const passed = all.filter((p) => packStatus(progress, p.id).bestExam >= 0.7).length;

  return (
    <div className="page home">
      <header className="home-head">
        <h1>{greeting()}</h1>
        <p className="lead">
          {st > 0 ? `${st} jour${st > 1 ? 's' : ''} d’affilée. ` : ''}
          Nouvelles leçons {next.inDays <= 1 ? 'demain' : `dans ${next.inDays} jours`}.
        </p>
      </header>

      <section className="today" aria-labelledby="today-title">
        <div className="today-text">
          <h2 id="today-title">Ta séance du jour</h2>
          <p>
            {total} questions, environ {Math.max(5, Math.round(total * 0.9))} minutes.
          </p>
          <ul>
            {session.parts.map((p) => (
              <li key={p.label}>
                <span>{p.label}</span>
                <span>{p.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <Link to="/seance" className="today-cta">
          Commencer la séance
        </Link>
      </section>

      <div className="kpis">
        <Link to="/revision" className="kpi">
          <b>{due}</b>
          <span>à réviser</span>
        </Link>
        <Link to="/progres" className="kpi">
          <b>{all.filter((p) => packStatus(progress, p.id).practiced).length}</b>
          <span>leçons travaillées</span>
        </Link>
        <Link to="/progres" className="kpi">
          <b>{passed}</b>
          <span>examens réussis</span>
        </Link>
      </div>

      <section>
        <h2>Apprendre</h2>
        <SectionTiles sections={LEARN} />
      </section>
      <section>
        <h2>Pratiquer les quatre compétences</h2>
        <SectionTiles sections={SKILLS} />
      </section>

      {weak.length > 0 && (
        <section>
          <h2>Tes points à travailler</h2>
          <ul className="weak">
            {weak.map((w) => (
              <li key={w.tag}>
                <span>{w.tag}</span>
                <span className="bar">
                  <i style={{ width: `${Math.round(w.rate * 100)}%` }} />
                </span>
                <span className="muted">{Math.round(w.rate * 100)} %</span>
              </li>
            ))}
          </ul>
          <Link to="/revision" className="btn">
            Retravailler mes erreurs
          </Link>
        </section>
      )}
    </div>
  );
}

export function HubPage({ kind }: { kind: 'apprendre' | 'pratiquer' }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>{kind === 'apprendre' ? 'Apprendre' : 'Pratiquer'}</h1>
        <p className="lead">
          {kind === 'apprendre'
            ? 'Grammaire, verbes et vocabulaire : les bases à consolider pour le B1.'
            : 'Les quatre épreuves du B1 : lire, écouter, écrire et parler.'}
        </p>
      </header>
      <SectionTiles sections={kind === 'apprendre' ? LEARN : SKILLS} />
      {kind === 'apprendre' && (
        <Link to="/progres" className="btn ghost">
          Voir mes progrès
        </Link>
      )}
    </div>
  );
}
