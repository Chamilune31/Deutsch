import { useMemo, useState } from 'react';
import { dueItems, getProgress, recordResults, useProgress } from '../lib/storage';
import { usePacks } from '../lib/packs';
import { exerciseFromRef, rngFrom, shuffle } from '../lib/generate';
import { Quiz } from '../components/Quiz';
import type { Exercise } from '../lib/types';

const MAX = 20;

export function ReviewPage() {
  const progress = useProgress();
  const { byId } = usePacks();
  const [run, setRun] = useState(0);
  const [mode, setMode] = useState<'due' | 'hard' | null>(null);
  const due = dueItems(progress);
  const hard = Object.values(progress.srs).filter((s) => s.wrong > 0);

  const exercises = useMemo(() => {
    if (!mode) return [];
    const rng = rngFrom(Date.now() + run);
    const p = getProgress();
    const items =
      mode === 'due'
        ? dueItems(p).slice(0, MAX)
        : shuffle(Object.values(p.srs).filter((s) => s.wrong > 0), rng)
            .sort((a, b) => b.wrong / b.seen - a.wrong / a.seen)
            .slice(0, MAX);
    return shuffle(
      items.map((s) => exerciseFromRef(s.ref, byId, rng)).filter((x): x is Exercise => !!x),
      rng,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, run, byId]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Révision</h1>
        <p className="muted">
          Chaque élément que tu travailles revient selon la répétition espacée : 1, 2, 4, 8, 16 puis 32 jours si tu réponds juste, dès le lendemain si tu te trompes.
        </p>
      </header>

      {!mode && (
        <div className="grid">
          <button className="pack-card action" type="button" disabled={!due.length} onClick={() => setMode('due')}>
            <h4>🧠 Révision du jour</h4>
            <p className="muted">
              {due.length ? `${due.length} élément${due.length > 1 ? 's' : ''} à revoir (max. ${MAX} par séance)` : 'Rien à revoir aujourd’hui, bravo !'}
            </p>
          </button>
          <button className="pack-card action" type="button" disabled={!hard.length} onClick={() => setMode('hard')}>
            <h4>🎯 Mes erreurs fréquentes</h4>
            <p className="muted">
              {hard.length ? `${hard.length} élément${hard.length > 1 ? 's' : ''} déjà ratés au moins une fois` : 'Aucune erreur enregistrée pour l’instant.'}
            </p>
          </button>
        </div>
      )}

      {mode && (
        <div className="card">
          <button type="button" className="back linklike" onClick={() => setMode(null)}>
            ← Changer de mode
          </button>
          <Quiz
            key={`${mode}${run}`}
            exercises={exercises}
            mode="review"
            onFinish={(r) => recordResults('review', null, r)}
            onRestart={() => setRun((x) => x + 1)}
          />
        </div>
      )}
    </div>
  );
}
