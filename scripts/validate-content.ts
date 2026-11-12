import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAll } from '../src/lib/validate';
import type { Pack } from '../src/lib/types';

const dir = join(import.meta.dirname, '..', 'src', 'content', 'packs');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const packs: Pack[] = [];
const errs: string[] = [];
for (const f of files) {
  try {
    const p = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Pack;
    if (`${p.id}.json` !== f) errs.push(`${f} : le nom du fichier doit être « ${p.id}.json »`);
    packs.push(p);
  } catch (e) {
    errs.push(`${f} : JSON invalide — ${(e as Error).message}`);
  }
}
errs.push(...validateAll(packs));
const by = (s: string) => packs.filter((p) => p.section === s).length;
console.log(`${packs.length} packs — grammaire ${by('grammaire')}, verbes ${by('verbes')}, vocabulaire ${by('vocabulaire')}, lire ${by('lecture')}, écouter ${by('ecoute')}, écrire ${by('ecriture')}, parler ${by('oral')}, cours ${by('cours')}`);
if (errs.length) {
  console.error(`\n❌ ${errs.length} erreur(s) :\n- ` + errs.join('\n- '));
  process.exit(1);
}
console.log('✅ Contenu valide');
