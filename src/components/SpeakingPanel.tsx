import { useEffect, useRef, useState } from 'react';
import type { Pack } from '../lib/types';
import { recordAttempt } from '../lib/storage';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import { Rich } from './Rich';

type Step = 'idle' | 'prep' | 'rec' | 'done';

const DEFAULT_CRITERIA = [
  'J’ai traité tous les points demandés',
  'J’ai parlé sans m’arrêter longtemps',
  'J’ai placé le verbe correctement (2e position, fin de subordonnée)',
  'J’ai utilisé au moins trois expressions utiles',
  'J’ai relié mes idées (weil, dass, aber, deshalb…)',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Recognition: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined;
const canRecord = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
}

export function SpeakingPanel({ pack }: { pack: Pack }) {
  const task = pack.task!;
  const prep = task.prepSeconds ?? 60;
  const talk = task.speakSeconds ?? 90;
  const criteria = task.criteria ?? DEFAULT_CRITERIA;
  const [step, setStep] = useState<Step>('idle');
  const [left, setLeft] = useState(0);
  const [audio, setAudio] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [err, setErr] = useState('');
  const [checked, setChecked] = useState<boolean[]>(() => criteria.map(() => false));
  const [saved, setSaved] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const recog = useRef<{ stop: () => void } | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (step !== 'prep' && step !== 'rec') return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (left > 0) return;
    if (step === 'prep') startTalking();
    else if (step === 'rec') stopTalking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  useEffect(
    () => () => {
      rec.current?.stream.getTracks().forEach((t) => t.stop());
      recog.current?.stop();
      stopSpeaking();
    },
    [],
  );

  async function startTalking() {
    setErr('');
    setTranscript('');
    if (audio) URL.revokeObjectURL(audio);
    setAudio('');
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const r = new MediaRecorder(stream);
        chunks.current = [];
        r.ondataavailable = (e) => chunks.current.push(e.data);
        r.onstop = () => {
          setAudio(URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType })));
          stream.getTracks().forEach((t) => t.stop());
        };
        r.start();
        rec.current = r;
      } catch {
        setErr('Micro non autorisé : tu peux t’entraîner quand même, sans enregistrement.');
      }
    }
    if (Recognition) {
      try {
        const sr = new Recognition();
        sr.lang = 'de-DE';
        sr.continuous = true;
        sr.interimResults = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sr.onresult = (e: any) => {
          let t = '';
          for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
          setTranscript(t.trim());
        };
        sr.onerror = () => {};
        sr.start();
        recog.current = sr;
      } catch {
        /* reconnaissance indisponible */
      }
    }
    setLeft(talk);
    setStep('rec');
  }

  function stopTalking() {
    if (rec.current && rec.current.state !== 'inactive') rec.current.stop();
    recog.current?.stop();
    setStep('done');
  }

  return (
    <div className="speaking">
      <div className="speak-task">
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

      <div className={`speak-stage stage-${step}`}>
        {step === 'idle' && (
          <>
            <p>
              {fmt(prep)} pour préparer, puis {fmt(talk)} pour parler. {canRecord ? 'Ta voix est enregistrée pour que tu puisses te réécouter.' : ''}
            </p>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => (setLeft(prep), setStep('prep'))}>
                Commencer la préparation
              </button>
              <button type="button" className="btn ghost" onClick={startTalking}>
                Parler tout de suite
              </button>
            </div>
          </>
        )}
        {step === 'prep' && (
          <>
            <div className="big-timer">{fmt(left)}</div>
            <p className="muted">Prépare des mots-clés, pas des phrases complètes.</p>
            <button type="button" className="btn primary" onClick={startTalking}>
              Je suis prête, je parle
            </button>
          </>
        )}
        {step === 'rec' && (
          <>
            <div className="big-timer rec">
              <span className="rec-dot" aria-hidden /> {fmt(left)}
            </div>
            {transcript && <p className="live">{transcript}</p>}
            <button type="button" className="btn primary" onClick={stopTalking}>
              J’ai terminé
            </button>
          </>
        )}
        {step === 'done' && (
          <>
            {audio ? (
              <div>
                <h5>Ton enregistrement</h5>
                <audio controls src={audio} />
              </div>
            ) : null}
            {transcript && (
              <div>
                <h5>Ce que le navigateur a compris</h5>
                <p className="live">{transcript}</p>
                <p className="muted small">Si un mot est mal reconnu, ta prononciation est peut-être à retravailler.</p>
              </div>
            )}
            <button type="button" className="btn ghost" onClick={() => (setStep('idle'), setSaved(false))}>
              Recommencer
            </button>
          </>
        )}
        {err && <p className="msg ko">{err}</p>}
      </div>

      <aside className="writing-side">
        <h4>Expressions utiles</h4>
        <ul className="phrases">
          {task.phrases.map((ph, i) => (
            <li key={i}>
              <button type="button" onClick={() => speak(ph.de)} disabled={!canSpeak}>
                <span>{ph.de}</span>
                <span className="muted">{ph.fr}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {step === 'done' && (
        <section className="self-eval">
          <h3>Auto-évaluation</h3>
          <ul className="criteria">
            {criteria.map((c, i) => (
              <li key={i}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => setChecked((x) => x.map((v, k) => (k === i ? !v : v)))}
                  />
                  <span>{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="row">
            <button
              type="button"
              className="btn primary"
              disabled={saved}
              onClick={() => {
                recordAttempt('practice', pack.id, checked.filter(Boolean).length, criteria.length);
                setSaved(true);
              }}
            >
              {saved ? 'Enregistré' : 'Enregistrer mon auto-évaluation'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setShowModel((s) => !s)}>
              {showModel ? 'Masquer la réponse modèle' : 'Voir la réponse modèle'}
            </button>
          </div>
          {showModel && <ModelAnswer text={task.model} fr={task.modelFr} />}
        </section>
      )}
    </div>
  );
}

export function ModelAnswer({ text, fr }: { text: string; fr?: string }) {
  return (
    <div className="model">
      {canSpeak && (
        <button type="button" className="btn small" onClick={() => speak(text, 0.9)}>
          Écouter le modèle
        </button>
      )}
      {text.split('\n').map((p, i) => (
        <p key={i} className="text-de">
          <Rich text={p} />
        </p>
      ))}
      {fr && (
        <details>
          <summary>Traduction</summary>
          {fr.split('\n').map((p, i) => (
            <p key={i} className="muted">
              {p}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
