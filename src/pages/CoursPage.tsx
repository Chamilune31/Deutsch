import { useState } from 'react';
import type { Pack, Teacher } from '../lib/types';
import { CONFIG, usePacks } from '../lib/packs';
import { removeImportedPack, saveImportedPack } from '../lib/storage';
import { validatePack } from '../lib/validate';
import { coursePrompt } from '../lib/prompt';
import { PackCard } from '../components/PackCard';

const NAMES: Record<Teacher, string> = { logan: 'Logan', brayan: 'Brayan' };

function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export function CoursPage() {
  const { inSection, importedIds } = usePacks();
  const [teacher, setTeacher] = useState<Teacher>('logan');
  const [raw, setRaw] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const packs = inSection('cours')
    .filter((p) => p.teacher === teacher)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const repo = CONFIG.repoUrl.replace(/\/$/, '');

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(coursePrompt(teacher));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg('Impossible de copier automatiquement : sélectionne le texte du prompt manuellement.');
    }
  }

  function doImport() {
    setMsg('');
    let pack: Pack;
    try {
      pack = JSON.parse(extractJson(raw));
    } catch (e) {
      setErrors([`JSON illisible : ${(e as Error).message}`]);
      return;
    }
    if (pack.section === 'cours' && !pack.teacher) pack.teacher = teacher;
    const errs = validatePack(pack);
    setErrors(errs);
    if (errs.length) return;
    saveImportedPack(pack);
    setRaw('');
    setMsg(`✅ « ${pack.title} » a été ajouté.`);
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Mes cours</h1>
        <p className="muted">Tes cours avec Logan et Brayan, transformés en leçons, exercices et examens.</p>
      </header>

      <div className="tabs" role="tablist">
        {(['logan', 'brayan'] as Teacher[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={teacher === t} className={`tab ${teacher === t ? 'on' : ''}`} onClick={() => setTeacher(t)}>
            👤 {NAMES[t]}
          </button>
        ))}
      </div>

      {packs.length === 0 ? (
        <div className="empty">
          <p>Aucun cours avec {NAMES[teacher]} pour l’instant.</p>
          <p className="muted">Ajoute ton premier support de cours ci-dessous.</p>
        </div>
      ) : (
        <div className="grid">
          {packs.map((p) => (
            <div key={p.id} className="stack">
              <PackCard pack={p} />
              {importedIds.has(p.id) && (
                <button type="button" className="btn small ghost danger" onClick={() => removeImportedPack(p.id)}>
                  Retirer (importé sur cet appareil)
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="card">
        <h2>Ajouter un cours avec {NAMES[teacher]}</h2>

        <div className="method">
          <h3>Option 1 — Automatique (recommandé)</h3>
          <ol>
            <li>
              Dépose ton PDF ou ton fichier Word dans le dossier <code>cours/{teacher}</code> de ton dépôt GitHub
              {repo ? (
                <>
                  {' '}
                  :{' '}
                  <a href={`${repo}/upload/main/cours/${teacher}`} target="_blank" rel="noreferrer">
                    ouvrir la page d’envoi ↗
                  </a>
                </>
              ) : (
                ' (bouton « Add file → Upload files »).'
              )}
            </li>
            <li>La tâche Claude programmée tous les 3 jours le transforme en leçon + exercices + examen et met le site à jour.</li>
            <li>Pressée ? Demande à Claude de lancer la tâche tout de suite.</li>
          </ol>
        </div>

        <div className="method">
          <h3>Option 2 — Immédiate, sur cet appareil</h3>
          <ol>
            <li>
              <button className="btn small" type="button" onClick={copyPrompt}>
                {copied ? '✓ Prompt copié' : '📋 Copier le prompt'}
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
            rows={8}
            aria-label="JSON du pack généré par Claude"
          />
          <button className="btn primary" type="button" disabled={!raw.trim()} onClick={doImport}>
            Importer le cours
          </button>
          {msg && <p>{msg}</p>}
          {errors.length > 0 && (
            <div className="errors">
              <strong>Le contenu doit être corrigé :</strong>
              <ul>
                {errors.slice(0, 12).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              <p className="muted">Astuce : recolle ces erreurs à Claude en lui demandant de corriger le JSON.</p>
            </div>
          )}
          <p className="muted small">
            Un cours importé ici n’existe que dans ce navigateur. Avec l’option 1, il est disponible partout.
          </p>
        </div>
      </section>
    </div>
  );
}
