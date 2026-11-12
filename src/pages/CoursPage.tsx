import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Pack, Teacher } from '../lib/types';
import { CONFIG, usePacks } from '../lib/packs';
import { removeImportedPack, saveImportedPack, today } from '../lib/storage';
import { validatePack } from '../lib/validate';
import { coursePrompt } from '../lib/prompt';
import { fmtRun, listDir, nextRun, readJson, safeName, uploadFile, useGithubToken, type RemoteFile } from '../lib/github';
import { PackCard } from '../components/PackCard';
import { GithubConnect } from '../components/GithubConnect';
import { Icon } from '../components/Icons';

const NAMES: Record<Teacher, string> = { logan: 'Logan', brayan: 'Brayan' };
const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_MB = 25;

interface Processed {
  file: string;
  pack?: string;
  date?: string;
  error?: string;
}

type Upload = { name: string; state: 'sending' | 'ok' | 'ko'; msg?: string };

function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

function fmtSize(n: number) {
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1e3))} Ko`;
}

export function CoursPage() {
  const { inSection, importedIds, byId } = usePacks();
  const token = useGithubToken();
  const [teacher, setTeacher] = useState<Teacher>('logan');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [remote, setRemote] = useState<{ files: RemoteFile[]; processed: Processed[] } | null>(null);
  const [remoteErr, setRemoteErr] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const packs = inSection('cours')
    .filter((p) => p.teacher === teacher)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const repo = CONFIG.repoUrl.replace(/\/$/, '');

  const refresh = useCallback(async () => {
    if (!token) return;
    setRemoteErr('');
    try {
      const [files, processed] = await Promise.all([
        listDir(`cours/${teacher}`),
        readJson<{ processed: Processed[] }>('cours/processed.json', { processed: [] }),
      ]);
      setRemote({ files, processed: processed.processed ?? [] });
    } catch (e) {
      setRemoteErr((e as Error).message);
    }
  }, [token, teacher]);

  useEffect(() => {
    setRemote(null);
    refresh();
  }, [refresh]);

  async function send(files: FileList | File[]) {
    const list = Array.from(files);
    for (const f of list) {
      const name = safeName(f.name, today());
      if (!/\.(pdf|docx?)$/i.test(name)) {
        setUploads((u) => [...u, { name: f.name, state: 'ko', msg: 'Format non pris en charge (PDF ou Word uniquement).' }]);
        continue;
      }
      if (f.size > MAX_MB * 1e6) {
        setUploads((u) => [...u, { name: f.name, state: 'ko', msg: `Fichier trop lourd (plus de ${MAX_MB} Mo).` }]);
        continue;
      }
      setUploads((u) => [...u, { name: f.name, state: 'sending' }]);
      try {
        await uploadFile(`cours/${teacher}/${name}`, await f.arrayBuffer(), `Cours ${NAMES[teacher]} : ${f.name}`);
        setUploads((u) => u.map((x) => (x.name === f.name ? { ...x, state: 'ok' } : x)));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.name === f.name ? { ...x, state: 'ko', msg: (e as Error).message } : x)));
      }
    }
    refresh();
  }

  return (
    <div className="page s-cours">
      <header className="page-head with-icon">
        <span className="section-icon">
          <Icon name="cours" size={26} />
        </span>
        <div>
          <h1>Mes cours</h1>
          <p className="lead">Dépose le support d’un cours : il devient une leçon avec ses exercices et son examen.</p>
        </div>
      </header>

      <div className="tabs" role="tablist">
        {(['logan', 'brayan'] as Teacher[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={teacher === t} className={`tab ${teacher === t ? 'on' : ''}`} onClick={() => setTeacher(t)}>
            {NAMES[t]}
          </button>
        ))}
      </div>

      <section className="card upload-card">
        <h2>Déposer un cours avec {NAMES[teacher]}</h2>
        {token ? (
          <>
            <button
              type="button"
              className={`dropzone ${drag ? 'over' : ''}`}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                send(e.dataTransfer.files);
              }}
            >
              <Icon name="upload" size={28} />
              <strong>Choisir un PDF ou un fichier Word</strong>
              <span className="muted small">ou glisse-le ici. Plusieurs fichiers possibles, {MAX_MB} Mo maximum chacun.</span>
            </button>
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) send(e.target.files);
                e.target.value = '';
              }}
            />
            {uploads.length > 0 && (
              <ul className="uploads">
                {uploads.map((u, i) => (
                  <li key={i} className={u.state}>
                    <span>{u.name}</span>
                    <span>{u.state === 'sending' ? 'Envoi…' : u.state === 'ok' ? 'Envoyé' : u.msg}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Les fichiers envoyés sont transformés en leçon {fmtRun(nextRun())}. Pressée ? Demande à Claude de lancer la tâche maintenant.
            </p>
            <GithubConnect compact />
          </>
        ) : (
          <>
            <GithubConnect />
            {repo && (
              <p className="muted small">
                Sans jeton, tu peux aussi déposer le fichier sur GitHub :{' '}
                <a href={`${repo}/upload/main/cours/${teacher}`} target="_blank" rel="noreferrer">
                  page d’envoi du dossier {teacher}
                </a>
                .
              </p>
            )}
          </>
        )}
      </section>

      {token && (
        <section>
          <div className="section-head">
            <h2>Fichiers déposés</h2>
            <button type="button" className="btn small ghost" onClick={refresh}>
              Actualiser
            </button>
          </div>
          {remoteErr && <p className="msg ko">{remoteErr}</p>}
          {!remote && !remoteErr && <p className="muted">Chargement…</p>}
          {remote && remote.files.length === 0 && <p className="muted">Aucun fichier dans le dossier de {NAMES[teacher]} pour l’instant.</p>}
          {remote && remote.files.length > 0 && (
            <ul className="files">
              {remote.files
                .slice()
                .reverse()
                .map((f) => {
                  const pr = remote.processed.find((x) => x.file === `${teacher}/${f.name}`);
                  const pack = pr?.pack ? byId.get(pr.pack) : undefined;
                  return (
                    <li key={f.path}>
                      <span className="file-name">
                        {f.name}
                        <span className="muted small"> {fmtSize(f.size)}</span>
                      </span>
                      {pr?.error ? (
                        <span className="tag ko">Illisible : {pr.error}</span>
                      ) : pr ? (
                        pack ? (
                          <Link to={`/pack/${pack.id}`} className="tag ok">
                            Leçon prête
                          </Link>
                        ) : (
                          <span className="tag ok">Traité, mise en ligne en cours</span>
                        )
                      ) : (
                        <span className="tag">En attente, {fmtRun(nextRun())}</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2>Leçons tirées de mes cours</h2>
        {packs.length === 0 ? (
          <div className="empty">
            <p>Aucune leçon avec {NAMES[teacher]} pour l’instant.</p>
            <p className="muted">Dépose ton premier support de cours ci-dessus.</p>
          </div>
        ) : (
          <div className="grid">
            {packs.map((p) => (
              <div key={p.id} className="stack">
                <PackCard pack={p} />
                {importedIds.has(p.id) && (
                  <button type="button" className="btn small ghost danger" onClick={() => removeImportedPack(p.id)}>
                    Retirer de cet appareil
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <ManualImport teacher={teacher} />
    </div>
  );
}

function ManualImport({ teacher }: { teacher: Teacher }) {
  const [raw, setRaw] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(coursePrompt(teacher));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg('Copie impossible : réessaie depuis un autre navigateur.');
    }
  }

  function doImport() {
    setMsg('');
    let pack: Pack;
    try {
      pack = JSON.parse(extractJson(raw));
    } catch (e) {
      setErrors([`Le texte collé n’est pas du JSON valide : ${(e as Error).message}`]);
      return;
    }
    if (pack.section === 'cours' && !pack.teacher) pack.teacher = teacher;
    const errs = validatePack(pack);
    setErrors(errs);
    if (errs.length) return;
    saveImportedPack(pack);
    setRaw('');
    setMsg(`« ${pack.title} » a été ajouté sur cet appareil.`);
  }

  return (
    <details className="card manual">
      <summary>Sans attendre : créer la leçon avec Claude et la coller ici</summary>
      <ol>
        <li>
          <button className="btn small" type="button" onClick={copyPrompt}>
            {copied ? 'Prompt copié' : 'Copier le prompt'}
          </button>
        </li>
        <li>Ouvre Claude, joins ton fichier de cours, colle le prompt et envoie.</li>
        <li>Copie la réponse de Claude et colle-la ici :</li>
      </ol>
      <textarea
        className="json-input"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='{ "id": "cours-logan-…", "section": "cours", … }'
        rows={6}
        aria-label="JSON de la leçon générée par Claude"
      />
      <button className="btn primary" type="button" disabled={!raw.trim()} onClick={doImport}>
        Importer la leçon
      </button>
      {msg && <p className="msg ok">{msg}</p>}
      {errors.length > 0 && (
        <div className="errors">
          <strong>À corriger :</strong>
          <ul>
            {errors.slice(0, 12).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <p className="muted">Recolle ces erreurs à Claude en lui demandant de corriger le JSON.</p>
        </div>
      )}
      <p className="muted small">Une leçon importée ainsi n’existe que dans ce navigateur.</p>
    </details>
  );
}
