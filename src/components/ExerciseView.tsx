import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise } from '../lib/types';
import { PRONOUNS, TENSE_LABEL } from '../lib/verbs';
import { clozeSolution, parseCloze, same, wordScore } from '../lib/grade';
import { canSpeak, speak } from '../lib/speech';
import { Rich, SpeakButton } from './Rich';

/* ---------- Insertion des caractères allemands ---------- */

let activeInsert: ((ch: string) => void) | null = null;

export function UmlautBar() {
  return (
    <div className="umlauts" aria-label="Caractères allemands">
      {['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map((c) => (
        <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => activeInsert?.(c)}>
          {c}
        </button>
      ))}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  disabled,
  placeholder,
  status,
  autoFocus,
  onEnter,
  label,
  width,
}: {
  width?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  status?: 'ok' | 'ko';
  autoFocus?: boolean;
  onEnter?: () => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const style = width ? { width } : undefined;
  return (
    <input
      ref={ref}
      className={`text-input ${status ?? ''}`}
      style={style}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      autoFocus={autoFocus}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      onFocus={() => {
        activeInsert = (ch) => {
          const el = ref.current;
          if (!el) return;
          const s = el.selectionStart ?? el.value.length;
          const t = el.selectionEnd ?? s;
          onChange(el.value.slice(0, s) + ch + el.value.slice(t));
          requestAnimationFrame(() => el.setSelectionRange(s + 1, s + 1));
        };
      }}
    />
  );
}

function parseArr(s: string, n: number): string[] {
  try {
    const v = JSON.parse(s);
    if (Array.isArray(v)) return Array.from({ length: n }, (_, i) => String(v[i] ?? ''));
  } catch {
    /* vide */
  }
  return Array.from({ length: n }, () => '');
}

/* ---------- Vue d'un exercice ---------- */

export function ExerciseView({
  ex,
  given,
  onChange,
  revealed,
  onEnter,
}: {
  ex: Exercise;
  given: string;
  onChange: (v: string) => void;
  /** true : afficher la correction */
  revealed: boolean;
  onEnter?: () => void;
}) {
  const seed = useMemo(() => Math.random(), [ex]);

  useEffect(() => {
    if (ex.type !== 'mcq' || revealed) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= ex.options.length) onChange(String(n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ex, revealed, onChange]);

  switch (ex.type) {
    case 'mcq':
      return (
        <div className="ex">
          <p className="q">
            <Rich text={ex.q} />
          </p>
          <div className="options">
            {ex.options.map((o, i) => {
              const chosen = given === String(i);
              let cls = chosen ? 'chosen' : '';
              if (revealed && i === ex.answer) cls = 'ok';
              else if (revealed && chosen) cls = 'ko';
              return (
                <button key={i} type="button" className={`option ${cls}`} disabled={revealed} onClick={() => onChange(String(i))}>
                  <kbd aria-hidden>{i + 1}</kbd>
                  <span>
                    <Rich text={o} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'gap': {
      const [before, after] = ex.q.split('___');
      const status = revealed ? (ex.answers.some((a) => same(a, given)) ? 'ok' : 'ko') : undefined;
      return (
        <div className="ex">
          <p className="instr">Complète la phrase</p>
          <p className="q gap-line">
            <Rich text={before} />
            <TextInput value={given} onChange={onChange} disabled={revealed} status={status} autoFocus onEnter={onEnter} label="Réponse" />
            <Rich text={after ?? ''} />
          </p>
          {ex.hint && <p className="hint">💬 {ex.hint}</p>}
          {!revealed && <UmlautBar />}
        </div>
      );
    }

    case 'translate': {
      const status = revealed ? (ex.answers.some((a) => same(a, given)) ? 'ok' : 'ko') : undefined;
      return (
        <div className="ex">
          <p className="instr">{ex.dir === 'fr-de' ? 'Traduis en allemand' : 'Traduis en français'}</p>
          <p className="q big">
            {ex.dir === 'de-fr' && <SpeakButton text={ex.q} />}
            <Rich text={ex.q} />
          </p>
          <TextInput
            value={given}
            onChange={onChange}
            disabled={revealed}
            status={status}
            autoFocus
            onEnter={onEnter}
            placeholder={ex.dir === 'fr-de' ? 'Ta réponse en allemand…' : 'Ta réponse en français…'}
          />
          {!revealed && ex.dir === 'fr-de' && <UmlautBar />}
        </div>
      );
    }

    case 'order': {
      const tokens = ex.answers[0].split(/\s+/);
      // ordre mélangé stable pour cet exercice
      const shuffled = tokens
        .map((t, i) => ({ t, i, r: Math.sin(seed * 1000 + i * 7.3) }))
        .sort((a, b) => a.r - b.r);
      const used: number[] = given ? given.split(',').filter(Boolean).map(Number) : [];
      const sentence = used.map((i) => tokens[i]).join(' ');
      const status = revealed ? (ex.answers.some((a) => same(a, sentence)) ? 'ok' : 'ko') : undefined;
      return (
        <div className="ex">
          <p className="instr">{ex.q ?? 'Remets les mots dans le bon ordre'}</p>
          <div className={`order-answer ${status ?? ''}`}>
            {used.length === 0 && <span className="placeholder">Clique sur les mots ci-dessous…</span>}
            {used.map((i, j) => (
              <button
                key={j}
                type="button"
                className="token"
                disabled={revealed}
                onClick={() => onChange(used.filter((_, k) => k !== j).join(','))}
              >
                {tokens[i]}
              </button>
            ))}
          </div>
          <div className="order-pool">
            {shuffled.map(({ t, i }) => (
              <button
                key={i}
                type="button"
                className="token"
                disabled={revealed || used.includes(i)}
                onClick={() => onChange([...used, i].join(','))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 'match': {
      const vals = parseArr(given, ex.pairs.length);
      const options = ex.pairs
        .map(([, b], i) => ({ b, r: Math.sin(seed * 999 + i * 3.1) }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.b);
      return (
        <div className="ex">
          <p className="instr">{ex.q ?? 'Associe les éléments'}</p>
          <div className="match">
            {ex.pairs.map(([a, b], i) => {
              const status = revealed ? (vals[i] === b ? 'ok' : 'ko') : '';
              return (
                <label key={i} className={`match-row ${status}`}>
                  <span className="match-left">
                    <Rich text={a} />
                  </span>
                  <select
                    value={vals[i]}
                    disabled={revealed}
                    onChange={(e) => {
                      const next = [...vals];
                      next[i] = e.target.value;
                      onChange(JSON.stringify(next));
                    }}
                  >
                    <option value="">— choisir —</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  {revealed && vals[i] !== b && <span className="correction">→ {b}</span>}
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case 'conjugation': {
      const ask = ex.ask ?? [0, 1, 2, 3, 4, 5];
      const vals = parseArr(given, ask.length);
      return (
        <div className="ex">
          <p className="instr">Conjugue au {TENSE_LABEL[ex.tense]}</p>
          <p className="q big">
            <SpeakButton text={ex.verb} />
            <strong>{ex.verb}</strong> {ex.fr && <span className="muted">({ex.fr})</span>}
          </p>
          <div className="conj">
            {ask.map((p, j) => {
              const status = revealed ? (same(vals[j], ex.forms[p]) ? 'ok' : 'ko') : undefined;
              return (
                <div key={p} className="conj-row">
                  <span className="pronoun">{PRONOUNS[p]}</span>
                  <TextInput
                    value={vals[j]}
                    disabled={revealed}
                    status={status}
                    autoFocus={j === 0}
                    label={`Forme pour ${PRONOUNS[p]}`}
                    onEnter={j === ask.length - 1 ? onEnter : undefined}
                    onChange={(v) => {
                      const next = [...vals];
                      next[j] = v;
                      onChange(JSON.stringify(next));
                    }}
                  />
                  {revealed && status === 'ko' && <span className="correction">{ex.forms[p]}</span>}
                </div>
              );
            })}
          </div>
          {!revealed && <UmlautBar />}
        </div>
      );
    }

    case 'cloze': {
      const parts = parseCloze(ex.text);
      const n = parts.filter((p) => 'answers' in p).length;
      const vals = parseArr(given, n);
      let j = -1;
      return (
        <div className="ex">
          <p className="instr">{ex.q ?? 'Complète avec la bonne forme'}</p>
          <p className="q gap-line">
            {parts.map((p, k) => {
              if ('text' in p) return <Rich key={k} text={p.text} />;
              j++;
              const idx = j;
              const status = revealed ? (p.answers.some((a) => same(a, vals[idx])) ? 'ok' : 'ko') : undefined;
              return (
                <span key={k} className="blank">
                  <TextInput
                    value={vals[idx]}
                    disabled={revealed}
                    status={status}
                    autoFocus={idx === 0}
                    label={`Case ${idx + 1}`}
                    width={`${Math.min(18, Math.max(5, Math.max(...p.answers.map((a) => a.length)) + 3))}ch`}
                    onEnter={idx === n - 1 ? onEnter : undefined}
                    onChange={(v) => {
                      const next = [...vals];
                      next[idx] = v;
                      onChange(JSON.stringify(next));
                    }}
                  />
                  {status === 'ko' && <span className="correction inline">{p.answers[0]}</span>}
                </span>
              );
            })}
          </p>
          {ex.hint && <p className="hint">{ex.hint}</p>}
          {!revealed && <UmlautBar />}
        </div>
      );
    }

    case 'dictation':
      return <Dictation ex={ex} given={given} onChange={onChange} revealed={revealed} onEnter={onEnter} />;
  }
}

function Dictation({
  ex,
  given,
  onChange,
  revealed,
  onEnter,
}: {
  ex: Extract<Exercise, { type: 'dictation' }>;
  given: string;
  onChange: (v: string) => void;
  revealed: boolean;
  onEnter?: () => void;
}) {
  const [plays, setPlays] = useState(0);
  const play = (rate: number) => {
    speak(ex.text, rate);
    setPlays((p) => p + 1);
  };
  useEffect(() => {
    const t = setTimeout(() => play(0.85), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex]);
  const score = revealed ? wordScore(ex.text, given) : 0;
  return (
    <div className="ex">
      <p className="instr">Écoute et écris la phrase</p>
      {canSpeak ? (
        <div className="row">
          <button type="button" className="btn play" onClick={() => play(0.85)}>
            Écouter
          </button>
          <button type="button" className="btn ghost" onClick={() => play(0.6)}>
            Plus lentement
          </button>
          <span className="muted small">{plays > 0 ? `Écoutée ${plays} fois` : ''}</span>
        </div>
      ) : (
        <p className="muted">La lecture audio n’est pas disponible sur ce navigateur.</p>
      )}
      <TextInput
        value={given}
        onChange={onChange}
        disabled={revealed}
        status={revealed ? (score >= 0.999 ? 'ok' : 'ko') : undefined}
        autoFocus
        onEnter={onEnter}
        placeholder="Écris ce que tu entends…"
      />
      {revealed && ex.fr && <p className="hint">{ex.fr}</p>}
      {!revealed && <UmlautBar />}
    </div>
  );
}

/** Convertit la réponse brute en texte lisible pour le bilan. */
export { clozeSolution };

export function givenLabel(ex: Exercise, given: string): string {
  if (!given) return '—';
  if (ex.type === 'mcq') return ex.options[Number(given)] ?? '—';
  if (ex.type === 'order') {
    const tokens = ex.answers[0].split(/\s+/);
    return given.split(',').filter(Boolean).map((i) => tokens[Number(i)]).join(' ');
  }
  if (ex.type === 'match') return parseArr(given, ex.pairs.length).map((v, i) => `${ex.pairs[i][0]} → ${v || '?'}`).join(' · ');
  if (ex.type === 'conjugation') {
    const ask = ex.ask ?? [0, 1, 2, 3, 4, 5];
    return parseArr(given, ask.length).map((v, j) => `${PRONOUNS[ask[j]]} ${v || '?'}`).join(' · ');
  }
  if (ex.type === 'cloze') {
    const vals = parseArr(given, 50);
    let j = 0;
    return parseCloze(ex.text)
      .map((p) => ('text' in p ? p.text : vals[j++] || '___'))
      .join('');
  }
  return given;
}
