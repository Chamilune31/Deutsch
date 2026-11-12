import { useState } from 'react';
import { checkToken, repo, setGithubToken, useGithubToken } from '../lib/github';

/** Connexion du site au dépôt GitHub (jeton personnel enregistré uniquement dans ce navigateur). */
export function GithubConnect({ compact = false }: { compact?: boolean }) {
  const token = useGithubToken();
  const [value, setValue] = useState('');
  const [state, setState] = useState<{ ok?: string; err?: string; busy?: boolean }>({});
  const r = repo();

  if (token)
    return (
      <div className="gh-status">
        <span className="dot ok" aria-hidden />
        <span>
          Envoi activé vers <strong>{r ? `${r.owner}/${r.name}` : 'ton dépôt'}</strong> sur cet appareil.
        </span>
        <button type="button" className="btn small ghost" onClick={() => setGithubToken('')}>
          Déconnecter
        </button>
      </div>
    );

  async function connect() {
    setState({ busy: true });
    setGithubToken(value);
    try {
      const name = await checkToken();
      setState({ ok: `Connecté à ${name}.` });
      setValue('');
    } catch (e) {
      setGithubToken('');
      setState({ err: (e as Error).message });
    }
  }

  return (
    <div className="gh-connect">
      {!compact && (
        <p>
          Pour envoyer des fichiers depuis le site, il faut l’autoriser une fois sur chaque appareil avec un <strong>jeton GitHub</strong>{' '}
          limité à ton dépôt.
        </p>
      )}
      <details open={!compact}>
        <summary>Créer le jeton (2 minutes)</summary>
        <ol>
          <li>
            Ouvre{' '}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              la page de création de jeton GitHub
            </a>
            .
          </li>
          <li>Nom : « Plateforme allemand ». Expiration : la plus longue proposée.</li>
          <li>
            <em>Repository access</em> : <strong>Only select repositories</strong>, puis choisis <strong>{r?.name ?? 'Deutsch'}</strong>.
          </li>
          <li>
            <em>Permissions → Repository permissions → Contents</em> : <strong>Read and write</strong>.
          </li>
          <li>Clique sur « Generate token », copie-le et colle-le ci-dessous.</li>
        </ol>
      </details>
      <div className="row">
        <input
          className="text-input"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="github_pat_…"
          aria-label="Jeton GitHub"
          autoComplete="off"
        />
        <button type="button" className="btn primary" disabled={!value.trim() || state.busy} onClick={connect}>
          {state.busy ? 'Vérification…' : 'Connecter'}
        </button>
      </div>
      {state.err && <p className="msg ko">{state.err}</p>}
      {state.ok && <p className="msg ok">{state.ok}</p>}
      <p className="muted small">Le jeton reste dans ce navigateur. Il ne donne accès qu’à ce dépôt.</p>
    </div>
  );
}
