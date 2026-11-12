import { useEffect, useRef, useState } from 'react';
import type { Listening } from '../lib/types';
import { canSpeak, speakLines, stopSpeaking } from '../lib/speech';
import { Icon } from './Icons';

/** Lecteur d'un document sonore : lecture par la voix allemande du navigateur, transcription masquable. */
export function AudioPlayer({ doc, transcript = 'toggle' }: { doc: Listening; transcript?: 'toggle' | 'hidden' | 'shown' }) {
  const [current, setCurrent] = useState(-1);
  const [rate, setRate] = useState(0.9);
  const [show, setShow] = useState(transcript === 'shown');
  const [plays, setPlays] = useState(0);
  const stop = useRef<() => void>(() => {});

  useEffect(() => () => stopSpeaking(), []);

  const playing = current >= 0;
  function play(from = 0) {
    stop.current();
    setPlays((p) => p + 1);
    stop.current = speakLines(doc.lines, { rate, from, onLine: setCurrent });
  }

  if (!canSpeak)
    return (
      <div className="player">
        <p className="muted">La lecture audio n’est pas disponible sur ce navigateur. Lis la transcription à voix haute.</p>
        <Transcript doc={doc} current={-1} onPick={() => {}} />
      </div>
    );

  return (
    <div className="player">
      <div className="player-bar">
        <button
          type="button"
          className="play-btn"
          aria-label={playing ? 'Arrêter' : 'Écouter le document'}
          onClick={() => (playing ? stop.current() : play())}
        >
          <Icon name={playing ? 'pause' : 'play'} size={22} />
        </button>
        <div className="player-meta">
          <strong>{doc.title}</strong>
          <span className="muted small">
            {doc.situation}
            {plays > 0 && ` — écouté ${plays} fois`}
          </span>
        </div>
        <div className="speed" role="group" aria-label="Vitesse">
          {[
            [0.7, 'Lent'],
            [0.9, 'Normal'],
          ].map(([r, label]) => (
            <button key={label} type="button" className={`chip ${rate === r ? 'on' : ''}`} onClick={() => setRate(r as number)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="player-track" aria-hidden>
        {doc.lines.map((_, i) => (
          <i key={i} className={i === current ? 'now' : i < current ? 'done' : ''} />
        ))}
      </div>
      {transcript !== 'hidden' && (
        <>
          {transcript === 'toggle' && (
            <button type="button" className="linklike" onClick={() => setShow((s) => !s)}>
              {show ? 'Masquer la transcription' : 'Afficher la transcription'}
            </button>
          )}
          {show && <Transcript doc={doc} current={current} onPick={(i) => play(i)} />}
        </>
      )}
    </div>
  );
}

function Transcript({ doc, current, onPick }: { doc: Listening; current: number; onPick: (i: number) => void }) {
  return (
    <ol className="transcript">
      {doc.lines.map((l, i) => (
        <li key={i} className={i === current ? 'now' : ''}>
          <button type="button" onClick={() => onPick(i)} title="Réécouter à partir d’ici">
            {l.who && <span className="who">{l.who}</span>}
            <span>{l.de}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
