# Génération automatique du contenu

Instructions pour la tâche Claude planifiée (tous les 3 jours). Elles peuvent aussi être lancées à la main :
« Lis GENERATION.md et exécute-le. »

Le format des packs est décrit dans `docs/FORMAT-CONTENU.md` : **le lire en entier avant d'écrire quoi que ce soit.**

## 0. Préparer
```bash
git pull
npm ci
```

## 1. Transformer les nouveaux cours
1. Lister les fichiers PDF / Word de `cours/logan/` et `cours/brayan/`.
2. Comparer avec `cours/processed.json` : ne traiter que les fichiers absents de la liste.
3. Pour chaque nouveau fichier :
   - lire son contenu (PDF : outil de lecture ou `pdftotext` ; Word : `pandoc fichier.docx -t plain` ou python-docx) ;
   - créer `src/content/packs/cours-<prof>-<sujet-court>.json` :
     `section: "cours"`, `teacher` = nom du dossier, `source` = nom du fichier, pas de `release` ;
     une leçon qui reprend et clarifie les notions du cours, le vocabulaire et les verbes vus (`vocab`, `verbs`),
     8 à 10 `exercises` et 10 à 12 questions `exam`, toutes avec un `why` ;
   - ajouter `{ "file": "<prof>/<fichier>", "pack": "<id>", "date": "AAAA-MM-JJ" }` dans `cours/processed.json`.
4. Si un fichier est illisible (scan sans texte, fichier vide), l'ajouter quand même à `processed.json` avec `"error": "<raison>"` et le signaler dans le résumé final.

## 2. Garder de l'avance dans les sections
Le site débloque un créneau tous les `intervalDays` jours à partir de `startDate` (`src/content/config.json`).

1. Calculer le créneau courant : `floor((aujourd'hui − startDate) / intervalDays)`.
2. Pour chaque section `grammaire`, `verbes`, `vocabulaire` :
   - `maxRelease` = plus grand `release` parmi les packs de la section ;
   - tant que `maxRelease < créneau courant + 3` (et **au maximum 2 nouveaux packs par section et par exécution**) :
     prendre le premier sujet de `a_venir` dans `docs/programme.json`, créer le pack avec `release = maxRelease + 1`,
     puis déplacer le sujet vers `faits` (en y mettant l'id du pack).
3. Si `a_venir` est vide, proposer 5 nouveaux sujets cohérents (A2 → B1, utiles pour une étudiante en école de commerce) et les ajouter à `a_venir`.

Rappels de contenu :
- Grammaire : leçon claire (tableaux, exemples traduits, pièges pour francophones), 8 `exercises` + 8 `exam` variés.
- Verbes : 5 ou 6 verbes complets (les exercices sont générés automatiquement), une leçon courte.
- Vocabulaire : 12 à 16 mots avec article, pluriel et exemple contenant le mot tel quel.
- Si un cours récent porte sur un thème, privilégier un sujet proche pour réviser.

## 3. Règles importantes
- **Ne jamais réordonner ni supprimer** les exercices d'un pack existant : la progression enregistrée y fait référence par position. Corriger une faute sur place est permis ; ajouter à la fin aussi.
- Ne pas modifier `startDate`.
- Allemand irréprochable : relire chaque phrase.

## 4. Vérifier, puis publier
```bash
npm run validate   # doit afficher ✅
npm run build      # doit réussir
```
Corriger jusqu'à ce que les deux passent. Puis :
```bash
git add -A
git commit -m "Contenu : <liste courte des nouveaux packs>"
git push
```
Le site se redéploie automatiquement après le push.

## 5. Résumé
Terminer par un court résumé en français : cours transformés, nouveaux packs (titre + date de sortie), problèmes éventuels.
