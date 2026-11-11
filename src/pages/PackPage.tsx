import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SECTION_LABEL, usePacks } from '../lib/packs';
import { examSet, practiceSet, rngFrom, wordLabel } from '../lib/generate';
import { recordResults } from '../lib/storage';
import { Blocks, SpeakButton } from '../components/Rich';
import { VerbTables } from '../components/VerbTable';
import { Quiz } from '../components/Quiz';
import { fmtDate } from '../components/PackCard';
import { releaseDate } from '../lib/packs';
import type { Pack } from '../lib/types';

type Tab = 'lesson' | 'practice' | 'exam';

function VocabList({ pack }: { pack: Pack }) {
  return (
    <div className="vocab-list">
      {(pack.vocab ?? []).map((w) => (
        <div key={w.de} className="vocab-item">
          <div className="vocab-de">
            <SpeakButton text={wordLabel(w)} />
            {w.article && <span className={`art ${w.article}`}>{w.article}</span>}
            <strong>{w.de}</strong>
            {w.plural && <span className="muted"> · pl. {w.plural === '-' ? '—' : `die ${w.plural}`}</span>}
          </div>
          <div className="vocab-fr">{w.fr}</div>
          {w.ex && (
            <div className="vocab-ex">
              <span>{w.ex.de}</span>
              <span className="muted">{w.ex.fr}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function PackPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { byId, unlocked } = usePacks();
  const pack = byId.get(id ?? '');
  const tab = (params.get('tab') as Tab) || 'lesson';
  const [run, setRun] = useState(0);
  const [examStarted, setExamStarted] = useState(false);

  const practice = useMemo(() => (pack ? practiceSet(pack, rngFrom(Date.now() + run)) : []), [pack, run]);
  const exam = useMemo(() => (pack ? examSet(pack, rngFrom(Date.now() * 7 + run)) : []), [pack, run]);

  if (!pack)
    return (
      <div className="page">
        <p>Leçon introuvable.</p>
        <Link to="/">← Accueil</Link>
      </div>
    );

  if (!unlocked(pack))
    return (
      <div className="page">
        <h1>🔒 {pack.title}</h1>
        <p className="muted">Cette leçon sera disponible le {fmtDate(releaseDate(pack))}</p>
      </div>
    );

  const backTo = pack.section === 'cours' ? '/cours' : `/${pack.section}`;
  const timeLimit = Math.max(300, exam.length * 50);
  const setTab = (t: Tab) => {
    setParams(t === 'lesson' ? {} : { tab: t });
    setExamStarted(false);
    setRun((r) => r + 1);
  };

  return (
    <div className="page">
      <Link to={backTo} className="back">
        ← {SECTION_LABEL[pack.section]}
      </Link>
      <header className="page-head">
        <div className="pack-top">
          <span className="badge">{pack.level}</span>
          <span className="badge soft">{pack.topic}</span>
          {pack.teacher && <span className="badge soft">Cours avec {pack.teacher === 'logan' ? 'Logan' : 'Brayan'}</span>}
        </div>
        <h1>{pack.title}</h1>
        <p className="muted">{pack.summary}</p>
      </header>

      <div className="tabs" role="tablist">
        {(
          [
            ['lesson', '📖 Leçon'],
            ['practice', '✏️ Exercices'],
            ['exam', '📝 Examen'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'lesson' && (
        <div className="card">
          <Blocks blocks={pack.lesson} />
          {pack.verbs && pack.verbs.length > 0 && <VerbTables verbs={pack.verbs} />}
          {pack.vocab && pack.vocab.length > 0 && <VocabList pack={pack} />}
          <div className="quiz-actions">
            <button className="btn primary" type="button" onClick={() => setTab('practice')}>
              Passer aux exercices →
            </button>
          </div>
        </div>
      )}

      {tab === 'practice' && (
        <div className="card">
          <Quiz
            key={`p${run}`}
            exercises={practice}
            mode="practice"
            onFinish={(r) => recordResults('practice', pack.id, r)}
            onRestart={() => setRun((x) => x + 1)}
          />
        </div>
      )}

      {tab === 'exam' && (
        <div className="card">
          {!examStarted ? (
            <div className="exam-intro">
              <h3>Examen : {pack.title}</h3>
              <ul>
                <li>{exam.length} questions</li>
                <li>Durée : {Math.round(timeLimit / 60)} minutes</li>
                <li>Pas de correction avant la fin, seuil de réussite : 70 %</li>
              </ul>
              <button className="btn primary" type="button" onClick={() => setExamStarted(true)}>
                Commencer l’examen
              </button>
            </div>
          ) : (
            <Quiz
              key={`e${run}`}
              exercises={exam}
              mode="exam"
              timeLimitSec={timeLimit}
              onFinish={(r) => recordResults('exam', pack.id, r)}
              onRestart={() => {
                setRun((x) => x + 1);
                setExamStarted(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
