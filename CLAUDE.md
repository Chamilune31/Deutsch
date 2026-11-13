# Plateforme d'allemand (A2 → B1)

Site statique (Vite + React + TypeScript) pour une seule utilisatrice francophone. Aucune IA à l'exécution :
le contenu est écrit par Claude dans `src/content/packs/*.json`, validé au build, puis déployé.

- Format des packs : `docs/FORMAT-CONTENU.md`
- Génération automatique (tâche planifiée) : `GENERATION.md`
- Programme à venir : `docs/programme.json`
- Cours déposés par l'utilisatrice : `cours/logan/`, `cours/brayan/` (suivi dans `cours/processed.json`)
- Rédactions envoyées depuis le site : `ecrits/` ; corrections : `src/content/corrections/`
- Progression de l'utilisatrice, synchronisée par le site : `progres/progression.json` (lecture seule pour Claude)
- Sections : grammaire, verbes, vocabulaire (apprendre) ; lecture, ecoute, ecriture, oral (compétences B1) ; cours

Commandes : `npm run dev`, `npm run validate`, `npm run build`, `npm test`.
L'interface et les explications sont en français ; les exemples en allemand avec traduction.
