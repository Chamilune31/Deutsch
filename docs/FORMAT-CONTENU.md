# Format d'un pack de contenu (JSON)

Un **pack** = une leçon + ses exercices + son examen. Un fichier par pack, dans `src/content/packs/<id>.json`.
Les explications sont **en français**, les exemples **en allemand** avec traduction. Niveau visé : A2 → B1.

## Champs du pack

| Champ | Obligatoire | Description |
|---|---|---|
| `id` | oui | minuscules, chiffres, tirets. Préfixe : `gram-`, `verb-`, `vocab-`, `cours-logan-`, `cours-brayan-`. Doit être identique au nom du fichier. |
| `section` | oui | `cours`, `grammaire`, `verbes` ou `vocabulaire` |
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
```

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

## Vocabulaire

```json
{ "de": "Bahnhof", "fr": "la gare", "article": "der", "plural": "Bahnhöfe", "ex": { "de": "Der Bahnhof ist weit.", "fr": "La gare est loin." } }
```
- Noms : `article` obligatoire, `plural` sans article (`"-"` s'il n'y a pas de pluriel).
- Autres mots (verbes, adjectifs, expressions) : pas d'article.
- Pour que l'exercice à trous fonctionne, l'exemple `ex.de` doit contenir le mot `de` tel quel.
- 12 à 16 mots par pack de vocabulaire.

## Qualité — à vérifier avant d'enregistrer

1. Allemand correct (articles, terminaisons, cas, ordre des mots, orthographe réformée : *dass*, *muss*, *Fluss*).
2. Une seule bonne réponse par QCM ; toutes les réponses acceptables listées dans `answers`.
3. Chaque exercice a un `why` utile, en français.
4. Le niveau correspond (A2 ou B1) ; phrases courtes et naturelles, du quotidien d'une étudiante.
5. `npm run validate` passe sans erreur.
