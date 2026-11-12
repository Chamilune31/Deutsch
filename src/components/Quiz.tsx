import { useEffect, useRef, useState } from 'react';
import type { Exercise, Result } from '../lib/types';
import { expectedLabel, grade } from '../lib/grade';
import { ExerciseView, givenLabel } from './ExerciseView';
import { Rich } from './Rich';
import { TENSE_SHORT } from '../lib/verbs';

type Mode = 'practice' | 'exam' | 'review';

function questionLabel(ex: Exercise): string {
  if (ex.type === 'conjugation') return `${ex.verb} — ${TENSE_SHORT[ex.tense]}`;
  if (ex.type === 'cloze') return ex.text.replace(/\[[^\]]*\]/g, '___');
  if (ex.type === 'dictation') return 'Dictée';
  return ex.q ?? 'Exercice';
}

function scoreOf(ex: Exercise, given: string) {
  return grade(ex, ex.type === 'order' ? givenLabel(ex, given) : given);
}

function hasAnswer(ex: Exercise, given: string) {
  if (!given) return false;
  if (ex.type === 'match' || ex.type === 'conjugation' || ex.type === 'cloze') {
    try {
      return (JSON.parse(given) as string[]).some((v) => v && v.trim());
    } catch {
      return false;
    }
  }
  return given.trim().length > 0;
}

export function Quiz({
  exercises,
  mode,
  timeLimitSec,
  onFinish,
  onRestart,
  passMark = 0.7,
}: {
  exercises: Exercise[];
  mode: Mode;
  timeLimitSec?: number;
  onFinish: (results: Result[]) => void;
  onRestart: () => void;
  passMark?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [givens, setGivens] = useState<string[]>(() => exercises.map(() => ''));
  const [revealed, setRevealed] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [results, setResults] = useState<Result[] | null>(null);
  const [left, setLeft] = useState(timeLimitSec ?? 0);
  const finished = useRef(false);

  const ex = exercises[idx];
  const given = givens[idx] ?? '';
  const isExam = mode === 'exam';

  function finish(gs = givens, ov = overrides) {
    if (finished.current) return;
    finished.current = true;
    const res: Result[] = exercises.map((e, i) => ({
      ex: e,
      given: givenLabel(e, gs[i]),
      expected: expectedLabel(e),
      score: ov[i] ? 1 : scoreOf(e, gs[i]),
    }));
    setResults(res);
    onFinish(res);
  }

  useEffect(() => {
    if (!isExam || !timeLimitSec || results) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [isExam, timeLimitSec, results]);

  useEffect(() => {
    if (isExam && timeLimitSec && left <= 0 && !results) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  if (!exercises.length) return <p className="muted">Aucun exercice disponible.</p>;

  if (results) {
    const total = results.reduce((s, r) => s + r.score, 0);
    const pct = Math.round((total / results.length) * 100);
    const passed = total / results.length >= passMark;
    return (
      <div className="results">
        <div className={`score-card ${isExam ? (passed ? 'pass' : 'fail') : ''}`}>
          <div className="score-big">{pct} %</div>
          <div>
            {total.toFixed(total % 1 ? 1 : 0)} / {results.length} —{' '}
            {isExam
              ? passed
                ? 'Examen réussi 🎉'
                : `Examen à repasser (seuil : ${Math.round(passMark * 100)} %)`
              : pct >= 80
                ? 'Très bien !'
                : pct >= 50
                  ? 'Pas mal, continue !'
                  : 'On s’accroche, les erreurs reviendront en révision.'}
          </div>
        </div>
        <ol className="result-list">
          {results.map((r, i) => (
            <li key={i} className={r.score >= 0.999 ? 'ok' : r.score > 0 ? 'partial' : 'ko'}>
              <div className="result-q">
                <Rich text={questionLabel(r.ex)} />
              </div>
              <div className="result-a">
                <span>Ta réponse : {r.given}</span>
                {r.score < 0.999 && <span>Attendu : {r.expected}</span>}
                {r.ex.why && r.score < 0.999 && (
                  <span className="why">
                    <Rich text={r.ex.why} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
        <button className="btn primary" type="button" onClick={onRestart}>
          Recommencer avec de nouvelles questions
        </button>
      </div>
    );
  }

  const correct = revealed && (overrides[idx] || scoreOf(ex, given) >= 0.999);
  const last = idx === exercises.length - 1;

  function next() {
    if (last) finish();
    else {
      setIdx(idx + 1);
      setRevealed(false);
    }
  }

  function primary() {
    if (isExam) return next();
    if (!revealed) {
      if (hasAnswer(ex, given) || ex.type === 'mcq') setRevealed(true);
      return;
    }
    next();
  }

  return (
    <div className="quiz">
      <div className="quiz-head">
        <span>
          Question {idx + 1} / {exercises.length}
        </span>
        {isExam && timeLimitSec ? (
          <span className={`timer ${left < 60 ? 'warn' : ''}`}>
            ⏱ {Math.floor(Math.max(0, left) / 60)}:{String(Math.max(0, left) % 60).padStart(2, '0')}
          </span>
        ) : null}
      </div>
      <div className="progress-bar">
        <div style={{ width: `${(idx / exercises.length) * 100}%` }} />
      </div>

      <ExerciseView
        key={idx}
        ex={ex}
        given={given}
        revealed={revealed}
        onEnter={primary}
        onChange={(v) => setGivens((g) => g.map((x, i) => (i === idx ? v : x)))}
      />

      {revealed && (
        <div className={`feedback ${correct ? 'ok' : 'ko'}`}>
          <strong>{correct ? '✓ Correct' : scoreOf(ex, given) > 0 ? '◐ Partiellement juste' : '✗ Pas tout à fait'}</strong>
          {!correct && (
            <div>
              Réponse : <Rich text={expectedLabel(ex)} />
            </div>
          )}
          {ex.why && (
            <div className="why">
              <Rich text={ex.why} />
            </div>
          )}
          {!correct && ex.type === 'translate' && (
            <button
              type="button"
              className="btn small ghost"
              onClick={() => setOverrides((o) => ({ ...o, [idx]: true }))}
            >
              Ma réponse était aussi correcte
            </button>
          )}
        </div>
      )}

      <div className="quiz-actions">
        {isExam && idx > 0 && (
          <button className="btn ghost" type="button" onClick={() => setIdx(idx - 1)}>
            Précédente
          </button>
        )}
        <button
          className="btn primary"
          type="button"
          onClick={primary}
          disabled={!isExam && !revealed && !hasAnswer(ex, given)}
        >
          {isExam ? (last ? 'Terminer l’examen' : 'Suivante') : revealed ? (last ? 'Voir le bilan' : 'Suivante') : 'Vérifier'}
        </button>
      </div>
    </div>
  );
}
