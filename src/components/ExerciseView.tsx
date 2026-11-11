import { useMemo, useRef } from 'react';
import type { Exercise } from '../lib/types';
import { PRONOUNS, TENSE_LABEL } from '../lib/verbs';
import { same } from '../lib/grade';
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
}: {
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
  return (
    <input
      ref={ref}
      className={`text-input ${status ?? ''}`}
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
                  <Rich text={o} />
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
  }
}

/** Convertit la réponse brute en texte lisible pour le bilan. */
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
  return given;
}
