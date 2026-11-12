import type { ReactNode } from 'react';
import type { Block } from '../lib/types';
import { canSpeak, speak } from '../lib/speech';

export { speak };

/** Découpe un texte en segments **gras** / *italique* (imbrication possible). */
export function richSegments(text: string): { t: string; b: boolean; i: boolean }[] {
  const out: { t: string; b: boolean; i: boolean }[] = [];
  let b = false;
  let i = false;
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: buf, b, i });
    buf = '';
  };
  for (let k = 0; k < text.length; ) {
    if (text.startsWith('***', k)) {
      flush();
      b = !b;
      i = !i;
      k += 3;
    } else if (text.startsWith('**', k)) {
      flush();
      b = !b;
      k += 2;
    } else if (text[k] === '*') {
      flush();
      i = !i;
      k += 1;
    } else buf += text[k++];
  }
  flush();
  return out;
}

/** Rend **gras** et *italique*. */
export function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = richSegments(text).map((s, k) => {
    let node: ReactNode = s.t;
    if (s.i) node = <em>{node}</em>;
    if (s.b) node = <strong>{node}</strong>;
    return <span key={k}>{node}</span>;
  });
  return <>{parts}</>;
}

export function SpeakButton({ text }: { text: string }) {
  if (!canSpeak) return null;
  return (
    <button className="speak" type="button" title="Écouter" aria-label={`Écouter : ${text}`} onClick={() => speak(text)}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="lesson">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h':
            return (
              <h3 key={i}>
                <Rich text={b.text} />
              </h3>
            );
          case 'p':
            return (
              <p key={i}>
                <Rich text={b.text} />
              </p>
            );
          case 'tip':
            return (
              <div key={i} className="tip">
                <div>
                  <Rich text={b.text} />
                </div>
              </div>
            );
          case 'list':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Rich text={it} />
                  </li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={i} className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j}>
                          <Rich text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>
                            <Rich text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'examples':
            return (
              <ul key={i} className="examples">
                {b.items.map((x, j) => (
                  <li key={j}>
                    <div className="de">
                      <SpeakButton text={x.de} />
                      <Rich text={x.de} />
                    </div>
                    <div className="fr">
                      <Rich text={x.fr} />
                    </div>
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}
