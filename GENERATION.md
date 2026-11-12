# Génération automatique du contenu

Instructions pour la tâche Claude planifiée (tous les 3 jours). Elles peuvent aussi être lancées à la main :
« Lis GENERATION.md et exécute-le. »

Le format des packs est décrit dans `docs/FORMAT-CONTENU.md` : **le lire en entier avant d'écrire quoi que ce soit.**

## 0. Préparer
```bash
git pull
npm ci
```

## 1. Corriger les rédactions envoyées
1. Lister `ecrits/*.md`. Pour chaque fichier sans correction `src/content/corrections/<même nom>.json` :
   lire l'en-tête (`pack:`, `date:`) et le texte, retrouver le sujet dans `src/content/packs/<pack>.json`.
2. Écrire la correction (format dans FORMAT-CONTENU.md) : texte corrigé en gardant les idées de l'utilisatrice,
   une entrée par faute avec une explication courte en français, un bilan bienveillant et précis, un niveau estimé (A2, A2+, B1).
3. Si une même erreur revient (cas, place du verbe, auxiliaire…), le mentionner dans le bilan et en tenir compte à l'étape 3.

## 2. Transformer les nouveaux cours
1. Lister les fichiers PDF / Word de `cours/logan/` et `cours/brayan/`.
2. Comparer avec `cours/processed.json` : ne traiter que les fichiers absents de la liste.
3. Pour chaque nouveau fichier :
   - lire son contenu (PDF : outil de lecture ou `pdftotext` ; Word : `pandoc fichier.docx -t plain` ou python-docx) ;
   - créer `src/content/packs/cours-<prof>-<sujet-court>.json` :
     `section: "cours"`, `teacher` = nom du dossier, `source` = nom du fichier, pas de `release` ;
     une leçon qui reprend et clarifie les notions du cours, le vocabulaire et les verbes vus (`vocab`, `verbs` avec `ctx`),
     8 à 10 `exercises` et 10 à 12 questions `exam` variées (dont des `cloze`), toutes avec un `why` ;
   - ajouter `{ "file": "<prof>/<fichier>", "pack": "<id>", "date": "AAAA-MM-JJ" }` dans `cours/processed.json`.
4. Si un fichier est illisible (scan sans texte, fichier vide), l'ajouter quand même à `processed.json` avec `"error": "<raison courte>"` et le signaler dans le résumé final.

## 3. Garder de l'avance dans les sections
Le site débloque un créneau tous les `intervalDays` jours à partir de `startDate` (`src/content/config.json`).

1. Calculer le créneau courant : `floor((aujourd'hui − startDate) / intervalDays)`.
2. Pour chaque section `grammaire`, `verbes`, `vocabulaire`, `lecture`, `ecoute`, `ecriture`, `oral` :
   - `maxRelease` = plus grand `release` parmi les packs de la section ;
   - tant que `maxRelease < créneau courant + 3` (et **au maximum 2 nouveaux packs par section et par exécution**) :
     prendre le premier sujet de `a_venir` dans `docs/programme.json`, créer le pack avec `release = maxRelease + 1`,
     puis déplacer le sujet vers `faits` (en y mettant l'id du pack).
3. Si `a_venir` d'une section est vide, proposer 5 nouveaux sujets cohérents (A2 → B1, utiles pour une étudiante en école de commerce) et les ajouter.

Rappels de contenu :
- Grammaire : leçon claire (tableaux, exemples traduits, pièges pour francophones), 8 `exercises` + 8 `exam` variés (mcq, gap, cloze, translate, order).
- Verbes : 5 ou 6 verbes complets, **chacun avec 2 phrases `ctx`** ; une leçon courte.
- Vocabulaire : 12 à 16 mots avec article, pluriel et exemple contenant le mot tel quel.
- Lecture / écoute / écriture / oral : voir « Compétences » dans FORMAT-CONTENU.md ; thèmes de la vie quotidienne, des études et du travail, au format de l'examen B1.
- Si un cours récent ou une correction de rédaction révèle une difficulté, privilégier un sujet qui la retravaille.

## 4. Règles importantes
- **Ne jamais réordonner ni supprimer** les exercices, verbes ou phrases `ctx` d'un pack existant : la progression enregistrée y fait référence par position. Corriger une faute sur place est permis ; ajouter à la fin aussi.
- Ne pas modifier `startDate`. Ne pas modifier les fichiers de `ecrits/` ni de `cours/` (sauf `processed.json`).
- Allemand irréprochable : relire chaque phrase.

## 5. Vérifier, puis publier
```bash
npm run validate   # doit afficher ✅
npm test
npm run build      # doit réussir
```
Corriger jusqu'à ce que les trois passent. Puis :
```bash
git add -A
git commit -m "Contenu : <liste courte des nouveaux packs et corrections>"
git push
```
Le site se redéploie automatiquement après le push.

## 6. Résumé
Terminer par un court résumé en français : rédactions corrigées, cours transformés, nouveaux packs (titre + date de sortie), problèmes éventuels.
