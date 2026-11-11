import { Link } from 'react-router-dom';
import { dueItems, streak, useProgress } from '../lib/storage';
import { nextUnlock, SECTION_LABEL, usePacks } from '../lib/packs';
import { dailyPlan, packStatus, weakTags } from '../lib/recommend';
import { PackCard } from '../components/PackCard';
import type { Section } from '../lib/types';

const ICON = { review: '🧠', new: '✨', weak: '🎯', exam: '📝' };

export function HomePage() {
  const progress = useProgress();
  const { all, unlocked, inSection } = usePacks();
  const plan = dailyPlan(progress, all, unlocked);
  const due = dueItems(progress).length;
  const done = all.filter((p) => packStatus(progress, p.id).practiced).length;
  const exams = all.filter((p) => packStatus(progress, p.id).bestExam >= 0.7).length;
  const next = nextUnlock();
  const weak = weakTags(progress).slice(0, 3);

  const featured = (['grammaire', 'verbes', 'vocabulaire'] as Section[])
    .map((s) => {
      const list = inSection(s).filter(unlocked);
      return list[list.length - 1];
    })
    .filter(Boolean);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Objectif B1</p>
          <h1>Hallo ! Prête pour ta séance ?</h1>
          <p className="muted">
            Nouveau contenu dans <strong>{next.inDays} jour{next.inDays > 1 ? 's' : ''}</strong>. Quinze minutes par jour suffisent pour progresser.
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <b>{streak(progress)}</b>
            <span>jours d’affilée 🔥</span>
          </div>
          <div className="stat">
            <b>{due}</b>
            <span>à réviser</span>
          </div>
          <div className="stat">
            <b>{done}</b>
            <span>leçons travaillées</span>
          </div>
          <div className="stat">
            <b>{exams}</b>
            <span>examens réussis</span>
          </div>
        </div>
      </header>

      <section>
        <h2>Ton plan du jour</h2>
        {plan.length === 0 ? (
          <p className="muted">Tout est à jour. Profites-en pour relire une leçon de l’archive !</p>
        ) : (
          <ol className="plan">
            {plan.map((r, i) => (
              <li key={i}>
                <Link to={r.to} className={`plan-item kind-${r.kind}`}>
                  <span className="plan-icon" aria-hidden>
                    {ICON[r.kind]}
                  </span>
                  <span>
                    <strong>{r.title}</strong>
                    <span className="muted">{r.detail}</span>
                  </span>
                  <span className="go" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>À la une</h2>
        <div className="grid">
          {featured.map((p) => (
            <div key={p.id}>
              <p className="eyebrow">{SECTION_LABEL[p.section]}</p>
              <PackCard pack={p} isNew />
            </div>
          ))}
        </div>
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
        </section>
      )}
    </div>
  );
}
