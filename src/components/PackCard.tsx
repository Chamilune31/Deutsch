import { Link } from 'react-router-dom';
import type { Pack } from '../lib/types';
import { useProgress } from '../lib/storage';
import { packStatus } from '../lib/recommend';
import { releaseDate } from '../lib/packs';

export function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

const NOEXAM = new Set(['ecriture', 'oral']);

export function PackCard({ pack, locked, isNew }: { pack: Pack; locked?: boolean; isNew?: boolean }) {
  const st = packStatus(useProgress(), pack.id);
  if (locked)
    return (
      <div className={`pack-card s-${pack.section} locked`} aria-disabled>
        <h4>{pack.title}</h4>
        <p className="muted small">Disponible {fmtDate(releaseDate(pack))}</p>
      </div>
    );
  const done = st.examTaken && st.bestExam >= 0.7;
  return (
    <Link to={`/pack/${pack.id}`} className={`pack-card s-${pack.section} ${done ? 'is-done' : ''}`}>
      <div className="pack-top">
        <span className="level">{pack.level}</span>
        {pack.teacher && <span className="tag">{pack.teacher === 'logan' ? 'Logan' : 'Brayan'}</span>}
        {isNew && !st.practiced && <span className="tag new">Nouveau</span>}
      </div>
      <h4>{pack.title}</h4>
      <p className="pack-summary">{pack.summary}</p>
      <div className="pack-status">
        {NOEXAM.has(pack.section) ? (
          <span className={st.practiced ? 'done' : ''}>{st.practiced ? 'Fait' : 'À faire'}</span>
        ) : (
          <>
            <span className={st.practiced ? 'done' : ''}>
              {st.practiced ? `Exercices ${Math.round(st.bestPractice * 100)} %` : 'Exercices à faire'}
            </span>
            <span className={st.examTaken ? (done ? 'done' : 'warn') : ''}>
              {st.examTaken ? `Examen ${Math.round(st.bestExam * 100)} %` : 'Examen à passer'}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}
