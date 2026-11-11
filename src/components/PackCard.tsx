import { Link } from 'react-router-dom';
import type { Pack } from '../lib/types';
import { useProgress } from '../lib/storage';
import { packStatus } from '../lib/recommend';
import { releaseDate } from '../lib/packs';

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function PackCard({ pack, locked, isNew }: { pack: Pack; locked?: boolean; isNew?: boolean }) {
  const st = packStatus(useProgress(), pack.id);
  if (locked)
    return (
      <div className="pack-card locked" aria-disabled>
        <div className="pack-top">
          <span className="badge">{pack.level}</span>
          <span className="badge soft">🔒 {fmtDate(releaseDate(pack))}</span>
        </div>
        <h4>{pack.title}</h4>
        <p className="muted">Se débloque automatiquement.</p>
      </div>
    );
  return (
    <Link to={`/pack/${pack.id}`} className="pack-card">
      <div className="pack-top">
        <span className="badge">{pack.level}</span>
        {isNew && !st.practiced && <span className="badge new">Nouveau</span>}
        {pack.teacher && <span className="badge soft">{pack.teacher === 'logan' ? 'Logan' : 'Brayan'}</span>}
      </div>
      <h4>{pack.title}</h4>
      <p className="muted">{pack.summary}</p>
      <div className="pack-status">
        <span className={st.practiced ? 'done' : ''}>
          {st.practiced ? `✓ Exercices ${Math.round(st.bestPractice * 100)} %` : '○ Exercices'}
        </span>
        <span className={st.examTaken ? (st.bestExam >= 0.7 ? 'done' : 'warn') : ''}>
          {st.examTaken ? `${st.bestExam >= 0.7 ? '✓' : '↻'} Examen ${Math.round(st.bestExam * 100)} %` : '○ Examen'}
        </span>
      </div>
    </Link>
  );
}

export { fmtDate };
