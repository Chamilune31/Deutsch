import format from '../../docs/FORMAT-CONTENU.md?raw';
import type { Teacher } from './types';
import { today } from './storage';

export function coursePrompt(teacher: Teacher): string {
  const name = teacher === 'logan' ? 'Logan' : 'Brayan';
  return `Tu es professeur d'allemand. Je suis une étudiante francophone de niveau A2, objectif B1.
Je t'ai joint le support d'un cours que j'ai suivi avec mon professeur ${name}.

Transforme ce cours en UN pack JSON pour ma plateforme, en respectant strictement le format ci-dessous :
- "section": "cours", "teacher": "${teacher}", "createdAt": "${today()}", "id" commençant par "cours-${teacher}-"
- "source" : le nom du fichier joint
- une leçon qui reprend et clarifie les notions du cours (avec exemples traduits et pièges pour francophones)
- si le cours contient du vocabulaire ou des verbes, ajoute-les dans "vocab" / "verbs"
- 8 à 10 "exercises" et 10 à 12 questions "exam" différentes, variées (mcq, gap, translate, order, match), toutes avec un "why"
- relis-toi : l'allemand doit être irréprochable

Réponds UNIQUEMENT avec le JSON, sans texte autour.

---
${format}`;
}
