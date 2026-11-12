import { useRef, useState } from 'react';
import { exportProgress, importProgress, INTERVALS, resetProgress, streak, useProgress } from '../lib/storage';
import { usePacks } from '../lib/packs';
import { packStatus } from '../lib/recommend';

const MODE = { practice: 'Exercices', exam: 'Examen', review: 'Révision' };

export function ProgressPage() {
  const p = useProgress();
  const { all, byId } = usePacks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const tags = Object.entries(p.tags)
    .map(([tag, t]) => ({ tag, total: t.ok + t.ko, rate: t.ok / Math.max(1e-9, t.ok + t.ko) }))
    .filter((t) => t.total >= 1)
    .sort((a, b) => a.rate - b.rate);
  const boxes = INTERVALS.map((_, i) => Object.values(p.srs).filter((s) => s.box === i).length);
  const maxBox = Math.max(1, ...boxes);
  const exams = p.attempts.filter((a) => a.mode === 'exam');
  const passed = all.filter((pk) => packStatus(p, pk.id).bestExam >= 0.7).length;

  function download() {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `deutsch-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Progrès</h1>
        <p className="lead">Ta progression est enregistrée dans ce navigateur. Fais une sauvegarde pour la retrouver sur un autre appareil.</p>
      </header>

      <div className="stats wide">
        <div className="stat">
          <b>{streak(p)}</b>
          <span>jours d’affilée</span>
        </div>
        <div className="stat">
          <b>{p.days.length}</b>
          <span>jours actifs</span>
        </div>
        <div className="stat">
          <b>{Object.keys(p.srs).length}</b>
          <span>éléments suivis</span>
        </div>
        <div className="stat">
          <b>
            {passed} / {exams.length}
          </b>
          <span>examens réussis / passés</span>
        </div>
      </div>

      <section className="card">
        <h2>Mémorisation</h2>
        <p className="muted">Plus un élément est à droite, mieux il est ancré.</p>
        <div className="boxes">
          {boxes.map((n, i) => (
            <div key={i} className="box-col">
              <div className="box-bar" style={{ height: `${(n / maxBox) * 100}%` }} title={`${n} éléments`} />
              <span className="box-n">{n}</span>
              <span className="muted">{INTERVALS[i]} j</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Réussite par thème</h2>
        {tags.length === 0 ? (
          <p className="muted">Fais quelques exercices pour voir tes statistiques.</p>
        ) : (
          <ul className="weak">
            {tags.map((t) => (
              <li key={t.tag}>
                <span>{t.tag}</span>
                <span className={`bar ${t.rate >= 0.75 ? 'good' : ''}`}>
                  <i style={{ width: `${Math.round(t.rate * 100)}%` }} />
                </span>
                <span className="muted">
                  {Math.round(t.rate * 100)} % · {Math.round(t.total)} q.
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Historique</h2>
        {p.attempts.length === 0 ? (
          <p className="muted">Aucune séance pour l’instant.</p>
        ) : (
          <table className="history">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Leçon</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {[...p.attempts]
                .reverse()
                .slice(0, 20)
                .map((a, i) => (
                  <tr key={i}>
                    <td>{new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td>
                    <td>{MODE[a.mode]}</td>
                    <td>{a.pack ? (byId.get(a.pack)?.title ?? a.pack) : '—'}</td>
                    <td>{a.total ? Math.round((a.score / a.total) * 100) : 0} %</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Sauvegarde</h2>
        <div className="row">
          <button className="btn" type="button" onClick={download}>
            Télécharger ma sauvegarde
          </button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()}>
            Restaurer une sauvegarde
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importProgress(await f.text());
                setMsg('Sauvegarde restaurée.');
              } catch (err) {
                setMsg((err as Error).message);
              }
            }}
          />
          {!confirmReset ? (
            <button className="btn ghost danger" type="button" onClick={() => setConfirmReset(true)}>
              Réinitialiser
            </button>
          ) : (
            <button
              className="btn danger"
              type="button"
              onClick={() => {
                resetProgress();
                setConfirmReset(false);
                setMsg('Progression remise à zéro.');
              }}
            >
              Confirmer : tout effacer
            </button>
          )}
        </div>
        {msg && <p>{msg}</p>}
      </section>
    </div>
  );
}
