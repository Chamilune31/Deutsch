import { useEffect, useRef, useState } from 'react';
import type { Correction, Pack } from '../lib/types';
import { draftKey, recordAttempt, saveWriting, today, useWritings } from '../lib/storage';
import { fmtRun, nextRun, uploadFile, useGithubToken } from '../lib/github';
import { correctionsFor } from '../lib/corrections';
import { GithubConnect } from './GithubConnect';
import { Rich } from './Rich';

function countWords(t: string) {
  return t.trim() ? t.trim().split(/\s+/).length : 0;
}

function correctionPrompt(pack: Pack, text: string) {
  return `Tu es professeur d'allemand. Je suis une étudiante francophone de niveau A2, objectif B1.
Corrige ma rédaction ci-dessous. Sujet : ${pack.task?.prompt}
Points à traiter : ${pack.task?.points.join(' ; ')}

1. Réécris mon texte corrigé, en gardant mes idées et un niveau B1.
2. Liste chaque faute : original → correction → explication courte en français.
3. Donne un bilan en 3 phrases (points forts, point à travailler en priorité) et une estimation du niveau (A2, A2+, B1).

Ma rédaction :
${text}`;
}

export function WritingPanel({ pack }: { pack: Pack }) {
  const token = useGithubToken();
  const writings = useWritings().filter((w) => w.pack === pack.id).sort((a, b) => b.id.localeCompare(a.id));
  const corrections = correctionsFor(pack.id);
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(draftKey(pack.id)) ?? '';
    } catch {
      return '';
    }
  });
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const task = pack.task!;
  const words = countWords(text);
  const min = task.minWords ?? 80;

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(pack.id), text);
    } catch {
      /* indisponible */
    }
  }, [pack.id, text]);

  function insert(s: string) {
    const el = area.current;
    if (!el) return setText((t) => t + s);
    const a = el.selectionStart ?? text.length;
    const b = el.selectionEnd ?? a;
    setText(text.slice(0, a) + s + text.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + s.length, a + s.length);
    });
  }

  async function send() {
    setBusy(true);
    setMsg({});
    const now = new Date();
    const id = `${today()}_${pack.id}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    try {
      await uploadFile(`ecrits/${id}.md`, `pack: ${pack.id}\ndate: ${today()}\n---\n${text.trim()}\n`, `Rédaction : ${pack.title}`);
      saveWriting({ id, pack: pack.id, date: today(), text: text.trim(), sent: true });
      recordAttempt('practice', pack.id, 1, 1);
      setText('');
      setMsg({ ok: `Envoyée. Elle sera corrigée ${fmtRun(nextRun())}.` });
    } catch (e) {
      setMsg({ err: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(correctionPrompt(pack, text.trim()));
      setMsg({ ok: 'Copié. Colle-le dans une conversation avec Claude pour une correction immédiate.' });
    } catch {
      setMsg({ err: 'Copie impossible : sélectionne ton texte manuellement.' });
    }
  }

  const byId = new Map(corrections.map((c) => [c.id, c]));
  const orphans = corrections.filter((c) => !writings.some((w) => w.id === c.id));

  return (
    <div className="writing">
      <div className="writing-main">
        <div className="writing-head">
          <p className="q">
            <Rich text={task.prompt} />
          </p>
          <ul className="checklist">
            {task.points.map((p, i) => (
              <li key={i}>
                <Rich text={p} />
              </li>
            ))}
          </ul>
        </div>
        <textarea
          ref={area}
          className="writing-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Liebe …,"
          spellCheck={false}
          lang="de"
          aria-label="Ta rédaction"
        />
        <div className="writing-tools">
          <div className="umlauts">
            {['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map((c) => (
              <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(c)}>
                {c}
              </button>
            ))}
          </div>
          <span className={`count ${words >= min ? 'ok' : ''}`}>
            {words} / {min} mots
          </span>
        </div>
        <div className="row">
          {token ? (
            <button type="button" className="btn primary" disabled={busy || words < 20} onClick={send}>
              {busy ? 'Envoi…' : 'Envoyer pour correction'}
            </button>
          ) : null}
          <button type="button" className={`btn ${token ? 'ghost' : 'primary'}`} disabled={words < 20} onClick={copy}>
            Copier pour Claude
          </button>
        </div>
        {msg.ok && <p className="msg ok">{msg.ok}</p>}
        {msg.err && <p className="msg ko">{msg.err}</p>}
        {!token && (
          <details className="gh-inline">
            <summary>Recevoir la correction directement sur le site</summary>
            <GithubConnect compact />
          </details>
        )}
      </div>

      <aside className="writing-side">
        <h4>Expressions utiles</h4>
        <p className="muted small">Clique pour insérer.</p>
        <ul className="phrases">
          {task.phrases.map((ph, i) => (
            <li key={i}>
              <button type="button" onClick={() => insert(ph.de.replace(/…$/, '') + ' ')}>
                <span>{ph.de}</span>
                <span className="muted">{ph.fr}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {(writings.length > 0 || orphans.length > 0) && (
        <section className="corrections">
          <h3>Mes rédactions</h3>
          {writings.map((w) => {
            const c = byId.get(w.id);
            return c ? (
              <CorrectionView key={w.id} c={c} />
            ) : (
              <div key={w.id} className="correction-card pending">
                <div className="corr-head">
                  <strong>{new Date(`${w.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>
                  <span className="tag">{w.sent ? `Correction ${fmtRun(nextRun())}` : 'Non envoyée'}</span>
                </div>
                <p className="text-de">{w.text}</p>
              </div>
            );
          })}
          {orphans.map((c) => (
            <CorrectionView key={c.id} c={c} />
          ))}
        </section>
      )}
    </div>
  );
}

function CorrectionView({ c }: { c: Correction }) {
  return (
    <div className="correction-card">
      <div className="corr-head">
        <strong>{new Date(`${c.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>
        {c.level && <span className="tag ok">Niveau estimé : {c.level}</span>}
      </div>
      <p>
        <Rich text={c.summary} />
      </p>
      <div className="corr-cols">
        <div>
          <h5>Ton texte</h5>
          <p className="text-de">{c.text}</p>
        </div>
        <div>
          <h5>Version corrigée</h5>
          <p className="text-de">
            <Rich text={c.corrected} />
          </p>
        </div>
      </div>
      {c.comments.length > 0 && (
        <table className="corr-table">
          <thead>
            <tr>
              <th>Tu as écrit</th>
              <th>Correction</th>
              <th>Pourquoi</th>
            </tr>
          </thead>
          <tbody>
            {c.comments.map((m, i) => (
              <tr key={i}>
                <td className="strike">{m.original}</td>
                <td className="fix">{m.fix}</td>
                <td>
                  <Rich text={m.why} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
