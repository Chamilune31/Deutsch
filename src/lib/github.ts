import { useSyncExternalStore } from 'react';
import { CONFIG } from './packs';

/** Envoi de fichiers dans le dépôt GitHub, directement depuis le navigateur, avec un jeton personnel. */

const KEY = 'deutsch-github-token';
const API = 'https://api.github.com';

let token: string = (() => {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
})();
const listeners = new Set<() => void>();

export function useGithubToken(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => token,
    () => token,
  );
}

export function setGithubToken(t: string) {
  token = t.trim();
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* indisponible */
  }
  listeners.forEach((l) => l());
}

export function repo(): { owner: string; name: string } | null {
  const m = CONFIG.repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  return m ? { owner: m[1], name: m[2].replace(/\.git$/, '') } : null;
}

function headers(extra: Record<string, string> = {}) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function contentsUrl(path: string) {
  const r = repo();
  if (!r) throw new Error('Adresse du dépôt manquante (repoUrl dans config.json).');
  return `${API}/repos/${r.owner}/${r.name}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function explain(res: Response): Promise<Error> {
  if (res.status === 401) return new Error('Jeton refusé : il est incorrect ou a expiré.');
  if (res.status === 403) return new Error('Jeton sans droit d’écriture sur le dépôt (permission « Contents : Read and write »).');
  if (res.status === 404) return new Error('Dépôt introuvable avec ce jeton : vérifie qu’il donne accès au dépôt Deutsch.');
  if (res.status === 409 || res.status === 422) return new Error('Un fichier porte déjà ce nom dans le dépôt.');
  return new Error(`GitHub a répondu ${res.status}.`);
}

/** Vérifie le jeton : lecture du dépôt et droit d'écriture. */
export async function checkToken(): Promise<string> {
  const r = repo();
  if (!r) throw new Error('Adresse du dépôt manquante.');
  const res = await fetch(`${API}/repos/${r.owner}/${r.name}`, { headers: headers() });
  if (!res.ok) throw await explain(res);
  const data = await res.json();
  if (data.permissions && !data.permissions.push) throw new Error('Ce jeton peut lire le dépôt mais pas y écrire.');
  return data.full_name as string;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function uploadFile(path: string, data: ArrayBuffer | string, message: string, sha?: string): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data).buffer : data;
  const res = await fetch(contentsUrl(path), {
    method: 'PUT',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, content: toBase64(buf as ArrayBuffer), branch: 'main', ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    const err = await explain(res);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const data2 = await res.json().catch(() => ({}));
  return data2?.content?.sha ?? '';
}

/** Lit un fichier texte du dépôt avec son identifiant de version (sha). */
export async function getFile(path: string): Promise<{ sha: string; text: string } | null> {
  const res = await fetch(`${contentsUrl(path)}?ref=main`, { headers: headers(), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw await explain(res);
  const data = await res.json();
  const bin = atob(String(data.content ?? '').replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return { sha: data.sha, text: new TextDecoder().decode(bytes) };
}

export function onTokenChange(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getToken() {
  return token;
}

export interface RemoteFile {
  name: string;
  path: string;
  size: number;
}

export async function listDir(path: string): Promise<RemoteFile[]> {
  const res = await fetch(contentsUrl(path), { headers: headers() });
  if (res.status === 404) return [];
  if (!res.ok) throw await explain(res);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).filter((f) => f.type === 'file' && !f.name.startsWith('.'));
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  const res = await fetch(contentsUrl(path), { headers: headers({ Accept: 'application/vnd.github.raw+json' }) });
  if (res.status === 404) return fallback;
  if (!res.ok) throw await explain(res);
  return (await res.json()) as T;
}

/** Nom de fichier sûr : « 2026-11-12_cours-du-mardi.pdf ». */
export function safeName(name: string, date: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${date}_${base || 'cours'}${ext}`;
}

/** Prochain passage de la tâche planifiée : jours 1, 4, 7… du mois à 23 h 17. */
export function nextRun(now = new Date()): Date {
  for (let k = 0; k < 40; k++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, 23, 17);
    if ((d.getDate() - 1) % 3 === 0 && d > now) return d;
  }
  return now;
}

export function fmtRun(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' soir';
}
