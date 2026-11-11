# Deutsch B1 — ma plateforme d'allemand

Site gratuit pour passer de A2 à B1 : **Mes cours** (Logan, Brayan), **Grammaire**, **Verbes**, **Vocabulaire**,
avec exercices, examens chronométrés, révision espacée et recommandations.
Aucune clé API : le contenu est rédigé par Claude (avec ton abonnement) et le site le corrige tout seul.

## Mise en ligne (une seule fois, environ 10 minutes)

1. **GitHub** — crée un dépôt **privé** vide nommé `allemand-b1` (sans README).
   Privé, pour que tes supports de cours ne soient pas publics.
2. **Envoyer le code** dans ce dépôt (Claude peut le faire si GitHub est connecté à Claude ; sinon) :
   ```bash
   cd allemand
   git init && git add -A && git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/allemand-b1.git
   git push -u origin main
   ```
3. **Vercel** (gratuit) — sur vercel.com : *Continue with GitHub* → *Add New… → Project* → choisis `allemand-b1` → *Deploy*.
   Vite est détecté automatiquement. Tu obtiens une adresse du type `allemand-b1.vercel.app`.
   Chaque modification poussée sur GitHub redéploie le site automatiquement.
4. Dans `src/content/config.json`, renseigne `"repoUrl": "https://github.com/<ton-pseudo>/allemand-b1"` :
   le bouton « ouvrir la page d'envoi » de *Mes cours* pointera vers ton dossier de cours.

> GitHub Pages ne fonctionne gratuitement qu'avec un dépôt **public** : c'est pour cela qu'on passe par Vercel.

## Le renouvellement automatique (tous les 3 jours)

- Le site débloque **un nouveau pack par section tous les 3 jours** (date de départ : `startDate` dans `src/content/config.json`).
  Le contenu de départ couvre environ 3 semaines.
- Une **tâche planifiée Claude** suit `GENERATION.md` : elle transforme les cours déposés, ajoute de nouveaux packs
  en suivant `docs/programme.json`, vérifie tout (`npm run validate && npm run build`) puis pousse sur GitHub.
- Pour qu'elle fonctionne, GitHub doit être connecté à Claude (Paramètres → Connecteurs) avec accès à ce dépôt.

## Ajouter un cours

- **Automatique** : dépose le PDF ou le Word dans `cours/logan/` ou `cours/brayan/` sur GitHub (*Add file → Upload files*).
- **Immédiat** : page *Mes cours* → *Copier le prompt* → colle-le dans Claude avec ton fichier → colle la réponse sur le site.

## Bon à savoir

- Ta progression est enregistrée dans ton navigateur. Page *Progrès* → *Télécharger ma sauvegarde* pour la transférer sur un autre appareil.
- Pour tout débloquer (aperçu) : ajoute `#/?unlock=all` à l'adresse ; `#/?unlock=off` pour revenir au calendrier.
- Le site est accessible à toute personne qui connaît son adresse (les fichiers de cours, eux, restent dans le dépôt privé).

## Développement

```bash
npm install
npm run dev        # site local
npm run validate   # vérifie le contenu
npm test           # tests
npm run build      # version de production (dossier dist/)
```

Format du contenu : `docs/FORMAT-CONTENU.md`.
