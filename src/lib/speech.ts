/** Synthèse vocale allemande du navigateur (gratuite, hors ligne sur la plupart des appareils). */

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (!canSpeak) return;
  voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('de'));
}
if (canSpeak) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

function clean(text: string) {
  return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[|\]/g, '');
}

function utter(text: string, rate: number, speaker = 0): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(clean(text));
  u.lang = 'de-DE';
  u.rate = rate;
  if (!voices.length) loadVoices();
  if (voices.length) u.voice = voices[speaker % voices.length];
  // Deux interlocuteurs avec une seule voix : on varie la hauteur.
  if (voices.length < 2) u.pitch = speaker % 2 ? 0.75 : 1.1;
  return u;
}

export function stopSpeaking() {
  if (canSpeak) speechSynthesis.cancel();
}

export function speak(text: string, rate = 0.92) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter(text, rate));
}

/**
 * Lit une suite de répliques. `onLine(i)` est appelé au début de chaque réplique, puis `onLine(-1)` à la fin.
 * Renvoie une fonction d'arrêt.
 */
export function speakLines(
  lines: { who?: string; de: string }[],
  { rate = 0.92, from = 0, onLine }: { rate?: number; from?: number; onLine?: (i: number) => void } = {},
): () => void {
  if (!canSpeak) return () => {};
  speechSynthesis.cancel();
  const speakers = Array.from(new Set(lines.map((l) => l.who ?? '')));
  let stopped = false;
  lines.slice(from).forEach((l, k) => {
    const i = from + k;
    const u = utter(l.de, rate, speakers.indexOf(l.who ?? ''));
    u.onstart = () => !stopped && onLine?.(i);
    if (i === lines.length - 1) u.onend = () => !stopped && onLine?.(-1);
    speechSynthesis.speak(u);
  });
  return () => {
    stopped = true;
    speechSynthesis.cancel();
    onLine?.(-1);
  };
}
