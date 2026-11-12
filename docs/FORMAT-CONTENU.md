# Format d'un pack de contenu (JSON)

Un **pack** = une leçon + ses exercices + son examen. Un fichier par pack, dans `src/content/packs/<id>.json`.
Les explications sont **en français**, les exemples **en allemand** avec traduction. Niveau visé : A2 → B1.

## Champs du pack

| Champ | Obligatoire | Description |
|---|---|---|
| `id` | oui | minuscules, chiffres, tirets. Préfixe : `gram-`, `verb-`, `vocab-`, `lire-`, `ecouter-`, `ecrire-`, `parler-`, `cours-logan-`, `cours-brayan-`. Doit être identique au nom du fichier. |
| `section` | oui | `cours`, `grammaire`, `verbes`, `vocabulaire`, `lecture`, `ecoute`, `ecriture` ou `oral` |
| `title` | oui | titre court en français |
| `level` | oui | `A2` ou `B1` |
| `topic` | oui | thème court, réutilisé pour les statistiques (ex. « Datif », « Voyage ») |
| `summary` | oui | une phrase |
| `createdAt` | oui | date `AAAA-MM-JJ` |
| `release` | hors cours | entier ≥ 0 : créneau de sortie (un créneau tous les 3 jours) |
| `teacher` | cours | `logan` ou `brayan` |
| `source` | non | nom du fichier de cours d'origine |
| `tags` | non | liste de thèmes secondaires |
| `lesson` | oui | liste de blocs (voir ci-dessous) |
| `verbs` | non | liste de verbes (section verbes, ou verbes vus en cours) |
| `vocab` | non | liste de mots |
| `exercises` | voir règle | exercices d'entraînement (avec correction immédiate) |
| `exam` | voir règle | questions d'examen (différentes des exercices) |
| `reading` | lecture | texte à lire (voir « Compétences ») |
| `listening` | ecoute | document sonore (voir « Compétences ») |
| `task` | ecriture, oral | sujet d'expression (voir « Compétences ») |

**Règle** : si le pack contient au moins 3 verbes ou 6 mots, les exercices sont générés automatiquement à partir de ces listes
(`exercises` et `exam` deviennent facultatifs). Sinon, il faut **au moins 6 `exercises` et 6 `exam`** (idéalement 8 et 10).

## Blocs de leçon

Texte avec `**gras**` et `*italique*`.

```json
{ "type": "h", "text": "Titre de partie" }
{ "type": "p", "text": "Paragraphe d'explication." }
{ "type": "list", "items": ["point 1", "point 2"] }
{ "type": "table", "head": ["Cas", "masc."], "rows": [["Nominatif", "der"]] }
{ "type": "examples", "items": [{ "de": "Ich helfe **dem** Mann.", "fr": "J'aide l'homme." }] }
{ "type": "tip", "text": "Astuce ou piège fréquent pour un francophone." }
```
Chaque ligne d'un tableau doit avoir autant de cellules que `head`.

## Exercices

Tous acceptent `tag` (thème pour les statistiques, sinon `topic`) et `why` (explication affichée après correction — **toujours la remplir**).

```json
{ "type": "mcq", "q": "Ich fahre ___ Bus.", "options": ["mit dem", "mit den", "mit der"], "answer": 0, "why": "mit + datif ; der Bus → dem Bus" }
{ "type": "gap", "q": "Ich gebe ___ Frau das Buch.", "answers": ["der"], "hint": "die Frau, au datif", "why": "..." }
{ "type": "translate", "dir": "fr-de", "q": "Je vais à la maison.", "answers": ["Ich gehe nach Hause.", "Ich gehe heim."], "why": "..." }
{ "type": "order", "q": "Remets dans l'ordre", "answers": ["Ich bleibe zu Hause, weil ich krank bin.", "Weil ich krank bin, bleibe ich zu Hause."], "why": "..." }
{ "type": "match", "q": "Associe", "pairs": [["helfen", "aider"], ["danken", "remercier"], ["gefallen", "plaire"]] }
{ "type": "conjugation", "verb": "fahren", "fr": "conduire", "tense": "praesens", "forms": ["fahre","fährst","fährt","fahren","fahrt","fahren"], "ask": [1,2,4] }
{ "type": "cloze", "text": "Gestern [bin] ich nach Berlin [gefahren].", "hint": "fahren au Perfekt", "why": "..." }
{ "type": "dictation", "text": "Kann ich mit Karte zahlen?", "fr": "Je peux payer par carte ?" }
```

- `cloze` : texte à trous multiples ; chaque trou entre `[crochets]`, variantes acceptées séparées par `|` (`[gefahren|gereist]`). Idéal pour un verbe en deux morceaux.
- `dictation` : la phrase est lue par la synthèse vocale ; la note est la part de mots corrects. À utiliser surtout dans la section `ecoute`.
- QCM : les options sont mélangées automatiquement à l'affichage (sauf der/die/das, haben/sein, Richtig/Falsch). Pour un vrai/faux, utiliser `["Richtig", "Falsch"]`.

- `gap` : exactement **un** `___` dans `q`. La réponse peut faire plusieurs mots (« auf den »).
- `answers` : mettre **toutes** les réponses correctes raisonnables (ordre des mots alternatif, synonymes). La correction ignore majuscules, ponctuation et accepte ae/oe/ue/ss.
- `order` : les mots proposés sont ceux de `answers[0]` ; les autres réponses doivent utiliser exactement les mêmes mots.
- `mcq` : `answer` est l'index (0 = première option). Varier la position de la bonne réponse.
- `tense` : `praesens`, `perfekt`, `praeteritum`, `futur`. `forms` = 6 formes dans l'ordre ich, du, er/sie/es, wir, ihr, sie/Sie.

## Verbes

```json
{
  "inf": "aufstehen", "fr": "se lever", "kinds": ["fort", "separable"], "aux": "sein", "partizip": "aufgestanden",
  "sep": "auf",
  "praesens": ["stehe","stehst","steht","stehen","steht","stehen"],
  "praeteritum": ["stand","standst","stand","standen","standet","standen"],
  "example": { "de": "Ich stehe jeden Tag um 7 Uhr auf.", "fr": "Je me lève tous les jours à 7 h." },
  "note": "Astuce facultative"
}
```
- `kinds` parmi : `regulier`, `fort`, `mixte`, `modal`, `separable`, `reflechi`, `datif`, `auxiliaire`.
- Verbe séparable : `sep` = la particule ; **ne pas** la mettre dans `praesens`/`praeteritum` (elle est ajoutée automatiquement). `partizip` contient la particule (« aufgestanden »).
- Verbe réfléchi : `"refl": true`, `inf` **sans** « sich » ; **ne pas** mettre le pronom réfléchi dans les formes.
- Perfekt et Futur I sont calculés automatiquement à partir de `aux`, `partizip` et `inf`.
- **`ctx` (obligatoire pour les nouveaux verbes)** : 2 phrases du quotidien par verbe, à des temps différents, avec **toutes les formes du verbe entre crochets** (auxiliaire, participe, particule, pronom réfléchi) :
  ```json
  "ctx": [
    { "t": "praesens", "de": "Am Wochenende [stehe] ich erst um zehn Uhr [auf].", "fr": "Le week-end, je ne me lève qu'à dix heures." },
    { "t": "perfekt", "de": "Wir [haben uns] im Café [getroffen].", "fr": "Nous nous sommes retrouvés au café." }
  ]
  ```
  Le validateur vérifie que les mots entre crochets correspondent exactement à une forme du tableau de conjugaison (ordre libre, particule collée acceptée en subordonnée). Ces phrases deviennent des exercices « verbes en contexte ».

## Vocabulaire

```json
{ "de": "Bahnhof", "fr": "la gare", "article": "der", "plural": "Bahnhöfe", "ex": { "de": "Der Bahnhof ist weit.", "fr": "La gare est loin." } }
```
- Noms : `article` obligatoire, `plural` sans article (`"-"` s'il n'y a pas de pluriel).
- Autres mots (verbes, adjectifs, expressions) : pas d'article.
- Pour que l'exercice à trous fonctionne, l'exemple `ex.de` doit contenir le mot `de` tel quel.
- 12 à 16 mots par pack de vocabulaire.

## Compétences (lecture, écoute, écriture, oral)

**Lecture** — `reading` + 6 `exercises` + 6 `exam` (QCM, Richtig/Falsch, gap) portant sur le texte :
```json
"reading": { "title": "WG-Zimmer in Köln", "kind": "Petite annonce", "paragraphs": ["…", "---", "…"], "glossary": [{ "de": "möbliert", "fr": "meublé" }] }
```
Texte de 180 à 300 mots, au format de l'examen B1 (mail, annonce, article, forum). `"---"` trace un séparateur ; `\n` force un retour à la ligne.

**Écoute** — `listening` + 6 `exercises` (dont 2 `dictation`) + 6 `exam` (dont 1 `dictation`) :
```json
"listening": { "title": "In der Bäckerei", "situation": "Samedi matin…", "lines": [{ "who": "Verkäufer", "de": "Guten Morgen!" }], "glossary": [] }
```
8 à 12 répliques courtes et naturelles ; deux interlocuteurs au plus (voix différentes) ; chiffres écrits en lettres si leur lecture est ambiguë.

**Écriture et oral** — `task`, pas d'exercices :
```json
"task": {
  "prompt": "Ta amie t'invite… Écris-lui un mail (environ **80 mots**).",
  "points": ["Remercie-la", "…"],
  "minWords": 80,
  "prepSeconds": 60, "speakSeconds": 90,
  "phrases": [{ "de": "Vielen Dank für…", "fr": "Merci pour…" }],
  "model": "Texte modèle en allemand (\n entre les paragraphes)",
  "modelFr": "Traduction",
  "criteria": ["facultatif : critères d'auto-évaluation pour l'oral"]
}
```
`minWords` pour l'écriture, `prepSeconds` / `speakSeconds` pour l'oral. 6 à 8 `phrases`. Le modèle reste au niveau visé.

## Corrections de rédactions

Les rédactions envoyées depuis le site arrivent dans `ecrits/<id>.md` (en-tête `pack:` et `date:`, puis le texte après `---`).
La correction s'écrit dans `src/content/corrections/<id>.json` (même `<id>`) :
```json
{ "id": "2026-11-12_ecrire-invitation_1321", "pack": "ecrire-invitation", "date": "2026-11-12",
  "text": "texte original, inchangé", "corrected": "texte corrigé, les corrections en **gras**",
  "comments": [{ "original": "Ich habe gegangen", "fix": "Ich bin gegangen", "why": "Déplacement → sein au Perfekt." }],
  "summary": "Bilan en 2-3 phrases : points forts, priorité de travail.", "level": "A2+" }
```

## Qualité — à vérifier avant d'enregistrer

1. Allemand correct (articles, terminaisons, cas, ordre des mots, orthographe réformée : *dass*, *muss*, *Fluss*).
2. Une seule bonne réponse par QCM ; toutes les réponses acceptables listées dans `answers`.
3. Chaque exercice a un `why` utile, en français.
4. Le niveau correspond (A2 ou B1) ; phrases courtes et naturelles, du quotidien d'une étudiante.
5. `npm run validate` passe sans erreur.
