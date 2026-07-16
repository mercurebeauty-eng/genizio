---
name: genizio-decisions
description: Décisions d'architecture et produit — quoi, pourquoi, alternatives rejetées
metadata:
  type: project
  status: living-document
  last_updated: 2026-07-16
---

## Décision #1 : Nom du projet — Geniusio
**Décision** : Le projet s'appelle Geniusio (nom d'origine).
**Pourquoi** : Choix de la marque par l'utilisateur.
**Statut** : Superseded par [[#4]] (2026-07-16) — renommé en Genizio puis Génizio.

## Décision #2 : Stockage des intelligences en JSONB
**Décision** : La "Carte des Talents" est stockée dans un champ JSONB `talents` de la table `child_profiles`.
**Pourquoi** : Flexibilité pour ajouter de nouvelles intelligences sans changer le schéma ni multiplier les tables.
**Alternatives rejetées** :
- ❌ Créer une table relationnelle `child_talents` : Trop complexe pour le MVP et moins flexible pour itérer vite.

## Décision #3 : Validation par IA — ⚠️ CORRIGÉ (2026-07-16, voir note d'audit)
**Décision d'origine (2026-07-15)** : Utiliser la passerelle existante Lovable avec le modèle `google/gemini-3-flash-preview` pour analyser les preuves photos.
**Pourquoi (d'origine)** : L'utilisateur était d'accord pour utiliser Gemini Flash existant plutôt que de configurer manuellement une clé Anthropic. L'IA doit être multimodale pour analyser les photos.
**Note d'audit (2026-07-16)** : en relisant `src/lib/challenges.functions.ts` (fonction `callClaude`), le code réel appelle **directement l'API Anthropic** (`https://api.anthropic.com/v1/messages`, clé `ANTHROPIC_API_KEY` dans `.env`) avec `claude-sonnet-5` pour la vision (analyse photo) et `claude-haiku-4-5-20251001` pour le texte — pas Gemini Flash, pas de passerelle Lovable. Soit la décision d'origine n'a jamais été implémentée telle quelle, soit un changement ultérieur non documenté a basculé vers Anthropic direct. **L'état réel du code fait foi** : voir [[genizio-etat-code]].
**Trade-off actuel** : dépendance à une clé Anthropic directe (dans `.env`, non commitée) plutôt qu'à un proxy géré — pas de trade-off "gain de temps" comme prévu à l'origine, configuration manuelle déjà en place.

## Décision #4 : Renommage Geniusio → Genizio → Génizio
**Décision** : Le projet s'appelle définitivement **Génizio**, avec accent aigu sur le é.
**Pourquoi** : Le 2026-07-16, l'utilisateur a d'abord demandé le renommage en "Genizio" (sans accent), appliqué dans tout le code applicatif. Le même jour, il a partagé le logo officiel qui affiche "Génizio" avec accent — jeu de mots volontaire avec "génie" (tagline du logo : *"Avec, comme souvent, votre enfant a un génie en lui."*). Question posée explicitement à l'utilisateur pour trancher entre les deux graphies ; réponse : **avec accent**.
**Alternatives rejetées** :
- ❌ Garder "Genizio" sans accent (plus simple pour URLs/domaines/handles réseaux sociaux, mais perd le jeu de mots avec "génie" qui est la raison d'être du nom) — explicitement rejeté par l'utilisateur au profit du sens.
**Application** :
- Texte affiché (titres, meta tags, contenu UI, prompts IA, manifest PWA) → "Génizio" / "GÉNIZIO".
- Identifiants techniques (id DOM `genizio-lab`, noms de fichiers `docs/memoire/genizio_*.md`, dossier du repo) → restent sans accent, volontairement (portabilité technique, pas de caractère accentué dans les identifiants).
- Les fichiers mémoire historiques sous l'ancien nom (`geniusio_*`) ont été renommés en `genizio_*` puisqu'ils sont des documents vivants activement maintenus, pas des archives figées.

## Décision #5 : Favicon complet via RealFaviconGenerator
**Décision** : Installer le jeu complet de favicons/icônes PWA généré par RealFaviconGenerator (favicon.svg, favicon-96x96.png, favicon.ico, apple-touch-icon.png, web-app-manifest-{192,512}x512.png, site.webmanifest), avec les balises `<head>` correspondantes traduites au format `head().links`/`meta` de TanStack Router (pas de `index.html` statique dans ce projet — `src/routes/__root.tsx` est le point d'entrée `<html>`).
**Pourquoi** : Demande explicite de l'utilisateur avec instructions fournies par l'outil lui-même.
**Point notable** : `site.webmanifest` généré par l'outil contenait déjà `"name": "Genizio"` (sans accent) — cohérent avec l'état du renommage à ce moment-là, mis à jour vers "Génizio" avec la Décision #4.

## Décision #6 : Typographie display — Fredoka (remplace Outfit)
**Décision** : La police d'affichage (`--font-display`, utilisée pour h1-h4 et le wordmark de marque) passe de "Outfit" à **"Fredoka"**. La police de corps de texte (`--font-body`) reste "Inter".
**Pourquoi** : L'utilisateur veut que toute l'app soit cohérente avec la typographie du logo officiel — un sans-serif géométrique arrondi, gras, aux contre-formes fermées et terminaisons très rondes, typique d'un branding ludique/enfantin. Fredoka est l'identification la plus proche disponible sur Google Fonts (alternative proche : Baloo 2, non retenue faute de test A/B — à revisiter si le rendu déçoit à l'usage).
**Alternatives rejetées** :
- ❌ Garder "Outfit" : géométrique mais anguleux, ne correspond pas au ton enfantin/rond du logo.
- ❌ Baloo 2 : candidat sérieux, non choisi arbitrairement — pas de source (fichier de police réel) fournie par l'utilisateur pour trancher avec certitude entre les deux, Fredoka retenu comme meilleure estimation visuelle.
**Non vérifié** : la police exacte du logo n'a pas été confirmée par une source authoritative (pas de fichier .ttf/.otf ni de spec de marque fournie) — seulement une estimation visuelle à partir de l'image du logo. Si l'utilisateur obtient un guide de marque officiel, revérifier ici.

## Décision #7 : Icône de marque dans la nav
**Décision** : Ajouter l'icône du logo (`/favicon-96x96.png`, 96×96 PNG) à côté du wordmark texte "GÉNIZIO" dans les 6 barres de navigation + le footer.
**Pourquoi** : Demande explicite de l'utilisateur ("Faut le logo fav à coté") sur l'élément nav de la page d'accueil, étendue par cohérence à toutes les occurrences du wordmark.
**Alternatives rejetées** :
- ❌ `favicon.svg` : le fichier fait ~400 Ko avec des tracés vectoriels très complexes (probablement une image auto-vectorisée) — provoquait des ralentissements de rendu notables dans le navigateur de preview (timeouts de capture d'écran). Le PNG 96×96 (14 Ko) donne un résultat visuellement identique à cette taille d'affichage sans le coût de rendu.

## Décision #8 : Authentification — Google uniquement
**Décision** : Retrait complet du flux email/mot de passe sur `/auth` (signup, signin, confirmation email, reset). Seul "Continuer avec Google" (Supabase OAuth) subsiste.
**Pourquoi** : Discussion explicite avec l'utilisateur — le public cible (familles à Dakar/Abidjan/Yaoundé, essentiellement Android) a quasi-universellement un compte Google, donc email/mot de passe n'ajoute que de la friction et du support (mots de passe oubliés, emails de confirmation) sans élargir l'audience de façon significative.
**Alternatives rejetées** :
- ❌ Garder les deux options en parallèle (c'était l'état avant cette décision) : plus de flexibilité mais plus de code de gestion d'erreurs/état à maintenir pour un bénéfice marginal vu le profil des utilisateurs.
**Trade-off accepté** : les quelques parents sans compte Google sont exclus. Pas de filet de secours si Google OAuth est indisponible localement un jour.

## Décision #9 : Naya — le mentor IA nommé, distinct de la marque Génizio
**Décision** : **Génizio** est la marque/plateforme (nom, logo, wordmark, positionnement). **Naya** est le personnage-mentor IA qui observe, analyse et parle aux enfants à l'intérieur de l'app — un nom et une identité visuelle distincts de la marque.
**Pourquoi** : L'utilisateur a jugé que l'UI actuelle "sent l'IA generate" et veut un supplément d'âme — un personnage incarné plutôt qu'un service anonyme. Il a fourni un logo Naya séparé (enfant avec bandana, sac à dos, dégradé orange→vert→bleu) et un template de référence (`draggable-child-avatar.tsx`, voir [[genizio-etat-code]]) montrant un avatar animé (yeux qui suivent la souris, clignements, bulles de pensée, particules au clic) comme direction d'interaction souhaitée.
**Application immédiate (2026-07-16)** : toutes les mentions où l'IA "parle"/"observe"/"analyse"/"compose" (prompts IA dans `challenges.functions.ts`, textes de chargement, labels "Rapport de...", "Analyse de...", toasts) sont passées de "Génizio" à "Naya". Les mentions de marque/plateforme pure (nav, footer, meta tags, description produit, positionnement marketing) restent "Génizio".
**Cas limite tranché** : "Le Laboratoire de Génizio" (titre de section dans `profiles.$profileId.challenges.tsx`) est resté côté marque (nom de feature), pas mentor — à revisiter si ça sonne faux à l'usage.
**Alternatives rejetées** :
- ❌ Un seul nom pour la marque et l'IA (statu quo précédent) : moins de charge cognitive à maintenir, mais c'est précisément ce qui rendait l'IA "anonyme"/générique selon l'utilisateur.
**Mise à jour (2026-07-16, plus tard le même jour)** : composant `src/components/NayaAvatar.tsx` implémenté (`framer-motion` : flottement, halo au survol, drag, particules, bulles de pensée) et intégré dans `laboratory.tsx` et `profiles.$profileId.challenges.tsx`. Asset source final = `Naya fav.jpg` fourni par l'utilisateur (meilleur cadrage que le premier essai) — c'était en réalité un **JPEG plat avec un damier de transparence peint en pixels**, pas un vrai canal alpha ; nettoyé par flood-fill programmatique (script PowerShell, détection des pixels gris/blanc du damier connectés aux bords) avant recadrage → `src/assets/naya-avatar.png`.

## Décision #10 : Correction d'une fuite de données RLS sur `child_profiles`
**Constat** : le 2026-07-16, en enquêtant sur pourquoi le profil "pari" restait visible après un changement de compte Google, une policy RLS `"Anyone can view child profiles"` (`qual: true`, `cmd: SELECT`) a été trouvée sur `public.child_profiles` en production. Combinée à la policy légitime `"Parents manage their own child profiles"`, elle rendait **tous les profils enfants de tous les comptes lisibles par n'importe quel utilisateur authentifié** (nom, âge, ville, pays, centres d'intérêt, talents) — vérifié en lisant `child_profiles` sans filtre depuis un compte n'ayant créé aucun profil et en obtenant quand même le profil d'un autre compte.
**Pourquoi cette policy existait probablement** : `feed.tsx` fait une jointure `challenges → child_profiles(name, avatar_color)` pour le Mur public, qui a besoin de lire le nom/couleur d'un enfant ayant complété un défi — mais la policy en place était bien plus large que nécessaire (toutes colonnes, tous profils, sans condition).
**Décision** : remplacer par une policy alignée sur le pattern déjà utilisé sur `public.challenges` (`"Anyone can view completed challenges"`, `status = 'completed'`) : `child_profiles` n'est publiquement lisible que pour les profils ayant au moins un défi au statut `completed`.
**Alternatives rejetées** :
- ❌ Supprimer la policy publique entièrement : aurait cassé l'affichage du nom/avatar sur le Mur public (`/feed`), une fonctionnalité voulue.
- ❌ Vue Postgres dédiée n'exposant que `id, name, avatar_color` (plus strict — n'expose aucune colonne sensible même pour les profils publics) : plus correct mais nécessite aussi de changer la requête dans `feed.tsx`. Différé en backlog, cf. [[genizio-backlog]].
**Application** : correctif appliqué directement en production via l'API Management Supabase (token PAT temporaire fourni par l'utilisateur, à révoquer après usage), puis reporté dans `supabase/migrations/20260716120000_fix_child_profiles_public_select_policy.sql` pour que le repo et la base réelle restent synchronisés.
**Non vérifié** : les autres tables du schéma (`proofs` bucket, etc.) n'ont pas été auditées avec la même rigueur — seules `child_profiles` et `challenges` ont été inspectées via `pg_policies`. À refaire avant mise en production réelle.

## Décision #11 : Refonte "Génizio v2" — dashboard, portfolio, Quest enfant, partage mentor
**Décision** : mixer trois sources pour la refonte UI/produit — le wireframe (`Génizio Wireframes.dc.html`,
6 écrans × 3 approches), le prototype hi-fi Claude Design (`Génizio App.dc.html`, construit sur le
même wireframe) comme référence visuelle/copy, et un plan d'implémentation technique propre
respectant l'architecture réelle du code (routing TanStack, pattern `createServerFn`, RLS).
**Pourquoi** : le hi-fi n'est pas une direction concurrente — son propre prompt de build cite le
wireframe comme source de vérité structurelle. Mais ni le wireframe ni le hi-fi ne sont du code
exécutable connecté aux vraies données/RLS/routes de l'app — un plan technique séparé était
nécessaire pour transformer ces références en implémentation réelle.
**Portée** : 7 phases (voir `C:\Users\USER\.claude\plans\refactored-soaring-prism.md` pour le détail
complet) — Phase 0 (schéma DB), Phase 1 (dashboard v2 + nav bar persistante empruntée au hi-fi),
Phase 1b (écran Portfolio, pas dans le wireframe d'origine mais présent comme écran de premier
rang dans le hi-fi), Phase 2 (détail de défi), Phase 3 (capture de résultat en chat avec Naya),
Phase 4 (vue Quest enfant — mode partagé sur l'appareil du parent, pas de nouvelle auth), Phase 5
(partage mentor scopé/révocable par lien, sans compte mentor requis — le chantier le plus à
risque, seule surface publique non-authentifiée de l'app), Phase 6 (réglages/consentement/export/
suppression de compte).
**Règle de contenu non-négociable héritée du hi-fi** : aucun score/percentile/classement/pass-fail
nulle part dans l'app — langage orienté forces uniquement ("émergent", "en développement", "pas
encore exploré"). Contredit l'UI actuelle qui affiche des pourcentages bruts ("Progression 71%") —
ces occurrences seront corrigées au fil des phases qui touchent chaque écran concerné.
**Alternatives rejetées** :
- ❌ Suivre le hi-fi pixel pour pixel : police générique, icône de marque générique, couleurs
  approximatives — pas notre vraie identité (Fredoka, tokens `--color-brand`/`-leaf`/`-sky`, vrai
  logo Génizio, `NayaAvatar`). Le hi-fi sert de référence de mise en page et de ton de copy, pas de
  source visuelle finale.
- ❌ Tout construire en un seul commit : 7 commits séparés, un par phase, chacun vérifié avant de
  passer au suivant — la Phase 5 (partage mentor) introduit la première route publique
  non-authentifiée de l'app, risque de confidentialité plus élevé que la fuite RLS déjà trouvée et
  corrigée cette session.
**Statut** : Phase 0 terminée et vérifiée (voir [[genizio-etat-code]]). Phases 1-6 en cours.
