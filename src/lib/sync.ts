import { useSyncExternalStore } from 'react';
import { getState, mergeStates, replaceState, subscribeStore, type SyncState } from './storage';
import { getFile, getToken, onTokenChange, uploadFile } from './github';

/**
 * Sauvegarde de la progression dans le dépôt GitHub (progres/progression.json),
 * pour la retrouver sur tous les appareils. Rien n'est jamais effacé : les copies sont fusionnées.
 */

const PATH = 'progres/progression.json';
const DELAY = 3000;

export type SyncStatus = { state: 'off' | 'syncing' | 'ok' | 'error'; at?: Date; msg?: string };

let status: SyncStatus = { state: 'off' };
const listeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

let sha: string | undefined;
let lastSent = '';
let timer: ReturnType<typeof setTimeout> | undefined;
let busy = false;
let applying = false;

function serialize(s: SyncState) {
  return JSON.stringify(s);
}

async function pull(): Promise<SyncState | null> {
  const f = await getFile(PATH);
  if (!f) {
    sha = undefined;
    return null;
  }
  sha = f.sha;
  try {
    const remote = JSON.parse(f.text) as SyncState;
    return remote?.progress?.srs ? remote : null;
  } catch {
    return null;
  }
}

/** Récupère la copie distante, fusionne, puis envoie le résultat si besoin. */
export async function syncNow(): Promise<void> {
  if (!getToken() || busy) return;
  busy = true;
  setStatus({ state: 'syncing' });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remote = await pull();
      const merged = remote ? mergeStates(remote, getState()) : getState();
      const json = serialize(merged);
      if (json !== serialize(getState())) {
        applying = true;
        replaceState(merged);
        applying = false;
      }
      if (remote && json === serialize(remote)) {
        lastSent = json;
        break;
      }
      try {
        sha = await uploadFile(PATH, JSON.stringify(merged, null, 1), 'Progression : sauvegarde automatique', sha);
        lastSent = json;
        break;
      } catch (e) {
        const st = (e as { status?: number }).status;
        if ((st === 409 || st === 422) && attempt === 0) continue; // modifié ailleurs entre-temps : on refusionne
        throw e;
      }
    }
    setStatus({ state: 'ok', at: new Date() });
  } catch (e) {
    setStatus({ state: 'error', msg: (e as Error).message, at: new Date() });
  } finally {
    busy = false;
  }
}

function schedule() {
  if (!getToken() || applying) return;
  if (serialize(getState()) === lastSent) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, DELAY);
}

let started = false;
export function startSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  subscribeStore(schedule);
  onTokenChange(() => {
    if (getToken()) syncNow();
    else setStatus({ state: 'off' });
  });
  window.addEventListener('focus', () => {
    if (getToken() && !busy) syncNow();
  });
  if (getToken()) syncNow();
}

/** Remise à zéro volontaire : efface aussi la copie du dépôt (sinon la fusion la restaurerait). */
export async function resetEverywhere(reset: () => void): Promise<void> {
  reset();
  if (!getToken()) return;
  setStatus({ state: 'syncing' });
  try {
    await pull();
    sha = await uploadFile(PATH, JSON.stringify(getState(), null, 1), 'Progression : remise à zéro', sha);
    lastSent = serialize(getState());
    setStatus({ state: 'ok', at: new Date() });
  } catch (e) {
    setStatus({ state: 'error', msg: (e as Error).message, at: new Date() });
  }
}
