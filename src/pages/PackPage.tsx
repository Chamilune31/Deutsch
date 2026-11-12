import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { releaseDate, SECTION_LABEL, usePacks } from '../lib/packs';
import { examSet, practiceSet, rngFrom, wordLabel } from '../lib/generate';
import { recordResults } from '../lib/storage';
import { Blocks, Rich, SpeakButton } from '../components/Rich';
import { VerbTables } from '../components/VerbTable';
import { Quiz } from '../components/Quiz';
import { fmtDate } from '../components/PackCard';
import { AudioPlayer } from '../components/AudioPlayer';
import { WritingPanel } from '../components/WritingPanel';
import { ModelAnswer, SpeakingPanel } from '../components/SpeakingPanel';
import type { Pack } from '../lib/types';

type Tab = 'lesson' | 'practice' | 'exam' | 'model';

const TABS: Record<string, [Tab, string][]> = {
  default: [
    ['lesson', 'Leçon'],
    ['practice', 'Exercices'],
    ['exam', 'Examen'],
  ],
  lecture: [
    ['lesson', 'Texte'],
    ['practice', 'Questions'],
    ['exam', 'Examen'],
  ],
  ecoute: [
    ['lesson', 'Écouter'],
    ['practice', 'Questions'],
    ['exam', 'Examen'],
  ],
  ecriture: [
    ['lesson', 'Sujet'],
    ['practice', 'Rédiger'],
    ['model', 'Exemple de copie'],
  ],
  oral: [
    ['lesson', 'Sujet'],
    ['practice', 'S’entraîner'],
    ['model', 'Réponse modèle'],
  ],
};

function VocabList({ pack }: { pack: Pack }) {
  return (
    <div className="vocab-list">
      {(pack.vocab ?? []).map((w) => (
        <div key={w.de} className="vocab-item">
          <div className="vocab-de">
            <SpeakButton text={wordLabel(w)} />
            {w.article && <span className={`art ${w.article}`}>{w.article}</span>}
            <strong>{w.de}</strong>
            {w.plural && <span className="muted small"> pl. {w.plural === '-' ? 'aucun' : `die ${w.plural}`}</span>}
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

function Glossary({ items }: { items?: { de: string; fr: string }[] }) {
  if (!items?.length) return null;
  return (
    <div className="glossary">
      <h4>Mots utiles</h4>
      <dl>
        {items.map((g) => (
          <div key={g.de}>
            <dt>{g.de}</dt>
            <dd>{g.fr}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReadingText({ pack }: { pack: Pack }) {
  const r = pack.reading!;
  return (
    <article className="reading">
      <p className="reading-kind">{r.kind}</p>
      <h3>{r.title}</h3>
      {r.paragraphs.map((p, i) =>
        p.trim() === '---' ? (
          <hr key={i} />
        ) : (
          <p key={i} className="pre">
            <Rich text={p} />
          </p>
        ),
      )}
    </article>
  );
}

/** Support (texte ou audio) affiché à côté des questions. */
function Support({ pack, children }: { pack: Pack; children: ReactNode }) {
  if (pack.section === 'lecture')
    return (
      <div className="split">
        <div className="split-aside">
          <ReadingText pack={pack} />
        </div>
        <div className="split-main">{children}</div>
      </div>
    );
  if (pack.section === 'ecoute')
    return (
      <>
        <AudioPlayer doc={pack.listening!} transcript="hidden" />
        {children}
      </>
    );
  return <>{children}</>;
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
        <Link to="/">Retour à l’accueil</Link>
      </div>
    );

  if (!unlocked(pack))
    return (
      <div className="page">
        <h1>{pack.title}</h1>
        <p className="lead">Cette leçon sera disponible {fmtDate(releaseDate(pack))}.</p>
      </div>
    );

  const backTo = pack.section === 'cours' ? '/cours' : `/${pack.section}`;
  const timeLimit = Math.max(300, exam.length * (pack.section === 'lecture' || pack.section === 'ecoute' ? 70 : 50));
  const tabs = TABS[pack.section] ?? TABS.default;
  const setTab = (t: Tab) => {
    setParams(t === 'lesson' ? {} : { tab: t });
    setExamStarted(false);
    setRun((r) => r + 1);
    window.scrollTo({ top: 0 });
  };
  const nextLabel = tabs[1][1];

  return (
    <div className={`page s-${pack.section}`}>
      <Link to={backTo} className="back">
        {SECTION_LABEL[pack.section]}
      </Link>
      <header className="page-head">
        <div className="pack-top">
          <span className="level">{pack.level}</span>
          <span className="tag">{pack.topic}</span>
          {pack.teacher && <span className="tag">Cours avec {pack.teacher === 'logan' ? 'Logan' : 'Brayan'}</span>}
        </div>
        <h1>{pack.title}</h1>
        <p className="lead">{pack.summary}</p>
      </header>

      <div className="tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'lesson' && (
        <div className="card">
          {pack.section === 'lecture' && (
            <>
              <ReadingText pack={pack} />
              <Glossary items={pack.reading?.glossary} />
            </>
          )}
          {pack.section === 'ecoute' && (
            <>
              <AudioPlayer doc={pack.listening!} />
              <Glossary items={pack.listening?.glossary} />
            </>
          )}
          {(pack.section === 'ecriture' || pack.section === 'oral') && pack.task && (
            <div className="task-brief">
              <p className="q">
                <Rich text={pack.task.prompt} />
              </p>
              <ul className="checklist">
                {pack.task.points.map((p, i) => (
                  <li key={i}>
                    <Rich text={p} />
                  </li>
                ))}
              </ul>
              <Glossary items={pack.task.phrases} />
            </div>
          )}
          <Blocks blocks={pack.lesson} />
          {pack.verbs && pack.verbs.length > 0 && <VerbTables verbs={pack.verbs} />}
          {pack.vocab && pack.vocab.length > 0 && <VocabList pack={pack} />}
          <div className="quiz-actions">
            <button className="btn primary" type="button" onClick={() => setTab('practice')}>
              {pack.section === 'ecriture' ? 'Rédiger mon texte' : pack.section === 'oral' ? 'M’entraîner' : `Passer aux ${nextLabel.toLowerCase()}`}
            </button>
          </div>
        </div>
      )}

      {tab === 'practice' && pack.section === 'ecriture' && (
        <div className="card">
          <WritingPanel pack={pack} />
        </div>
      )}
      {tab === 'practice' && pack.section === 'oral' && (
        <div className="card">
          <SpeakingPanel pack={pack} />
        </div>
      )}
      {tab === 'model' && pack.task && (
        <div className="card">
          <p className="muted">
            {pack.section === 'ecriture'
              ? 'Lis-la après avoir écrit ta propre version : repère les tournures que tu pourrais réutiliser.'
              : 'Écoute-la après ton essai, puis recommence en reprenant deux ou trois tournures.'}
          </p>
          <ModelAnswer text={pack.task.model} fr={pack.task.modelFr} />
        </div>
      )}

      {tab === 'practice' && pack.section !== 'ecriture' && pack.section !== 'oral' && (
        <div className="card">
          <Support pack={pack}>
            <Quiz
              key={`p${run}`}
              exercises={practice}
              mode="practice"
              onFinish={(r) => recordResults('practice', pack.id, r)}
              onRestart={() => setRun((x) => x + 1)}
            />
          </Support>
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
                <li>Pas de correction avant la fin. Seuil de réussite : 70 %</li>
              </ul>
              <button className="btn primary" type="button" onClick={() => setExamStarted(true)}>
                Commencer l’examen
              </button>
            </div>
          ) : (
            <Support pack={pack}>
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
            </Support>
          )}
        </div>
      )}
    </div>
  );
}
