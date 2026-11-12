import { useState } from 'react';
import type { Tense, Verb } from '../lib/types';
import { displayInf, forms, KIND_LABEL, PRONOUNS, TENSE_SHORT, TENSES } from '../lib/verbs';
import { SpeakButton } from './Rich';

export function VerbTables({ verbs }: { verbs: Verb[] }) {
  const [tense, setTense] = useState<Tense>('praesens');
  return (
    <div className="verbs">
      <div className="chips" role="tablist" aria-label="Temps">
        {TENSES.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={t === tense} className={`chip ${t === tense ? 'on' : ''}`} onClick={() => setTense(t)}>
            {TENSE_SHORT[t]}
          </button>
        ))}
      </div>
      <div className="verb-grid">
        {verbs.map((v) => (
          <div key={v.inf} className="verb-card">
            <div className="verb-head">
              <SpeakButton text={displayInf(v)} />
              <strong>{displayInf(v)}</strong>
              <span className="muted"> — {v.fr}</span>
            </div>
            <div className="verb-kinds">
              {v.kinds.map((k) => (
                <span key={k} className="badge">
                  {KIND_LABEL[k]}
                </span>
              ))}
              <span className="badge soft">Perfekt avec {v.aux}</span>
            </div>
            <table className="conj-table">
              <tbody>
                {forms(v, tense).map((f, i) => (
                  <tr key={i}>
                    <td className="pronoun">{PRONOUNS[i]}</td>
                    <td>{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.example && (
              <div className="verb-ex">
                <div className="de">
                  <SpeakButton text={v.example.de} />
                  {v.example.de}
                </div>
                <div className="fr">{v.example.fr}</div>
              </div>
            )}
            {v.note && <p className="hint">{v.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
