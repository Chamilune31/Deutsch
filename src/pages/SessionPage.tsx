import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgress, recordResults } from '../lib/storage';
import { usePacks } from '../lib/packs';
import { rngFrom } from '../lib/generate';
import { buildSession } from '../lib/session';
import { Quiz } from '../components/Quiz';

export function SessionPage() {
  const { all, unlocked } = usePacks();
  const [run, setRun] = useState(0);
  const session = useMemo(
    () => buildSession(getProgress(), all, unlocked, rngFrom(Date.now() + run)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );

  return (
    <div className="page">
      <Link to="/" className="back">
        Accueil
      </Link>
      <header className="page-head">
        <h1>Séance du jour</h1>
        <p className="lead">{session.parts.map((p) => `${p.label} (${p.count})`).join(', ')}</p>
      </header>
      <div className="card">
        <Quiz
          key={run}
          exercises={session.exercises}
          mode="review"
          onFinish={(r) => recordResults('review', null, r)}
          onRestart={() => setRun((x) => x + 1)}
        />
      </div>
    </div>
  );
}
