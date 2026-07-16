---
name: genizio-backlog
description: Fonctionnalités futures et différées, avec pourquoi
metadata:
  type: project
  status: living-document
  last_updated: 2026-07-16
---

# Backlog

- **Concours & Prix mensuels** : Promouvoir certains exploits avec des concours sponsorisés par des entreprises (idée mentionnée par l'utilisateur : "prix et concours mensuel etc.").
- **Génération IA plus fine** : Ajuster les prompts pour mieux contextualiser les défis à l'Afrique francophone (matériaux, environnements spécifiques).
- **Application mobile dédiée** : Transformer cette PWA (TanStack Start) en application mobile native ou Capacitor pour simplifier la prise de photo.
- **Paramétrage des récompenses** : Permettre au parent de configurer des cadeaux physiques ou monétaires débloqués en fonction des points de talents accumulés.
- **Confirmation du guide de marque officiel** : Si l'utilisateur obtient un fichier de police source ou un guide de marque pour le logo, revérifier le choix "Fredoka" comme police d'affichage (cf. [[genizio-decisions]] #6 — actuellement une estimation visuelle, pas une valeur confirmée).
- **Refonte UI globale** : L'utilisateur juge l'UI actuelle "AI-generated" / générique au-delà de la seule question de la police — discussion explicitement mise en pause le temps de traiter Naya en premier ("avant de parler de l'ui globale je vais parler de l'IA interne"). Reprendre cette conversation une fois Naya scoping terminé. Une tentative d'import via un wireframe Claude Design (`Génizio Wireframes.dc.html`) a échoué faute d'accès (voir [[genizio-etat-code]]) — reste à trouver un moyen d'en récupérer le contenu (export/partage claudeusercontent.com, ou fichier local).
- **Audit ligne à ligne post-rename** : `genizio_etat_code.md` "Ce qui est en place et fonctionne" date du 2026-07-15 et n'a pas été re-vérifié fonctionnellement depuis (seuls les textes/branding ont changé). Faire un passage de vérification directe dans le navigateur des flux clés (génération de défi, validation de preuve) avant la prochaine session de fonctionnalités.
- **Vue Postgres dédiée pour le Mur public** : la policy RLS publique sur `child_profiles` (cf. [[genizio-decisions]] #10) expose encore toutes les colonnes (âge, ville, pays, talents...) des profils ayant un défi complété, alors que `/feed` n'a besoin que de `name` et `avatar_color`. Créer une vue/RPC dédiée n'exposant que ces deux colonnes, puis migrer `feed.tsx` dessus.
- **Audit RLS complet du schéma** : seules `child_profiles` et `challenges` ont été vérifiées via `pg_policies` le 2026-07-16. Les autres tables (bucket `proofs`, etc.) n'ont pas été auditées avec la même rigueur — à faire avant toute mise en production réelle avec de vrais utilisateurs.
- **Rotation de `ANTHROPIC_API_KEY`** : cette clé a été commitée dans `.env` et poussée sur GitHub (repo privé `mercurebeauty-eng/geniusio`, commit `31d48ea`) avant d'être retirée du suivi git le 2026-07-16 (cf. [[genizio-decisions]]). Le repo étant privé le risque est contenu, mais la clé reste dans l'historique git — recommandé de la régénérer sur console.anthropic.com par précaution.
