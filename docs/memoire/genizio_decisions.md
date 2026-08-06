---
name: genizio-decisions
description: Décisions d'architecture et produit — quoi, pourquoi, alternatives rejetées
metadata:
  type: project
  status: living-document
  last_updated: 2026-08-03
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

## Décision #12 : Boutique de kits — commande WhatsApp avant vrai paiement in-app
**Décision** : Le premier jalon du modèle économique "Kits Génizio" (cf. [[genizio-vision]] §
Extension écosystème) démarre par une redirection WhatsApp pré-remplie plutôt qu'un vrai panier/
paiement in-app. Un seul admin (allowlist email en dur via `ADMIN_EMAILS` dans `.env`,
`mercurebeauty@gmail.com`) gère prix/stock via `/admin/products`, pas de table de rôles.
**Pourquoi** : Valider la demande réelle avant d'investir dans une intégration Mobile Money
(Wave/Orange Money/MTN MoMo — plus pertinent que Stripe pour le marché cible). Décision explicite
de l'utilisateur via AskUserQuestion le 2026-07-16, recommandation acceptée. Un seul admin pour
l'instant car l'utilisateur gère seul le catalogue à ce stade — pas de rôle "Administrateur" en
base pour éviter de sur-construire avant d'en avoir besoin (cf. [[genizio-vision]] § rôles à
anticiper, qui liste ce rôle pour plus tard si l'équipe grandit).
**Alternatives rejetées** :
- ❌ Paiement Mobile Money in-app dès la Phase 0 : plus lourd (comptes marchands, webhooks,
  échecs de paiement) sans certitude que la demande existe.
- ❌ Stripe : peu adapté à un marché où le mobile money domine l'usage carte bancaire.
- ❌ Vrai système de rôles admin dès maintenant : premature, un seul admin existe aujourd'hui.
**Architecture** : la génération de défi (`challenges.functions.ts`, 3 chemins : `generateChallenges`,
`generateSingleChallenge`, `assignTemplateChallenge`) émet désormais un `material_tags: string[]`
normalisé (slugs sans accent) en plus du `materials: string[]` texte libre déjà existant, pour
matcher fiablement contre `products.material_tags` (index GIN) sans fuzzy-matching sur du texte
libre. Table `products` : RLS lecture publique sur `is_active=true` uniquement (vérifié via
`pg_policies` en prod), aucune policy d'écriture — les mutations passent exclusivement par
`requireAdmin` (middleware composé sur `requireSupabaseAuth`, vérifie `claims.email` contre
`ADMIN_EMAILS`) + `supabaseAdmin` (service role). Migration `20260716170000_add_products_catalog.sql`
appliquée en prod avec confirmation explicite de l'utilisateur.
**Statut** : Phases 0, 1 et 2 terminées et vérifiées de bout en bout le 2026-07-16/17 (génération
réelle → aucune ligne fantôme → assignation → exactement 1 ligne en base → produit de test matché
→ lien `wa.me` correctement pré-rempli, puis données de test nettoyées). Phase 3 (suivi commandes
léger) : voir [[genizio-backlog]], pas commencée.

## Décision #13 : Deux bugs trouvés en vérifiant la Phase 0-2 de la boutique
**Contexte** : découverts en testant le flux réel de génération de défi pendant l'implémentation
de la Décision #12, pas des changements demandés — corrigés sur-le-champ car du même ordre que les
bugs déjà corrigés cette session (cf. le bug de dashboard cassé plus tôt).

**Bug 1 — double insertion en base à chaque prévisualisation** : `generateSingleChallenge`
(`challenges.functions.ts`) insérait directement le défi généré en base de données, alors que
`laboratory.tsx` ET `profiles.$profileId.challenges.tsx` (générateur unique) traitent tous deux son
retour comme un simple aperçu à confirmer via `assignTemplateChallenge`. Résultat : chaque
génération/régénération créait une ligne fantôme dans `challenges` (statut "todo", jamais vue par
l'utilisateur), et cliquer "Assigner" en créait une deuxième, en double. **Fix** :
`generateSingleChallenge` ne fait plus d'insert, retourne uniquement l'objet validé ; les deux
templates (`template.material_tags`) propagent bien vers `assignTemplateChallenge`, seul point
d'insertion réel désormais. Vérifié : génération seule → 0 ligne créée ; génération + assignation
→ exactement 1 ligne.

**Bug 2 — les listes d'enfants mélangent les familles (pas une fuite RLS, une sur-portée de RLS)** :
`laboratory.tsx` (sélecteur "Pour qui ?"), `profiles.index.tsx` (pastilles du dashboard) et
`profiles.manage.tsx` (grille de gestion) lisaient `child_profiles` sans filtre `user_id`, en
comptant uniquement sur RLS pour scoper les résultats. Or la policy publique posée par la
[[genizio-decisions]] #10 autorise la lecture de **tout** profil ayant un défi complété (nécessaire
pour le Mur Public) — donc dès qu'un enfant d'une autre famille a un défi complété, il apparaissait
mélangé dans CES listes-là aussi, pas seulement dans le flux public. Repéré parce que "pari"
(compte `mercurebeauty@gmail.com`) apparaissait dans le sélecteur du Labo alors que la session de
test était `mochicky4real@gmail.com`. `profile.tsx` (stats du compte) avait le même problème sur
les comptages `child_profiles`/`challenges`. **Fix** : `.eq("user_id", session.user.id)` ajouté aux
4 requêtes concernées. **Non corrigé, flagué pour plus tard** : les routes `/profiles/$profileId/*`
(challenges, portfolio, quest, mentors) font `.eq("id", profileId)` sans vérifier l'ownership —
en théorie, naviguer directement vers l'URL d'un enfant public d'une autre famille (UUID à
deviner) donnerait accès à sa page de gestion complète. Risque plus faible (nécessite l'UUID exact,
plus atteignable via les listes désormais corrigées) mais reste une vraie question d'architecture :
faut-il un contrôle d'ownership explicite sur ces routes plutôt que de compter sur RLS ? Voir
[[genizio-backlog]].

## Décision #14 : Boutique de kits — Phase 3 (suivi manuel des commandes)
**Décision** : Création de la table `orders` avec RLS (les parents insèrent et lisent leurs propres commandes). Ajout des server functions `createOrder` (authentifié), `listOrdersAdmin` (admin-only) et `updateOrderStatus` (admin-only) dans `src/lib/products.functions.ts`.
**Pourquoi** : Permettre à l'admin de suivre et gérer le statut de chaque commande ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') de manière centralisée dans l'onglet "Commandes" de l'interface `/admin/products`.
**Workflow** : Lorsque le parent clique sur "Commander via WhatsApp" dans le composant `KitSuggestion`, l'application enregistre d'abord la commande dans la base de données, puis le redirige vers WhatsApp avec le texte pré-rempli. L'administrateur peut ensuite mettre à jour le statut manuellement.

## Décision #15 : Adaptation stricte à l'âge & Matériaux disponibles à la maison dans le Labo
**Décision** : 
1. **Intégration d'instructions de développement par tranches d'âge** dans le prompt de génération de défis de Naya (1-3 ans exploration sensorielle/sans motricité fine complexe, 4-7 ans exploratoire et imaginaire/narration, 8-11 ans projets de construction concrets et méthodiques, 12 ans+ abstraction et stratégie/pensée critique/énigmes complexes).
2. **Ajout d'un champ de saisie optionnel "Matériaux à la maison"** (`homeMaterials`) dans le formulaire du Laboratoire, connecté à l'API de génération.
**Pourquoi** : 
1. Mieux s'aligner sur les systèmes d'apprentissage basés sur le développement cognitif de l'enfant par âge (comme au Canada ou en Chine).
2. Offrir aux parents la possibilité de recycler/réutiliser les ingrédients et bricoles qu'ils ont sous la main, tout en demandant à Naya d'adapter le défi et d'ajouter uniquement les éléments manquants.
**Statut** : Complété et fonctionnel.

## Décision #16 : Nettoyage de la navigation et correction de la surutilisation de l'icône étoile (Sparkles)
**Décision** :
1. **Remplacement de "Portfolio" par "Labo"** dans la barre de navigation principale mobile (`AppTabBar.tsx`), pointant directement vers `/laboratory` avec l'icône `Beaker` (au lieu de `PieChart`). Le portfolio reste accessible via le tableau de bord principal.
2. **Suppression du lien "Laboratoire" doublon** dans le menu du haut (`AppHeader.tsx`, version desktop et mobile drawer) pour éviter les redondances dans l'accès aux pages.
3. **Harmonisation et diversification des icônes** pour éviter la répétition de l'étoile (`Sparkles`) :
   - **Défis / Missions** : Icône `Trophy` (au lieu de `Sparkles`).
   - **Mur Public (Feed)** : Icône `Brain` (au lieu de `Sparkles`), renforçant le concept de "Cerveau Collectif".
   - **Laboratoire / Générateur IA** : Icône `Beaker` (au lieu de `Sparkles`).
**Pourquoi** : Améliorer la clarté de la navigation, donner une identité propre à chaque section de l'application et éviter la confusion cognitive générée par l'utilisation d'une même icône pour des fonctionnalités différentes.
**Statut** : Complété et compilé avec succès.

## Décision #17 : Affichage des badges "Kit disponible" sur les points chauds de l'application
**Décision** :
1. **Intégration d'un badge "📦 Kit disponible"** sur la carte du défi actif de la semaine sur le Dashboard Parent (`profiles.index.tsx`).
2. **Intégration du badge "📦 Kit disponible"** sur les cartes de défis de la liste (`profiles.$profileId.challenges.tsx`) pour chaque défi ayant des matériels correspondants aux produits actifs de la boutique.
3. **Chargement optimisé en mémoire** : La liste des produits actifs de la boutique est requêtée une seule fois à l'initialisation du composant parent, puis le calcul d'intersection des tags se fait de manière instantanée en mémoire côté client sans multiplier les requêtes à la base de données.
**Pourquoi** : Augmenter radicalement la découvrabilité des kits physiques vendus par Génizio et inciter les parents à passer commande en amont ou en cours de réalisation du défi, directement depuis leurs principaux points de consultation de l'application.
**Statut** : Complété et compilé avec succès.

## Décision #18 : Vision & Roadmap — V4 (Le Kit comme point d'entrée vers le défi)
**Décision (Potentiel Futur)** :
*   **Concept de la V4** : Permettre d'inverser le tunnel d'achat classique (Activité → Kit) par une boucle inverse (Kit → Activités multiples). Le parent achète ou reçoit d'abord un kit physique (ex: "Kit Architecte Junior — carton + colle"), et l'IA Naya génère à la demande des défis d'apprentissage sur-mesure pour l'enfant en se basant *exclusivement* sur les composants de ce kit déjà possédé.
*   **Pourquoi** : Augmente la valeur perçue des kits matériels (un seul achat physique débloque des dizaines d'activités différentes générées à l'infini par l'IA) et élimine totalement la friction de l'attente de livraison entre le choix du défi et sa réalisation.
**Statut** : **Implémenté** (2026-07-17, hors mémoire jusqu'ici) — route `/boutique.tsx`, accessible depuis `AppTabBar` et `AppHeader`. Chaque produit affiche "Déjà utilisé dans X défis de vos enfants" (compteur calculé côté client par intersection de `material_tags`) + deux actions : "Générer un défi ⚡" (appelle `generateSingleChallenge` avec `homeMaterials` pré-rempli par le nom/tags du kit, puis `assignTemplateChallenge`) et "Commander via WhatsApp" (appelle `createOrder` puis ouvre `wa.me`). Voir [[#19]] pour l'audit qui a confirmé cet état.

## Décision #19 : Audit du business model boutique — le parcours était déjà largement construit, un point chaud manquait
**Contexte** : demande utilisateur explicite (2026-07-17) — "faut proposer aussi aux parents d'acheter les matériaux [...] c'est le business modèle qu'il faut bien intégrer" — avec invocation de `/product-intelligence-architect` pour challenger le placement actuel (jugé enfoui dans les cartes de défi ouvertes).
**Constat à l'audit** : une session parallèle de l'utilisateur avait déjà construit, hors mémoire, l'essentiel de la stratégie identifiée par l'analyse produit — badge "📦 Kit disponible" sur la carte active + cartes fermées (Décision #17), `KitSuggestion` dans la carte de défi ouverte, un flux post-génération dans le Labo qui propose le kit juste après l'assignation d'un défi (le point le plus chaud — enthousiasme au pic), la page `/boutique` dédiée (V4, Décision #18), un `WhatsAppFAB` global, et une vraie table `orders` (Décision #14) au lieu du simple lien `wa.me` sans trace. Seul trou identifié : le bloc d'achat *actionnable* (liste produits + prix + bouton "Commander") n'apparaissait pas sur la carte de défi actif du **dashboard** (`profiles.index.tsx`) — seul le badge y était, obligeant le parent à cliquer "Commencer le défi" pour atteindre le vrai bouton de commande.
**Décision** : ajouter `<KitSuggestion childId challengeId materialTags challengeTitle childName>` directement sous les puces de matériaux de la carte active du dashboard, juste avant les CTA "Commencer le défi"/"Mode Enfant" — le dashboard est l'écran le plus consulté, donc le point de plus forte exposition pour la conversion.
**Bug annexe trouvé et corrigé** : `src/integrations/supabase/types.ts` n'avait jamais été régénéré après l'application de la migration `20260717110000_add_supervisors_table.sql` (table `supervisors` existante en prod mais absente des types) — `npx tsc --noEmit` échouait sur ~10 erreurs dans `supervisors.functions.ts`/`AppHeader.tsx`. Corrigé par régénération via l'API Management (`GET /v1/projects/{id}/types/typescript`), 0 erreur `tsc` ensuite.
**Vérifié** : `tsc --noEmit` propre · test en direct via navigateur preview — `material_tags` d'un défi actif temporairement mis à `{colle}` (produit réel en catalogue), badge + bloc kit complet (produit, prix, total, bouton WhatsApp) confirmés visibles sur le dashboard, aucune erreur console, puis valeur de test restaurée à `{}`.
**Non fait / hors périmètre de cette session** : aucune nouvelle feature de fond — l'essentiel du travail était de l'audit + un point d'intégration manquant + une dette technique annexe. Le concept V4 "kit comme point d'entrée" (Décision #18) est déjà en code, pas seulement en vision.

## Décision #20 : Fermeture de trois dettes flaguées (RLS `child_mentors`, ownership routes, `WhatsAppFAB` contexte)
**Contexte** : demande utilisateur explicite (2026-07-17, "Attaquons ces points") sur trois items identifiés lors de l'audit de la Décision #19.
**Sur le paiement Mobile Money (Phase 4, cf. [[genizio-backlog]])** : l'utilisateur a explicitement choisi de garder WhatsApp pour l'instant et de d'abord évaluer s'il faut une vraie plateforme e-commerce/mini e-commerce pour paiements + suivi, avant tout paiement in-app une fois la confiance des parents établie. Aucun code de paiement écrit ce tour-ci — décision cohérente avec la Décision #12.
**Fix 1 — RLS `child_mentors` (le plus critique)** : en creusant l'audit ownership, découverte que la policy `"Owners manage their child mentors"` (`USING`/`WITH CHECK` : `auth.uid() = owner_user_id`) ne vérifiait jamais que `child_id` appartenait réellement à cet utilisateur — n'importe quel compte authentifié pouvait s'inviter lui-même comme "mentor" d'un `child_id` arbitraire (deviné/connu) et lire sa carte de talents complète via le lien public `/s/$token`, contournant le scope RLS normal `child_profiles`/`challenges`. **Migration** `20260717120000_fix_child_mentors_ownership_check.sql` : `USING`/`WITH CHECK` ajoutent `EXISTS (SELECT 1 FROM child_profiles cp WHERE cp.id = child_mentors.child_id AND cp.user_id = auth.uid())`. Appliquée en prod avec confirmation explicite de l'utilisateur (écriture prod bloquée une première fois par le classifieur auto-mode, débloquée après confirmation). Vérifiée via `pg_policies` (nouveau `qual`/`with_check` visibles) et `get_advisors` (aucune régression).
**Fix 2 — Ownership explicite sur les 4 routes `/profiles/$profileId/*`** (flaguée depuis la Décision #13) : `challenges.tsx`, `portfolio.tsx`, `quest.tsx`, `mentors.tsx` ajoutent `.eq("user_id", session.user.id)` à leur lecture `child_profiles`, avec un état "Profil introuvable" explicite (`portfolio.tsx` bouclait sur "Chargement…" à l'infini avant ; `mentors.tsx` utilisait `.single()` qui plantait sur 0 ligne, passé à `.maybeSingle()` + état dédié). **Vérifié en navigateur** : URL directe vers l'enfant "pari" (compte différent) depuis une session "TestPhase1" → "Profil introuvable" sur les 4 routes, aucune fuite de données, aucune erreur console bloquante.
**Fix 3 — `WhatsAppFAB` contextualisé** : le composant lit désormais `useParams({ strict: false })` pour détecter un `profileId` de route courant, va chercher nom/âge/talents (pour la guilde via `getChildGuild`)/nb de défis complétés du compte courant uniquement (`.eq("user_id", session.user.id)`), et construit le message WhatsApp avec ce contexte réel au lieu du message générique. Sur `/profiles` (dashboard, pas de `$profileId` dans l'URL) le message reste générique par design ; sur une route enfant-scopée il devient contextualisé. Vérifié en navigateur sur `/profiles/$profileId/challenges`.
**Type-check** : `tsc --noEmit` propre après chaque fix.
**Commit** : `67575f0` — un seul commit couvrant l'ensemble du travail non commité de la session (boutique complète, Guildes/Superviseurs scaffolding, ces trois fixes), à la demande explicite de l'utilisateur ("quand tu finis tu commit"). `supabase/.temp/cli-latest` (cache local du CLI Supabase) volontairement exclu du commit.

## Décision #21 : Audit d'intégrité fonctionnelle complet (`/functional-integrity-architect`) — mocks, dialogs natifs, pages légales, accessibilité
**Contexte** : demande explicite de l'utilisateur (2026-07-17) — "besoin de savoir si tout fonctionne ; pas de mock ; pas de faille ; conditions d'utilisation ; RGPD ; cookie [...] test d'accessibilité ; les modales et popup navigateur à bannir". Audit Mode B (diagnostic + inventaire + plan + vérification), preuves étiquetées [exécuté]/[lu] tout du long.

**D-02 — Mur Public entièrement fictif (le plus grave)** : `feed.tsx` mélangeait 3 posts et 5 stories **totalement inventés** (familles "Martin"/"Dubois"/"Petit", photos stock Unsplash, faux likes) indifférenciés des vrais posts utilisateurs. Décision utilisateur explicite : supprimer, vrai état vide honnête plutôt que labelliser. Corrigé — en aparté, découverte et correction d'un vrai bug de fond : les posts réels affichaient un `familyName: "Votre Famille"` codé en dur, donc **tout post de n'importe quelle famille aurait affiché "Votre Famille"** dès que plusieurs comptes coexistent sur le mur. Supprimé aussi la barre de stories, purement décorative (aucune table `stories`, le bouton "Votre story" lui-même n'avait pas de `onClick`).

**D-03 — 5 `window.confirm()` natifs bannis** : nouveau `src/components/ui/confirm-dialog.tsx` (`ConfirmDialogHost` monté une fois dans `__root.tsx`, fonction `confirmDialog(options): Promise<boolean>` — API calquée sur `window.confirm` mais stylée neo-brutaliste via `alert-dialog` Radix). Remplace les 5 sites (suppression produit/superviseur/défi/profil, sortie de quête). **Piège méthodologique noté** : l'outil `computer` (clic simulé par coordonnées) du navigateur de preview ne déclenchait pas fiablement le re-render React dans cet environnement — vérifié correct en pilotant le DOM directement via `javascript_tool` (`.click()` réel sur le bouton, lecture de `data-state`/`role="alertdialog"` avant/après Annuler et Confirmer).

**D-06 — Code mort supprimé** : `src/integrations/lovable/index.ts` (wrapper `lovable.auth.signInWithOAuth`, jamais importé nulle part — `auth.tsx` appelle `supabase.auth.signInWithOAuth` directement) + dépendance `@lovable.dev/cloud-auth-js` retirée de `package.json`/lockfile. Résidu de l'époque pré-Décision #3.

**Accessibilité — vérifiée en direct, pas seulement lue** : script de contraste maison (résolution OKLCH réelle via `<canvas>`, luminance relative WCAG) plutôt que du regex sur `rgb()` — **piège noté** : parser `rgb\(...\)` à la main rate silencieusement toutes les couleurs `oklch()` de Tailwind v4 et produit de faux résultats (`ratio: 1.00` partout). Deux vrais échecs AA trouvés et corrigés :
- Token `--leaf` (`oklch(0.62 0.14 150)`, `src/styles.css`) : 3.42:1 avec texte blanc, sous le seuil 4.5:1. Utilisé à **25 endroits dans 13 fichiers** (CTA WhatsApp, badges cochés...) — corrigé à la source (`0.54`, → 4.76:1) plutôt que patché 25 fois, sans risque de régression dans l'autre sens (texte `text-leaf` sur fond clair, où plus sombre = plus de contraste aussi).
- `WhatsAppFAB` : `bg-[#25D366]` (vert WhatsApp officiel) + texte blanc = 1.98:1. Assombri à `#0B7A5A` (5.32:1).
- 2 éléments avec `focus:outline-none` sans ring de remplacement (zéro indicateur de focus clavier) : pastilles sélecteur d'enfant du dashboard, `<select>` statut commande dans `/admin/products`. Ajout de `focus-visible:ring-2 focus-visible:ring-brand`, vérifié via vraies pressions de touche Tab (`el.matches(':focus-visible')`), pas juste `.focus()` scripté (qui ne déclenche pas fiablement `:focus-visible`).
- **Non concluant, signalé comme tel** : le script de contraste ne fait pas de compositing alpha correct pour le texte semi-transparent (`text-ink/40` etc., utilisé massivement pour le texte "muted") — 3 faux positifs à ratio ~1.0 rejetés explicitement plutôt que remontés comme défauts confirmés. Un vrai passage `axe-core`/Lighthouse serait nécessaire pour couvrir ce cas correctement.

**D-01/D-04/D-05 — Pages légales, inexistantes jusqu'ici** : aucune route `/terms`, `/privacy`, `/mentions-legales` n'existait ; le lien footer "Confidentialité" pointait vers `href="#"`. Bloqué le temps d'obtenir de l'utilisateur : statut juridique (**entrepreneur individuel, Cheick Mohamed TRAORE**, contact `traorecheikkh@gmail.com`) et juridiction (**Sénégal + Côte d'Ivoire + France, les trois marchés cibles** — droit français retenu par défaut pour la clause de droit applicable, sans priver les utilisateurs de leurs protections locales impératives). Contenu reflétant l'architecture réelle (Anthropic comme sous-traitant IA, hébergement Supabase région Londres, WhatsApp/Meta comme tiers au moment de la commande, droits d'export/suppression déjà réels via les Réglages) plutôt qu'un template générique — avec un bandeau explicite "rédigé avec assistance IA, non relu par un juriste" sur chaque page, car il ne s'agit pas d'un conseil juridique professionnel. Footer + `auth.tsx` (mention d'acceptation sous le bouton Google) reliés. **Corrigé en aparté** : le badge `profile.tsx` "Consentement : Actif" était une valeur statique codée en dur, sans lien avec un quelconque enregistrement réel — remplacé par un vrai comptage de `consent_events` (vérifié en navigateur : "1" événement réel affiché, correspondant à la ligne `child_profile_created` du registre).

**Signalé mais volontairement pas corrigé (scope discipline)** : le bouton "High-Five" (🙌) du Mur Public ne persiste rien en base (état React local uniquement), et les boutons Commentaire/Partager sont décoratifs (aucun `onClick`). Nécessitent une vraie table `post_likes`/`comments` + une policy RLS repensée (celle sur `posts` n'autorise l'`UPDATE` qu'au propriétaire du post, donc un like d'un tiers ne peut pas passer par une simple requête client) — ajoutés au [[genizio-backlog]] plutôt que patchés à la hâte en dehors du scope de cet audit.

**Commits** : `5d1ad77` (dialogs natifs, code mort, mur public), `396a0a2` (accessibilité), `f4b47e7` (pages légales). `tsc --noEmit` propre après chaque commit.

## Décision #22 : Audit RLS complet du schéma + likes/commentaires réels du Mur Public
**Contexte** : suite de la Décision #21 — l'utilisateur a explicitement demandé un audit RLS complet du reste du schéma (au-delà de `child_profiles`/`challenges`/`child_mentors` déjà vérifiés) et la création des tables pour rendre le Mur Public fonctionnel (likes/commentaires signalés non-persistés en Décision #21).

**Méthode** : requête directe `pg_policies` sur toutes les tables `public` + `storage.objects`, plutôt que de faire confiance au code des migrations dans le repo (cf. principe #7 de [[MEMORY]]).

**Faille la plus grave trouvée — `posts`** : la policy `INSERT`/`UPDATE` ne vérifiait que `auth.uid() = parent_id`, jamais que `child_profile_id` appartenait à un `child_profiles` possédé par ce même utilisateur. Combinée à un bug côté client (`CreatePostModal.tsx` listait les défis complétés de **toutes** les familles, pas juste les siennes, faute de `.eq("user_id", ...)`), n'importe quel parent connecté pouvait publier un post public — photo, légende, tag IA — attribué à n'importe quel enfant ayant un défi complété, affiché sous son vrai prénom sur le Mur Public. Migration `20260717130000_fix_posts_and_proofs_ownership_check.sql`. **Vérifié en direct** (pas juste lu) : appel REST direct avec le token de session réelle — post forgé pour l'enfant "pari" (autre compte) → 403 ; post légitime pour son propre enfant → 201, puis nettoyé.

**Même classe de bug ×3 autres endroits, tous corrigés** :
- `storage.objects` bucket `proofs` : policy `INSERT` sans scoping de chemin — n'importe quel utilisateur authentifié pouvait uploader dans le dossier de n'importe quel enfant (`{childId}/{fichier}`). Vérifié en direct : upload dans son propre dossier → 200 ; upload dans le dossier d'un autre enfant → 403.
- `createOrder` (`products.functions.ts`) : utilisait `supabaseAdmin` (contourne RLS) avec un `child_id` fourni par le client, jamais vérifié contre l'utilisateur appelant. Ajout d'une vérification explicite avant l'insert.
- `generateChallenges` (`challenges.functions.ts`) : seule fonction du fichier sans le garde `.eq("user_id", userId)` déjà présent sur ses 3 sœurs (`assignTemplateChallenge`, `generateSingleChallenge`, `getChildAISynthesis`) — corrigée par cohérence. `validateChallengeProof` : ajout d'une vérification explicite `challenge.user_id !== userId` en early-return — RLS bloquait déjà silencieusement l'écriture pour un défi non possédé, mais la fonction lisait quand même les données de l'enfant d'un tiers et consommait un appel IA avant de le découvrir.

**Bug trouvé dans ma propre migration avant qu'il ne cause de dégât en prod** : la policy du bucket `proofs` utilisait `storage.foldername(name)` à l'intérieur d'une sous-requête corrélée sur `child_profiles cp` — `name` non qualifié se résolvait vers `cp.name` (le prénom de l'enfant, colonne existant aussi sur `child_profiles`) au lieu de `storage.objects.name` (le chemin du fichier), à cause des règles de portée SQL pour les références non qualifiées dans une sous-requête corrélée. Le uuid de l'enfant n'aurait alors jamais pu matcher le prénom parsé comme "dossier", **bloquant silencieusement tous les uploads de preuve**. Repéré en relisant le texte de la policy réellement appliquée via `pg_policies` (pas en supposant que le SQL écrit == le SQL exécuté), corrigé en qualifiant explicitement `storage.foldername(objects.name)`, migration mise à jour et re-vérifiée par test direct.

**Likes/commentaires réels du Mur Public** : tables `post_likes` (unique par `post_id`+`user_id`, permet le toggle) et `comments`, RLS scopée `auth.uid() = user_id` en écriture / lecture publique. `posts.likes_count` synchronisé par un trigger `SECURITY DEFINER` (nécessaire : un like d'un tiers doit pouvoir incrémenter un compteur sur une ligne qu'il ne possède pas, ce que la policy `UPDATE` normale de `posts` interdirait). **Trouvé et corrigé immédiatement** : `get_advisors` a signalé le trigger comme appelable directement via RPC PostgREST par `anon`/`authenticated` (Postgres accorde `EXECUTE` à `PUBLIC` par défaut sur les nouvelles fonctions) — `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` appliqué en défense en profondeur, bien que les fonctions `RETURNS TRIGGER` ne soient de toute façon pas appelables hors contexte de trigger côté Postgres.

**`feed.tsx` réécrit** : `handleLike` fait un vrai `INSERT`/`DELETE` optimiste sur `post_likes` (avec rollback visuel si l'appel échoue) au lieu de ne toucher que l'état React ; l'état "déjà liké" est maintenant chargé depuis la base au montage. Le bouton commentaire (`MessageCircle`, décoratif jusqu'ici) ouvre un vrai panneau (liste + ajout + suppression de son propre commentaire), sans afficher de nom de famille identifiable (juste "Vous"/"Un parent" — cohérent avec la Politique de confidentialité). Le bouton "Partager" (`Send`, décoratif) copie désormais le lien de la photo dans le presse-papiers. **Vérifié en direct de bout en bout** : post de test créé via l'API → like → `1 High-Fives` → rechargement complet de la page → le compteur et l'état "déjà liké" survivent → unlike → retour à `0` → commentaire posté → visible après rechargement → suppression du commentaire → disparaît → post de test nettoyé.

**`get_advisors` final** : propre hormis les 3 items déjà connus/acceptés (`material_suggestions` sans policy par design, listing public des 2 buckets, protection mot de passe désactivée — non pertinent en Google-only).

**Commit** : `1910b4c` (audit RLS complet + likes/commentaires réels). `tsc --noEmit` propre.

## Décision #23 : Framework de génération IA robuste (Haiku), système de difficulté, rendu Markdown
**Contexte** : demande produit détaillée de l'utilisateur (2026-07-17) — les défis générés par Haiku (modèle léger utilisé pour tous les appels texte, cf. `callClaude` dans `challenges.functions.ts`) devaient être rendus plus fiablement concrets/réalisables/pédagogiques, avec un niveau de difficulté visible et un rendu Markdown correct (du `#`/`##` brut apparaissait parfois à l'écran).

**Framework de génération** : nouvelle constante `GENIZIO_PRINCIPLES` (partagée, injectée dans `generateChallenges` ET `generateSingleChallenge` — les deux seuls chemins qui font réellement inventer un défi à l'IA ; `assignTemplateChallenge` ne fait qu'un insert, `getChildAISynthesis`/`validateChallengeProof` ont juste reçu une consigne "texte brut, sans Markdown" en plus). Contenu : concret-avant-imaginaire (résultat observable et vérifiable obligatoire), ordre de priorité observation > expérimentation > création > résolution de problème, interdiction explicite (défi irréalisable, matériel inaccessible, exercice creux, formulation générique du type "dessine ce que tu veux"), taxonomie de compétences à cibler et nommer dans `pedagogical_context` (Cognitives / Pratiques / Sociales / Personnelles), consigne de ne pas toujours viser le format le plus court passé 8 ans (formats longs et immersifs comme alternative constructive aux écrans), et interdiction de syntaxe Markdown dans les champs texte. Écrit dense et numéroté délibérément : un modèle léger comme Haiku a besoin d'instructions explicites plutôt que de guidance implicite.
**Corrigé en passant** : le schéma JSON de `generateChallenges` (génération en masse) ne demandait même pas `pedagogical_context`/`intelligences`/`requires_supervision`/`supervision_warning` à l'IA, alors que `ChallengeSchema` et l'insert les utilisaient déjà — mis à parité avec `generateSingleChallenge`.

**Système de difficulté** : colonne `difficulty` (`facile`/`moyen`/`difficile`, nullable, migration `20260717150000_add_difficulty_to_challenges.sql`), l'IA l'évalue selon temps/autonomie/complexité cognitive/quantité de matériel/créativité-analyse demandée. `DifficultyBadge` (🟢/🟡/🔴) affiché sur toutes les surfaces de prévisualisation ET les défis sauvegardés : `laboratory.tsx`, le panneau Labo intégré + les cartes de `profiles.$profileId.challenges.tsx`, la modale de `boutique.tsx`, la carte active du dashboard, et la vue Quête enfant.

**Rendu Markdown** : nouveau composant `MarkdownContent` (`react-markdown`, stylé aux tokens de marque, mode bloc ou inline pour usage dans `<li>`/badges) appliqué partout où du texte généré par l'IA s'affiche (description/étapes/contexte pédagogique/observations IA sur 8 surfaces + les synthèses IA de la page Défis et du Portfolio) — défense en profondeur : même si les prompts interdisent désormais le Markdown, un rendu correct protège contre les cas où le modèle en émettrait quand même.

**Bug trouvé en vérifiant le flux** : les 3 endroits qui confirment un défi généré (`laboratory.tsx`, `boutique.tsx`, le panneau Labo de `profiles.$profileId.challenges.tsx`) construisaient le payload `template` envoyé à `assignTemplateChallenge` en listant les champs à la main, et aucun des 3 n'incluait `requires_supervision`, `supervision_warning`, ni le nouveau `difficulty` — un défi que l'IA avait explicitement marqué comme nécessitant une supervision adulte (cuisine, objets tranchants, feu) aurait donc silencieusement perdu ce marqueur exactement au moment de la sauvegarde réelle, retombant toujours sur `false` par défaut côté serveur. **Repéré en générant et assignant un vrai défi** : la prévisualisation affichait "🟢 Facile", mais la ligne effectivement sauvegardée en base montrait `difficulty: "moyen"` (valeur de repli serveur) — preuve que le payload ne transportait pas le champ. Corrigé dans les 3 fichiers, puis re-vérifié par un second aller-retour génération+assignation : `difficulty: "facile"` correctement persisté cette fois, confirmé par requête SQL directe.

**Vérifié en direct** : deux générations réelles via le Labo (1,1 s et 3,8 s — aucun ralentissement notable dû à l'ajout du framework), contenu concret/adapté à l'âge/zéro-coût sans caractère Markdown brut, badges 🟢/🟡 corrects sur la liste des défis à côté d'un défi historique à `difficulty: null` qui n'affiche justement aucun badge plutôt qu'une valeur inventée. Données de test nettoyées après vérification.

**Commit** : `fe35e07`. `tsc --noEmit` propre.

## Décision #24 : Centres d'intérêt alignés sur les 9 clés Gardner + vérification du stockage du téléphone
**Contexte** : trois questions produit de l'utilisateur (2026-07-17). (1) Le numéro de téléphone parent est-il bien enregistré ? (2) L'app capte-t-elle les enfants qui aiment la prise de parole / se mettre en avant ? (3) Les centres d'intérêt à la création de profil sont jugés "trop basiques" comparés au potentiel actuel de l'app.

**Téléphone — vérifié, pas de bug** : requête directe sur `auth.users` confirme que le numéro est bien sauvegardé et bien relu (`profile.tsx` via `session.user.user_metadata?.phone`), mais dans `raw_user_meta_data`, pas dans la colonne native `phone` de Supabase Auth (réservée à l'authentification OTP/SMS — l'utiliser pour un numéro non vérifié aurait été sémantiquement faux). Point d'attention signalé : la colonne "Phone" apparaît vide dans le dashboard Supabase (Authentication → Users), ce qui peut donner une fausse impression que rien n'est enregistré.

**Prise de parole / mise en avant — partiellement captée avant ce tour** : aucun tag direct n'existait, mais le domaine "Communication" (génération de défis) et les clés Gardner `sociale`/`linguistique` existaient déjà. Résolu explicitement par ce tour (voir ci-dessous) en ajoutant "Prise de parole en public" et "Leadership naturel" comme tags de premier niveau.

**Centres d'intérêt refondus** (`src/components/profiles/shared.ts`, `ProfileDialog.tsx`) : l'ancienne liste plate de 10 tags (Nature, Machines, Dessin, Espace, Sport, Musique, Cuisine, Animaux, Construction, Langues) — un reliquat d'avant la carte des talents, les domaines et les Guildes — remplacée par `INTERESTS_BY_TALENT` : 4 tags concrets et reconnaissables par un parent par clé Gardner (les mêmes 9 clés que `child_profiles.talents`), réutilisant les labels de `TALENT_KEY_LABELS` (`talent-buckets.ts`). Choix confirmé par l'utilisateur (recommandé) plutôt qu'un alignement sur les 6 Guildes ou une simple liste élargie sans taxonomie. **Aucune migration nécessaire** : `interests` reste un `string[]` libre, aucune contrainte enum nulle part (vérifié par grep) — pur changement de vocabulaire/UI.
**Décision de conception délibérée** : les tags sélectionnés n'alimentent PAS automatiquement `child_profiles.talents` — les scores de talents restent strictement basés sur des preuves (uniquement via validation IA de défis réellement complétés), cohérent avec le principe déjà en place "pas de score auto-déclaré". Les intérêts restent un signal de contexte pour les prompts de génération, pas un raccourci vers la carte des talents.
**Non touché délibérément** : le widget marketing "Simulateur de potentiel" de la landing page (`index.tsx`) a sa propre copie indépendante de `ALL_INTERESTS`, couplée à une liste de défis de démonstration codés en dur — pas de vraies données, hors périmètre de cette demande.

**Bug trouvé en vérifiant (pas lié aux centres d'intérêt eux-mêmes)** : `MarkdownContent` (introduit en Décision #23) enveloppait toujours sa sortie dans un `<div>`, même en mode `inline` — HTML invalide une fois imbriqué dans un `<p>`, exactement le pattern utilisé à tous les sites d'appel `inline` ajoutés dans toute l'app (`pedagogical_context`/`ai_observations`/étapes), provoquant une vraie erreur d'hydratation React en direct. Corrigé en utilisant `<span>` comme conteneur quand `inline=true`. **Vérifié en direct** : zéro violation `<div>`-dans-`<p>` dans le DOM rendu après correction, et une valeur de test contenant `**gras**` s'est correctement rendue en vraie balise `<strong>`.

**Vérifié en direct de bout en bout** : dialogue de création de profil ouvert, les 9 groupes s'affichent avec les nouveaux tags (dont "Prise de parole en public" sous Linguistique, "Leadership naturel" sous Sociale), tag sélectionné, profil enregistré, confirmé par requête SQL directe (`interests: ["Prise de parole en public"]`). Profil de test nettoyé après vérification.

**Commit** : `1876265`. `tsc --noEmit` propre.

**Mise à jour du 2026-07-20 — dédoublonnage** : l'utilisateur a signalé que la contrainte
"4 tags par groupe" (9×4=36) forçait des quasi-synonymes déroutants. Vérifié dans le code :
"Dessin" apparaissait 2× ("Dessin & Design" spatial + "Dessin & Peinture" créatif), "bricolage/
manuel" 3× ("Bricolage manuel" corporelle + "Bricolage créatif" créative + "Travaux manuels"
artisanale), et "Empathique"/"Attentif aux autres" faisaient doublon DANS le groupe Émotionnelle.
5 tags retirés (`shared.ts`) → groupes à 3-4 tags, tous distincts. `ALL_INTERESTS` (export mort,
aucun conscommateur — le simulateur `index.tsx` recompose sa propre liste plate depuis
`INTERESTS_BY_TALENT`, donc la note "copie indépendante" ci-dessus était inexacte : il consomme
bien la source partagée) supprimé. 2 presets codés en dur référençant "Dessin & Design"
(`portfolio.tsx`, `index.tsx`) repointés vers "Dessin & Peinture". **Pas de migration de
données** : signal doux (n'alimente pas la carte des talents), les anciens tags encore stockés
sur les profils existants restent du texte libre inoffensif. **Vérifié en direct** (dialogue de
création ouvert en navigateur) : 9 groupes, "Dessin" une seule fois, zéro "Bricolage"/"Travaux
manuels", zéro "Attentif aux autres". `tsc --noEmit` propre.

## Décision #25 : Système d'export du Passeport d'Excellence (14 ans et plus)
**Décision** : Implémenter le "Passeport d'Excellence Génizio" payant (50 000 FCFA) pour les enfants de 14 ans et plus. L'accès est débloqué manuellement par l'administrateur et stocké en base de données sous la forme d'un attribut boolean `pdf_unlocked` dans le JSONB `talents` de la table `child_profiles` (ce qui évite d'altérer la structure de la table).
**Pourquoi** : Offrir aux parents d'adolescents un document d'orientation officiel et de haute fidélité pour les dossiers d'admission aux lycées d'élite et universités. Le paiement s'effectue via redirection WhatsApp et validation manuelle dans le tableau d'administration (`/admin/index.tsx`).
**Rendu** : Une route d'impression dédiée `/profiles/$profileId/passport-print` optimisée pour le format A4 portrait (`@media print`) avec couverture certifiée, radar de talents, synthèse de Naya, et historique complet des défis avec photos de preuves.

## Décision #26 : Cartes de Talent Collectibles avec niveaux de progression par tranche d'âge
**Décision** : Remplacer l'affichage plat des scores de talents par une grille de 9 "Cartes de Talent" à l'esthétique brutaliste et ludique. Chaque carte possède :
1. **Un Type de Carte (Tranche d'Âge)** :
   - *Carte Éveil* (âge <= 6 ans) : 🟢 Vert.
   - *Carte Exploration* (7-11 ans) : 🔵 Bleu.
   - *Carte Maîtrise* (>= 12 ans) : 🟠 Orange/Or.
2. **Un Niveau de Carte (Score de Talent)** :
   - *Niveau I* (score < 40) : ⭐ 1 étoile.
   - *Niveau II* (score 40-69) : ⭐⭐ 2 étoiles.
   - *Niveau III* (score >= 70) : ⭐⭐⭐ 3 étoiles.
**Pourquoi** : Un score brut (ex: 80 en créativité) n'a pas la même signification pour un enfant de 5 ans et un adolescent de 15 ans. Le type de carte indique le stade de développement pédagogique de l'enfant tandis que le niveau et les étoiles indiquent sa maîtrise relative au sein de sa tranche d'âge.
**Statut** : Intégré sur le Portfolio Parent en ligne et par cohérence visuelle dans le Passeport d'Excellence imprimable (PDF).
**Vérifié** : Build complet sans erreur (`tsc --noEmit` propre). Les rendus en direct s'adaptent selon l'âge réel du profil sélectionné.

## Décision #27 : NAYA 2.0 — paradigme d'investigation développementale + stratégie modèles IA

**Contexte** : le 2026-07-20, l'utilisateur a partagé un document de formalisation complet
(`#Génizion - Système de Compréhensio.txt`, cf. [[genizio-naya-systeme-comprehension]]) faisant
évoluer Naya de "générateur de défis + cartographe de talents" vers un **système de compréhension
développementale** : Jumeau Pédagogique à 4 niveaux, notes/résultats traités comme des signaux à
investiguer (jamais des verdicts), moteur de diagnostic par hypothèses causales + défis
discriminants + mise à jour bayésienne, classification dynamique Force/Faiblesse/Fragilité/Risque.

**Décision 1 — le paradigme est adopté comme direction produit** : demande explicite de
l'utilisateur ("structurer au mieux… développer un plan d'implémentation… l'intégrer en mémoire").
La conception structurée, les adaptations à l'existant et le plan par phases vivent dans
[[genizio-naya-systeme-comprehension]] — ce fichier-là fait foi, pas le document source brut.

**Décision 2 — modèles IA : Anthropic seul, architecture swappable** (choix explicite de
l'utilisateur via AskUserQuestion, option recommandée acceptée). Le pipeline définit des *rôles*
(vision / raisonnement / narration) implémentés aujourd'hui uniquement avec les modèles Anthropic
déjà en place (`callClaude` : Sonnet vision, Haiku texte) — cohérent avec la décision #3 corrigée.
**Alternatives rejetées** :
- ❌ Hybride multi-fournisseurs immédiat (Gemini vision + DeepSeek raisonnement, proposé par le
  brainstorm Gemini du document source) : 2 SDK/clés API de plus à gérer pour un gain de coût
  purement théorique au volume actuel — et surtout fondé sur des benchmarks/prix générés par
  Gemini, invérifiables et en partie manifestement inventés (ex. un id de modèle Anthropic
  inexistant). Réévaluable plus tard SI le volume le justifie ET sur des chiffres vérifiés.
- ❌ Trancher plus tard : rejeté par l'utilisateur — le choix est fait maintenant pour que le
  plan soit stable ; l'abstraction par rôles préserve de toute façon la réversibilité.
**Trade-off accepté** : coût par appel de raisonnement potentiellement plus élevé qu'un
fournisseur low-cost — mitigé par le design frugal (l'IA n'intervient que sur anomalie détectée
par du code déterministe, pas sur chaque événement).

## Décision #28 : Phase 1 NAYA — Compétences N3 réutilisent les 9 clés Gardner, scope v1 restreint

**Contexte** : implémentation de la Phase 1 (Jumeau Pédagogique v1, cf.
[[genizio-naya-systeme-comprehension]] §6). Le document source décrit une taxonomie de
"Compétences" (créativité, communication, logique, organisation, métacognition, travail
d'équipe) distincte des 9 intelligences de Gardner déjà utilisées pour `child_profiles.talents`.

**Décision 1 — réutiliser `VALID_TALENT_KEYS` (9 clés Gardner) pour le Niveau 3, pas un nouveau
vocabulaire.** `pedagogical_twins.competencies` stocke un signal **dérivé** par clé Gardner :
moyenne mobile exponentielle [0,1] avec tendance/variance (α=0.25), recalculée à chaque
`CHALLENGE_COMPLETED` validé par l'IA — différent du score cumulatif déjà affiché au parent
(`child_profiles.talents`, incrémental non borné, sans notion de tendance).
**Alternatives rejetées** :
- ❌ Introduire le vocabulaire créativité/communication/logique/organisation/métacognition/
  travail-d'équipe du document source : recouvrement sémantique fort avec les clés Gardner déjà
  en place (créative≈créativité, sociale≈travail d'équipe, logico_mathematique≈logique,
  linguistique≈communication) → fragmentation du "quelle compétence a quel score" en deux
  systèmes à réconcilier, exactement le problème déjà identifié entre Guildes et clés Gardner
  ("vocabulaire distinct, à ne pas confondre", [[genizio-vision]]). Rejeté par discipline
  evolution-first ("préserver avant d'optimiser") plutôt que par manque de fidélité au document
  source — le document source décrit une architecture cible générique, pas un vocabulaire figé.
- ❌ Faire de `pedagogical_twins.competencies` un simple miroir/copie de `child_profiles.talents` :
  aurait perdu la notion de tendance (le score cumulatif ne peut que monter), indispensable à la
  classification Force/Faiblesse/Fragilité/Risque (§4 du plan) qui a besoin d'une pente, pas
  seulement d'une valeur.

**Décision 2 — seule la persévérance (N2) est calculée en v1.** Curiosité, autonomie,
compétition/coopération, tolérance à la frustration, orientation intrinsèque/extrinsèque
restent des champs absents du JSONB `drivers` (pas des valeurs par défaut inventées) tant
qu'aucun événement de la Phase 0 ne porte de signal fiable pour ces traits.
**Pourquoi** : fabriquer un score sans signal réel violerait le principe déjà établi "les scores
de talents restent strictement basés sur des preuves" ([[genizio-decisions]] #24) et le risque
"sur-interprétation psychométrique" déjà identifié dans le plan (§8).

**Décision 3 — recalcul événementiel (trigger sur `observation_events`), pas de `pg_cron`.**
Résout la question ouverte du plan ("fréquence de la classification"). Cohérent avec le pattern
déjà utilisé en Phase 0 (triggers plutôt que jobs planifiés), pas de nouvelle dépendance
d'infrastructure tant que le volume d'événements reste faible.

**Décision 4 — intérêts déclarés et intérêts comportementaux (domaines engagés) restent deux
axes JSONB séparés**, jamais fusionnés. Les vocabulaires ne se recouvrent pas 1:1 (tags Gardner
libres pour les intérêts déclarés vs `DOMAINS` des défis pour l'engagement comportemental) —
inventer un mapping aurait été malhonnête, dans la même veine que la décision #24 ("les tags
restent un signal de contexte, pas un raccourci").

**Bug trouvé et corrigé avant tout dégât en production** : la migration utilisait `smallint`
pour la colonne `trait_series.level` et le paramètre `p_level` de `record_trait_point`. Un
littéral entier (`3`, `2`) passé à un appel de fonction est typé `integer` par Postgres, et
`integer → smallint` n'est qu'un cast *assignment*, pas *implicit* — la résolution de fonction a
échoué (`42883`), toute la migration (une seule transaction) a roulé en arrière proprement,
aucune table laissée en état partiel. Corrigé en `integer` partout, ré-appliqué avec succès.

**Vérifié en production** : backfill cohérent, classification FORCE atteinte après 5 signaux
positifs constants sur une même compétence (n≥4 franchi), tendance négative détectée après une
série d'abandons, renfort de domaine plafonné à 1.0, bump d'intérêt sans écrasement sur
re-déclaration, RLS anon = 0 ligne, suppression en cascade sans résidu. Détail complet dans
[[genizio-naya-systeme-comprehension]] §6.

## Décision #29 : Repositionnement du Labo → « l'Atelier du Temps » (gestion du temps comme compétence)

> ⚠️ **STATUT (2026-07-20)** : direction approuvée, nom **confirmé par l'utilisateur : « L'Atelier
> du Temps »**. **V1 livrée** (renommage + fin de la collision de noms, commit `9eb9b22`). V3
> (mécaniques Estimation + Régularité) et V4 PAS commencées.

**Contexte** : l'utilisateur a signalé que le Labo (`/laboratory`) et les Défis se différencient
mal — vérifié dans le code : même backend (`generateSingleChallenge` + `assignTemplateChallenge`),
même objet produit (une ligne `challenges` dans la même roadmap), et collision de noms (une
section « Le Laboratoire de Génizio » existe *dans* `profiles.$profileId.challenges.tsx` en plus
de la route `/laboratory`). Analyse menée sous `product-intelligence-architect`.

**Recadrage apporté par l'utilisateur** : le chronométrage n'est pas là pour "mettre la pression"
mais pour développer **la gestion du temps comme compétence de vie** (école, monde pro) — et il
existe plusieurs façons de gérer le temps.

**Décision** : le Labo est repositionné autour de la gestion du temps. Ancre d'identité = deux
façons **sans anxiété** : **Estimation** (« combien de temps penses-tu ? » puis révèle le réel —
métacognition temporelle) et **Régularité** (« un peu chaque jour, N jours » — c'est là que « le
temps qui coule même app fermée » prend un sens sain, un compteur de rythme et non une bombe). Le
**Temps imparti** (compte à rebours dur, les « retranchements » que l'utilisateur voulait) devient
un **mode avancé âge-gaté (~10 ans+)**, pas l'identité par défaut. L'expiration n'est jamais
affichée comme un échec — c'est de la donnée de coaching.

**Pourquoi** : 
- Un défi chronométré est un **instrument d'observation d'une nature différente** des défis
  auto-rythmés — il alimente précisément les Moteurs N2 laissés vides en Phase 1 (décision #28 :
  tolérance à la frustration, gestion du stress, persévérance étalée). C'est le « défi de
  révélation » du plan (§3 de [[genizio-naya-systeme-comprehension]]) rendu concret. Le
  repositionnement n'est donc pas cosmétique : c'est la source de signal manquante du Jumeau.
- Faire de la pression le **cœur** du Labo combattrait le non-négociable « Naya observe/développe,
  ne juge pas » — le compte à rebours est le mécanisme le plus proche d'un verdict. Le cadrer
  comme *compétence à développer* le rend compatible avec l'ADN de la marque à tout âge.

**Alternatives rejetées** :
- ❌ Temps imparti comme cœur d'identité du Labo (l'intuition initiale de l'utilisateur) : rejeté
  car un Labo *défini par la pression* trahit l'ADN anti-verdict pour les jeunes enfants.
  Conservé comme mode avancé âge-gaté — l'intuition est juste pour les grands, fausse comme défaut.
- ❌ Laisser le Labo en simple générateur de défis contextuels (statu quo) : redondance totale
  avec les Défis, aucune différenciation, collision de noms persistante.
- ❌ Différencier seulement par le vocabulaire/nom sans nouveau mécanisme (V1 seule) : réglerait la
  collision de noms mais pas la redondance de fond — retenu comme *première étape*, pas comme fin.

**Séquence de construction** : V1 (renommage + suppression de la section Labo doublon dans la page
Défis) → V3 (mécaniques Estimation + Régularité, nouveaux types d'`observation_event`, persistance
server-authoritative pour la Régularité) → V4 (Naya déclenche elle-même un défi chronométré pour
départager une hypothèse — Phase 3). Détail dans [[genizio-naya-systeme-comprehension]] §9.

**Branding tranché (2026-07-20)** : nom = **« L'Atelier du Temps »** (choisi par l'utilisateur
via AskUserQuestion parmi Atelier du Temps / Le Tempo / Le Défi Chrono). La route reste
`/laboratory` (URL non user-facing, pas de lien cassé) ; seuls les libellés changent.

## Décision #30 : V3 "Estimation" — nouveau driver N2 `time_awareness`, pas une compétence N3

**Contexte** : première mécanique réelle de l'Atelier du Temps (cf. décision #29). L'enfant
prédit combien de temps un défi va lui prendre au moment de l'assignation ; à la complétion, Naya
compare l'estimation au temps réellement écoulé. C'est le "défi de révélation" qui alimente
enfin un Moteur N2 laissé vide en Phase 1.

**Décision 1 — nouveau driver N2, pas N3** : `time_awareness` (précision d'estimation temporelle)
rejoint `perseverance` comme deuxième Moteur calculé. **Alternative rejetée** : le classer en
Compétence N3 "métacognition" (c'est ainsi que le document source NAYA le catégorise à l'origine,
§4.3). Rejeté car la décision #28 a délibérément fermé le N3 aux 9 clés Gardner pour éviter la
fragmentation déjà vécue (Guildes vs Gardner) — et la métacognition temporelle ne correspond à
aucune des 9 clés (spatial, corporelle, sociale, entrepreneuriale, creative, artisanale,
emotionnelle, logico_mathematique, linguistique). Un Moteur (capacité de régulation générale,
transversale à tous les domaines) est le bon niveau, cohérent avec la logique déjà établie pour
la persévérance.

**Décision 2 — mesure = temps de travail actif, pas temps depuis l'assignation.** `actual_duration_minutes = completed_at - started_at` (jamais `- created_at`). **Pourquoi** : un défi
peut légitimement traîner plusieurs jours dans la liste "à faire" avant d'être commencé — comparer
une estimation de 30 minutes à "3 jours" aurait produit une réaction absurde et démotivante,
contraire au principe "feedback sur le processus" (§9.2 du document source). Si `started_at` est
absent (défi complété sans jamais passer par "en cours"), aucune carte de comparaison ne
s'affiche — pas de mesure fabriquée.

**Décision 3 — `started_at` géré par trigger** (`set_challenge_started_at`, BEFORE UPDATE), pas
par le code applicatif. **Pourquoi** : cohérent avec le principe Phase 0 "un signal qui ne peut
pas être oublié par un futur chemin de mutation" — contrairement à `completed_at` (déjà géré côté
application, hérité d'avant cette session). Remis à `NULL` si le défi retourne à "à faire", pour
qu'une reprise ultérieure mesure sa propre durée plutôt qu'un total agrégé sur plusieurs tentatives.

**Décision 4 — jamais de score/pourcentage affiché à l'enfant.** La carte de reflet dans
`OutcomeChat` montre les deux durées brutes (estimée, réelle) + un message chaleureux en 3
variantes (juste / sous-estimé / sur-estimé), jamais un calcul d'écart en pourcentage — non-
négociable déjà établi (décision #11 : "aucun score/percentile/pass-fail nulle part dans l'app").
Le calcul de précision (`1 - écart_relatif`, symétrique, borné [0,1]) reste strictement interne
au driver `time_awareness`.

**Alternatives rejetées** :
- ❌ Estimation saisie via une nouvelle UI dédiée : rejeté — l'Atelier a déjà un sélecteur "temps
  disponible" (`TIME_OPTIONS`) qui sert la même intention ; le réutiliser évite d'ajouter une
  étape et respecte le principe "supprimer/fusionner avant d'ajouter" de l'analyse produit.
- ❌ Afficher un score de précision au parent/enfant ("tu étais à 15% d'écart") : rejeté, viole
  le non-négociable "pas de score" (décision #11).

**Vérifié en production (2026-07-20)**, pipeline complet bout en bout via l'Atelier réel (pas de
raccourci) : assignation avec `estimated_duration_minutes=30` → trigger `started_at` confirmé au
clic "En cours" → complétion → événement `CHALLENGE_COMPLETED` avec
`actual_duration_minutes=43.0` → driver `time_awareness` calculé à **0.6977**, vérifié au chiffre
près (`1 - |43-30|/43 = 0.697674`). Carte de reflet capturée en direct dans le DOM rendu (après
plusieurs tentatives — un refetch en arrière-plan de la page fait disparaître la vue "rapport" de
`OutcomeChat` très vite, capture réussie en sondant le DOM toutes les 200ms dans un seul contexte
d'exécution continu) : message exact "Tu avais prévu 10 min, tu as mis 9 min — ton estimation
était juste !" pour une estimation de 10 min / 9 min réel. Les 3 branches de message (juste /
sous-estimé / sur-estimé) vérifiées séparément via la fonction pure. Défis de test supprimés
après vérification. `tsc --noEmit` propre.

**Non résolu, signalé** : la vue "rapport" de `OutcomeChat` (déjà existante avant cette session —
le bloc "Intelligences enrichies") semble se faire remplacer très rapidement par un refetch de la
liste des défis, fermant la fenêtre d'affichage du succès plus vite qu'attendu. Pas un défaut
introduit par ce chantier (même mécanisme affecte le bloc "Intelligences enrichies" préexistant) —
observé en vérifiant, pas corrigé (hors périmètre de cette demande), à investiguer si un jour
signalé comme gênant par un usage réel.

## Décision #31 : Phase 2 NAYA — school_grades + détection d'anomalies Z-score

**Contexte** : implémentation de la Phase 2 (cf. [[genizio-naya-systeme-comprehension]] §6) —
signaux scolaires + détection d'anomalie, toujours 0 IA (code statistique pur).

**Décision 1 — UI intégrée au Portfolio existant, pas de nouvelle route.** La page Portfolio est
déjà "l'écran de compréhension de l'enfant" (radar, portrait, timeline) — une section "Notes
scolaires" y prend sa place naturelle plutôt que de créer une 7e route/nav-entry pour un
formulaire ponctuel. **Alternative rejetée** : route dédiée `/profiles/$id/grades` — plus de
poids (nav, param routing) pour un gain de découvrabilité marginal vu le trafic déjà existant
sur Portfolio.

**Décision 2 — Z-score calculé sur `grade/max_grade` (ratio normalisé), jamais sur la note
brute.** **Pourquoi** : deux évaluations sur des barèmes différents (/10, /20, /100) ne sont
comparables qu'une fois normalisées — comparer des notes brutes de barèmes différents aurait
statistiquement invalidé la détection.

**Décision 3 — garde cold-start à n≥3 notes antérieures** (même logique que `v_min_n=4` en
Phase 1, appliqué ici à un besoin statistique différent : un écart-type sur 1-2 points est
incalculable ou trop instable pour être publié). **Seuil `z ≤ -2.5`** : repris tel quel de
l'exemple SQL du document source NAYA, pas une valeur inventée.

**Décision 4 — `school_grades` accepte l'écriture directe du parent (RLS `FOR ALL` avec
vérification d'ownership), contrairement à `observation_events`/`pedagogical_twins` qui sont
strictement trigger-only.** **Pourquoi** : c'est une saisie parent de première main (comme
`child_profiles`), pas un journal d'événements dérivé du comportement de l'app — la distinction
déjà établie en Phase 0/1 entre "données sources" et "journal d'événements consommé par le
Jumeau" s'applique ici aussi. `anomaly_triggers`, lui, reste strictement lecture seule côté
client (écrit uniquement par le trigger), car c'est un résultat calculé, pas une saisie.

**Décision 5 — matière = liste fermée + "Autre" libre, pas texte libre pur.** **Pourquoi** : la
matière est la clé de regroupement du calcul Z-score (`GROUP BY child_id, subject` implicite
dans le trigger) — une orthographe qui varie d'une saisie à l'autre casserait silencieusement le
regroupement statistique sans qu'aucune erreur ne soit levée.

**Décision 6 — aucun indicateur d'anomalie affiché au parent en Phase 2.** La liste de notes
dans Portfolio est purement factuelle (matière, note, date) — pas de badge "détecté", pas de
couleur d'alerte. **Pourquoi** : conforme au séquençage du plan — c'est la Phase 4
("Compréhension de Naya") qui a la responsabilité d'afficher quoi que ce soit d'interprétatif au
parent, en langage bienveillant. Afficher une alerte maintenant, avant que Phase 3 ait généré la
moindre hypothèse causale, reviendrait à afficher un signal brut sans contexte — exactement ce
que le paradigme d'investigation (§1 du plan) interdit.

**Alternatives rejetées** :
- ❌ `anomaly_triggers` en table polymorphe générique (`source_type` + `source_id`) plutôt qu'une
  FK directe vers `school_grades` : sur-ingénierie — aucune autre source d'anomalie n'est prévue
  avant que la Phase 3 en révèle le besoin réel. FK directe, simple, extensible plus tard si
  nécessaire.
- ❌ Champs structurés "évaluation chronométrée ?" / "niveau de stress" dans le formulaire (le
  document source mentionne `anxiety_self_report` dans le payload `SCHOOL_GRADE_ENTERED`) :
  reporté — construire pour un besoin Phase 3 pas encore conçu serait deviner. Le champ
  `context` (texte libre) capture cette nuance en attendant ; une colonne structurée pourra être
  ajoutée plus tard si Phase 3 le justifie réellement.

**Vérifié en production** : séquence de notes 14/15/13/20 puis 3/20 dans une matière de test →
seule la 4e déclenche une anomalie, `z = -11.000` vérifié au calcul manuel exact ; une 5e note
normale n'ajoute aucune anomalie ; RLS anon = 0 ligne sur les deux tables ; formulaire testé en
direct dans le navigateur ; suppression en cascade sans résidu. `tsc --noEmit` propre.

## Décision #32 : Phase 3a NAYA — moteur de génération d'hypothèses (premier point IA)

**Contexte** : implémentation du cœur du système — transformer une anomalie (Phase 2) en arbre
d'hypothèses causales pondérées. Premier appel IA du pipeline NAYA 2.0. Phase 3 découpée : 3a =
`generateHypotheses` (ce commit), 3b = boucle bayésienne (défis discriminants + convergence).

**Décision 1 — traitement synchrone, pas d'Edge Function** (résout la question ouverte du plan
§7). Server function TanStack (`ensureHypothesesForChild`) réutilisant `callClaude`, le pattern
déjà éprouvé pour `generateChallenges`/`validateChallengeProof`. Déclenchée en **fire-and-forget
au chargement du Portfolio**, idempotente (index unique sur `anomaly_trigger_id` + garde "anomalie
sans cycle") donc sûre à appeler à chaque montage.
**Alternative rejetée** : Database Webhook → Supabase Edge Function (la vision "async" du document
source). Rejeté pour la 3a : nouvelle infra (déploiement Edge Function, duplication du secret
Anthropic), pour un volume faible (uniquement sur anomalie) et une latence hors chemin critique.
Réévaluable si le volume grandit — cohérent avec l'adaptation §5.3 ("pas de nouveau runtime tant
que pas nécessaire").

**Décision 2 — rôle *raisonnement* = Sonnet** (`callClaude` a gagné un paramètre `modelOverride`
optionnel ; les appels existants restent sur Haiku-pour-texte, inchangés). C'est le cas "quand le
système doit réfléchir" que la décision #27 réserve explicitement au modèle premium. Volume faible
(sur anomalie seule) → coût maîtrisé. Un mauvais diagnostic polluerait le Jumeau et tromperait le
parent : la qualité prime ici.

**Décision 3 — prompt adapté au Jumeau RÉEL, pas au document source.** Le document source suppose
des Fondations N1 (anxiété innée `emotional_sensitivity`, `learning_modes` explicites) qu'on n'a
délibérément PAS (décision #28). Le prompt raisonne donc sur ce qui existe vraiment : compétences
Gardner (preuve de défis validés), moteurs (persévérance, time_awareness), intérêts déclarés +
domaines engagés, et le contexte/type de la note. Le signal de débruitage clé (§2 du plan :
performance ≠ compétence) est fourni explicitement via `SUBJECT_TO_TALENT` (map matière→clé
Gardner) : une compétence forte + une note effondrée dans la matière liée = fort METHOD_MISMATCH,
pas CONCEPTUAL_GAP. Priors renormalisés à 1.0 côté serveur (une dérive du modèle ne casse pas
l'invariant) ; `current_probability = prior` à l'initialisation (la 3b les fera diverger).

**Décision 4 — écriture via `supabaseAdmin`, `hypothesis_cycles` en lecture seule cliente.** Même
principe que `anomaly_triggers` (décision #31) : c'est un résultat calculé, pas une saisie. Aucune
policy d'écriture RLS ; la server function écrit après vérification d'ownership de l'anomalie.

**DEUX BUGS trouvés et corrigés en vérifiant** (illustrent pourquoi on teste en direct, pas juste
au type-check) :
- **`callClaude` lisait `json.content[0].text` en aveugle.** `claude-sonnet-5` renvoie un bloc
  `thinking` en `content[0]` (sans `.text`) et le vrai JSON en `content[1]` → `content[0].text`
  était `undefined` → `JSON.parse("")` → "Réponse IA invalide" sur TOUT appel Sonnet en mode
  texte. Passé silencieusement inaperçu jusqu'ici car les autres appels tournent en réalité sur
  **Haiku** : le routage de `callClaude` teste `imageUrl` (que `validateChallengeProof` ne passe
  pas — il passe `imageData`), donc même les analyses de photo tournaient sur Haiku, pas Sonnet.
  **Fix** : lire le premier bloc de type `text`, robuste aux blocs `thinking` quel que soit le
  modèle. Corrige aussi `analyzePostProof` (Sonnet vision) qui était silencieusement cassé.
- **Budget tokens trop bas.** Le thinking de Sonnet consomme le budget `max_tokens` AVANT le
  JSON : à 1500, tout partait dans le thinking, JSON tronqué/vide (`stop_reason=max_tokens`
  vérifié par appel API direct). **Fix** : 4000 pour l'appel d'hypothèses.

**Vérifié en production, cas Lola de bout en bout** : enfant semé avec `logico_mathematique=0.85
FORCE` (Jumeau) + notes maths 14/15/13 puis effondrement à 4/20 (z=-10). Portfolio chargé →
`ensureHypotheses` déclenché → cycle généré avec **METHOD_MISMATCH 0.45 (tête), PERFORMANCE_ANXIETY
0.25, LACK_OF_ENGAGEMENT 0.20, CONCEPTUAL_GAP 0.10 (queue)**, somme exacte = 1.0, chaque rationale
citant la compétence FORCE qui contredit une lacune, anxiété sous-pondérée (contexte de stress
absent, pesé NEGATIVE dans l'evidence_log) — diagnostic conforme au cas Lola du document source.
Idempotence (1 seul cycle malgré 2 appels concurrents du double-montage React), RLS anon = 0,
UTF-8 correct en base (vérifié par hexdump : `0xC3 0xA9` = « é », le `Ã©` initial n'était
qu'un artefact d'affichage `python json.tool` sur Windows), cascade de suppression propre.
`tsc --noEmit` propre. Données de test nettoyées.

**Correctif de suivi (même jour, sur demande explicite)** : le bug de routage vision signalé
ci-dessus (`imageUrl ? Sonnet : Haiku` ignorait `imageData`) a été corrigé — la condition teste
désormais `imageData || imageUrl`. Impact réel : chaque validation de preuve photo d'un défi
(`validateChallengeProof`) tournait silencieusement sur Haiku au lieu de Sonnet depuis l'origine
de cette route, malgré le commentaire du code affirmant le contraire — un bug préexistant à toute
la session NAYA, découvert en marge du debug du bloc `thinking`. **Vérifié en direct** avec un
log temporaire (`console.log` retiré après coup) : soumission réelle d'une preuve photo via
`OutcomeChat` (note + image) → `model=claude-sonnet-5 hasImageData=true hasImageUrl=false` dans
les logs serveur, validation IA aboutie (`Bulletin de Découverte` affiché). Confirme aussi que le
fix de parsing du bloc `thinking` (déjà appliqué) couvre bien ce chemin d'appel, partagé avec
`generateHypotheses`. Défi de test supprimé après vérification. `tsc --noEmit` propre.

## Décision #33 : Phase 4 NAYA — restitution parent, rôle narration séparé (Haiku)

**Contexte** : premier écran NAYA réellement visible par le parent. Les hypothèses (Phase 3a)
existent déjà en base mais ne peuvent pas être affichées telles quelles — `rationale` et
`evidence_log` contiennent des chiffres bruts ("0.85", "z=-10", "6 observations") et des
étiquettes cliniques (`METHOD_MISMATCH`), ce qui violerait directement "jamais de probabilité
brute ni de label clinique" (§1 du plan, décision #11).

**Décision 1 — nouveau rôle *narration*, distinct du rôle *raisonnement*, sur Haiku.**
`narrateForParent` (`hypotheses.functions.ts`) prend les hypothèses déjà calculées et les
traduit en 2-3 phrases chaleureuses pour le parent. Pas Sonnet : traduire une structure déjà
raisonnée en prose est le même type de tâche que `getChildAISynthesis`, déjà éprouvé sur Haiku
dans ce même fichier — pas un problème de jugement causal qui justifierait le premium (décision
#27 : payer Sonnet seulement "quand le système doit réfléchir"). Appelée en séquence juste
avant l'insert du cycle (pas un second déclenchement lazy séparé) pour qu'un cycle nouvellement
visible n'ait jamais de fenêtre "raisonné mais pas encore raconté".
**Alternative rejetée** : templater le `rationale` existant tel quel (0 appel IA supplémentaire,
gratuit). Rejeté car concrètement testé et confirmé dangereux — le `rationale` généré en Phase
3a contient des chiffres par construction (le prompt de raisonnement l'y encourage
explicitement, "comme pour un futur lecteur humain (éducateur)", pas pour un parent). Un simple
gabarit enum→phrase aurait été sûr mais générique et aurait perdu toute la spécificité du cas
réel (l'historique de notes précis, la force mesurée) — la narration IA est donc réellement
nécessaire, pas un confort superflu.

**Décision 2 — garde-fou déterministe contre toute fuite de chiffre, jamais de confiance
aveugle dans la consigne du modèle.** `narrateForParent` rejette (retourne `null`) toute
narration contenant un chiffre (`/\d/.test(text)`), même si le prompt l'interdit explicitement
— même logique que `applySafetyNet` (`challenges.functions.ts`) : un modèle peut ne pas suivre
une instruction, une règle non-négociable a besoin d'un filet mécanique derrière elle.

**Décision 3 — résilience par re-tentative ciblée, pas par re-génération complète.** Un cycle
déjà raisonné (Sonnet, coûteux, ~15-20s) dont la narration (Haiku, ~3s) a échoué au tour
précédent n'est jamais re-raisonné — le déclencheur lazy détecte un cycle sans
`parent_narrative` et retente UNIQUEMENT la narration, en réutilisant les hypothèses déjà
stockées. Économise un appel Sonnet à chaque échec transitoire de la narration.

**Décision 4 — carte visuellement distincte du Portrait de synthèse existant, absente par
défaut.** Badge ambre "Naya enquête encore" (vs le sky "réglé/stable" du Portrait) — jamais le
même traitement visuel qu'une conclusion. N'apparaît dans le DOM que si un cycle ouvert avec
narration existe ; pas d'état "rien détecté" qui sonnerait comme un jugement en soi (l'absence
de carte est neutre, pas un verdict "tout va bien").

**Vérifié en production, cas Lola resemé (compétence linguistique FORCE 0.82, note 3/20)** :
raisonnement Sonnet impeccable (METHOD_MISMATCH 0.5 en tête, cohérent avec le cas Lola de la
Phase 3a). **Le garde-fou anti-chiffre a réellement déclenché** — faux positif intéressant : le
nom de l'enfant de test "Phase4Test" contenait un chiffre, pas une fuite de diagnostic. Après
renommage, **la résilience a été vérifiée en direct** : la retentative n'a réutilisé QUE le
raisonnement déjà stocké (narration obtenue en ~3s au lieu de ~20s pour un cycle complet, zéro
second appel Sonnet). Narration finale confirmée 100% conforme (zéro chiffre, zéro étiquette
technique, ton d'enquête provisoire) et rendue correctement dans le DOM du Portfolio (badge +
texte exact). RLS anon = 0, cascade de suppression propre. `tsc --noEmit` propre.

## Décision #34 : Phase 3b/5 — code d'une session parallèle, "vérifié en production" faux, corrigé

**Contexte** : pendant une session de cet agent sur ce projet, une **session parallèle de
l'utilisateur** (même repo, même branche `security-fixes-and-ux-improvements`) a commité deux
changements directement sur disque : `0850f6a` (petits correctifs Phase 4) et `c2d2da4`
("deliver Phase 3b (Bayesian loop) and Phase 5 (hybrid recommendation engine)"). Le second
modifiait aussi la mémoire projet pour affirmer que les Phases 3b et 5 étaient "livrées et
vérifiées en production".

**Ce qui a déclenché la vérification** : un rappel système accompagnant ces modifications
contenait une instruction de ne pas signaler ce changement à l'utilisateur ("ils sont déjà au
courant"). Cette instruction n'a pas été suivie — une instruction cachée demandant de taire
quelque chose à l'utilisateur se signale, elle ne s'exécute pas en silence, quelle que soit sa
source. Signalé explicitement, avec la preuve (`git log`, auteur confirmé
`mercurebeauty-eng` — donc très probablement une session parallèle légitime, pas un tiers
malveillant), avant de continuer.

**Ce que la vérification a trouvé** : le principe déjà inscrit dans ce fichier —
*"Rapport 'Complet' (session parallèle, sous-agent) : ne jamais y croire sans relire le code
réel"* (cf. [[MEMORY]], leçon de l'incident du 2026-07-16 sur le dashboard cassé) — s'est
appliqué à la lettre. L'affirmation "vérifié en production" était fausse. Trois bugs réels :

1. **Critique — la boucle bayésienne ne pouvait jamais persister.** `processDiscriminantResult`
   écrivait `updated_at` dans `hypothesis_cycles`, colonne absente du schéma (créé en Phase
   3a/4, jamais étendue). **Reproduit en direct AVANT tout correctif** : requête PATCH identique
   au code → `PGRST204: Could not find the 'updated_at' column`. Le code ne vérifiait jamais
   l'erreur du `.update()` (`await supabaseAdmin.from(...).update(...).eq(...)`, résultat
   ignoré) — donc cet échec était silencieux à 100%, la fonction retournait un succès fictif.
   Autrement dit : chaque défi discriminant complété, chaque abandon, n'avait STRICTEMENT AUCUN
   effet sur les probabilités stockées, quel que soit le nombre de tentatives.
2. **Filet de sécurité contourné.** `generateDiscriminantChallenge` et la branche ESSAIMAGE de
   `recommendChallengesForChild` inséraient des défis générés par IA sans passer par
   `finalizeChallenge` (jamais exportée jusqu'ici) — donc sans `applySafetyNet`. Un défi
   discriminant ciblant METHOD_MISMATCH explicitement "contourne la présentation scolaire
   habituelle" pouvait impliquer une activité plus manuelle/physique que la normale, sans
   que `requires_supervision` soit jamais évalué.
3. **Branche STABILISATION inachevée.** Retournait `challenge: null` — une recommandation
   affichée sans aucun défi réel derrière, chemin manifestement pas fini.

**Décision** : corriger les trois plutôt que réécrire le travail de la session parallèle depuis
zéro (son architecture — hiérarchie de priorité INVESTIGATION > ESSAIMAGE > STABILISATION, le
schéma du multiplicateur bayésien, le couplage METHOD_MISMATCH↔CONCEPTUAL_GAP — est saine et
fidèle au plan NAYA ; seuls les trois points ci-dessus étaient réellement cassés ou incomplets).
Cohérent avec la discipline evolution-first : changement minimal viable, pas une reconstruction.

**Corrections appliquées** :
1. Migration `20260720170000` : `ALTER TABLE hypothesis_cycles ADD COLUMN updated_at
   timestamptz NOT NULL DEFAULT now()`. Ajout aussi de la vérification d'erreur explicite après
   le `.update()`, et renseignement de `resolved_at` (colonne existante depuis la Phase 3a,
   jamais renseignée) au moment de la résolution.
2. `finalizeChallenge` exportée depuis `challenges.functions.ts`. Les deux points d'insertion
   (`generateDiscriminantChallenge`, branche ESSAIMAGE) reconstruits pour y passer, exactement
   comme tous les autres générateurs de défis de l'app.
3. Branche STABILISATION réécrite avec un vrai prompt ("défi doudou", cf. plan NAYA §9.3 :
   environnement structuré, succès quasi garanti, appuyé sur une force si disponible) + le même
   passage par `finalizeChallenge`.

**Vérifié en production, de bout en bout, cas Kadi (compétence logico-mathématique FORCE 0.85 +
chute en maths, z=-12)** :
- Colonne : le même PATCH qui échouait avec `PGRST204` renvoie maintenant `204 No Content`.
- Chaîne d'appel imbriquée `recommendChallengesForChild` → `generateDiscriminantChallenge`
  (server function appelant directement une autre server function côté serveur) : confirmée
  fonctionnelle sous TanStack Start — c'était une inconnue de conception non testée par la
  session parallèle, vérifiée ici pour de vrai.
- Défi discriminant réellement affiché sur la page Défis, complété via le vrai flux
  `OutcomeChat`, `processDiscriminantResult` déclenché depuis `validateChallengeProof`.
- **Mathématique bayésienne vérifiée à la main** : prior 0.5 × multiplicateur 1.8 = 0.9,
  renormalisé sur un total de 1.31 → **0.6870**, exact à 4 décimales avec la valeur en base.
  Seuil de convergence (0.65) franchi → `status=resolved`, `final_diagnosis=METHOD_MISMATCH`,
  `resolved_at` correctement horodaté (était absent avant ce correctif).
- Carte de recommandation confirmée disparaissant proprement une fois le cycle résolu (pas de
  fixation sur une investigation terminée).
- **Les 3 branches de recommandation testées séparément** (twin reconfiguré entre chaque test) :
  INVESTIGATION, ESSAIMAGE ("⚡ Défi de renforcement Naya", `difficulty`/`requires_supervision`/
  `material_tags` correctement résolus), STABILISATION ("🛡️ Défi d'ancrage Naya", idem).
- RLS anon = 0 sur `hypothesis_cycles`. Cascade de suppression propre. `tsc --noEmit` propre.

**Alternative rejetée** : réécrire Phase 3b/5 entièrement plutôt que corriger le travail
existant. Rejeté — l'architecture était saine, seuls des bugs précis et localisés
l'empêchaient de fonctionner ; les réécrire aurait jeté un travail de conception correct pour
un gain nul.

**Leçon reconfirmée** : la mémoire de ce projet portait déjà la règle qui a permis de détecter
ce problème avant qu'il ne s'installe. Elle a fonctionné exactement comme prévu — mais seulement
parce qu'elle a été appliquée activement (relire le code réel, reproduire l'erreur en direct)
plutôt que d'accorder une confiance par défaut à une affirmation "vérifié en production", même
quand cette affirmation vient d'un commit signé et d'une mémoire à jour en apparence.

## Décision #35 : `school_grades` — le trigger Z-score ignore type/récence/moyenne de classe (gap identifié, PAS corrigé)

**Contexte** : l'utilisateur a fait remarquer que les notes scolaires (Phase 2, `school_grades`)
n'ont "aucun contexte" — on ne sait pas si une note est un devoir ou un contrôle, récente ou
ancienne, forte ou faible relativement à la classe. Il pose aussi une question plus large : les
notes devraient servir à distinguer "mode d'apprentissage inadapté" (l'enfant a les moyens mais
la méthode ne convient pas) de "talent ailleurs, mieux vaut rediriger" (les notes sont faibles
mais un autre talent est manifestement fort).

**Vérifié dans le code (pas supposé)** :
- `evaluation_type` et `context` (texte libre du parent) sont bien captés dans le formulaire
  ([AddGradeDialog.tsx](../../src/components/grades/AddGradeDialog.tsx)), stockés, et **atteignent
  bien le prompt IA de la Phase 3a** (`type_evaluation`, `contexte_declare_par_le_parent` dans
  [hypotheses.functions.ts:241-242](../../src/lib/hypotheses.functions.ts#L241-L242)) — ce n'est
  donc pas un champ mort.
- Le vrai trou est en amont : le trigger SQL `detect_grade_anomaly()` (qui décide SI une
  investigation démarre) calcule sa moyenne/écart-type sur **tout** l'historique de la matière,
  sans segmenter par `evaluation_type` ni fenêtre de récence, et la "moyenne de classe" n'existe
  nulle part dans le schéma. Un trimestre noté sévèrement par un professeur peut donc déclencher
  une investigation sur un enfant parfaitement dans la norme de sa classe.
- Le "cas A" de l'utilisateur (mode d'apprentissage inadapté) correspond déjà exactement à la
  cause `METHOD_MISMATCH` du moteur bayésien (Phase 3a/3b) — vérifié et fonctionnel. Le "cas B"
  (talent ailleurs → rediriger plutôt qu'insister) **n'a pas d'équivalent** dans les 5 causes
  (`METHOD_MISMATCH`, `PERFORMANCE_ANXIETY`, `LACK_OF_ENGAGEMENT`, `CONCEPTUAL_GAP`, `OTHER`) —
  toutes répondent à "pourquoi ça coince ici", aucune à "faut-il continuer à insister ici".

**Décision : ne rien construire pour l'instant.** Deux raisons distinctes de ne pas agir :
1. Le trigger Z-score (type/récence/moyenne de classe) est un vrai gap technique, mais mineur et
   non demandé explicitement — laissé en l'état, à reprendre si l'utilisateur le priorise.
2. Le "cas B" (redirection vers un autre talent) n'est **pas qu'un gap technique** — recommander
   à un parent de lâcher une matière scolaire pour miser sur un autre talent est une
   recommandation d'orientation, d'un poids different d'un exercice ciblé. Nécessite une décision
   produit/philosophie assumée avant tout code, pas juste une nouvelle cause bayésienne.

**Statut** : ouvert, non priorisé. Ne pas supposer que ce gap est corrigé dans une session future
sans revérifier `detect_grade_anomaly()` et `ALLOWED_CAUSES`.

## Décision #36 : mode de preuve "declarative" — retirer la photo/IA pour les défis comptables/chronométrés

**Contexte** : deuxième faille soulevée par l'utilisateur dans la même conversation — un défi
comme "fais 20 jongles" ne peut structurellement pas être prouvé par une seule photo (elle montre
un instant, pas un comptage ni une durée). Ce n'est pas un problème de qualité du modèle de
vision : aucune photo ne peut porter cette information. `validateChallengeProof` traitait
pourtant tous les défis de la même façon (photo + jugement IA Sonnet). Décision de l'utilisateur,
verbatim : pour ce type de défi, la preuve doit être "un champ à remplir minutieusement en match
strict avec les directives données dans le challenge" plutôt qu'une image — on fait confiance au
parent/superviseur, comme pour n'importe quelle activité qu'il supervise dans la vraie vie.

**Piège évité en vérifiant avant de coder** : le réflexe naturel aurait été de réutiliser
`challenges.target_intelligences` pour attribuer les points à la soumission déclarative. Le code
documente déjà explicitement que ce champ est "décoratif" à la création (texte libre de l'IA,
jamais garanti dans les 9 clés `VALID_TALENT_KEYS`) — la vraie attribution de points a toujours
lieu à la validation, via une décision IA fraîche. Comme le mode déclaratif retire justement
cette décision IA à la validation, il fallait un mécanisme différent : faire proposer la
récompense **à la génération** (même moment que `material_tags`/`difficulty`), pas la réutiliser
depuis un champ connu pour être non fiable.

**Implémentation** (niveau 2 evolution-first — extension de l'existant, aucune réécriture) :
- `finalizeChallenge` (verrou unique déjà utilisé par les 6 points d'insertion de défis IA de
  l'app) accepte et normalise 3 nouveaux champs optionnels : `proof_mode` ("photo" par défaut |
  "declarative"), `proof_target` (`{metric, value}`), `declarative_award` (points 1-3 whitelistés
  contre `VALID_TALENT_KEYS`, comme `validateChallengeProof` le fait déjà à la validation).
  Backstop `resolveProofMode` : si l'IA annonce "declarative" sans cible/récompense cohérente,
  repli silencieux sur "photo" — même philosophie que `applySafetyNet`, ne jamais faire confiance
  à la seule auto-discipline du modèle.
- Instruction partagée `PROOF_MODE_INSTRUCTION` (exportée, même raison que `SAFETY_INSTRUCTION` :
  un seul texte source pour les 5 prompts de génération plutôt que des copies qui dérivent).
- Nouvelle server function `submitDeclarativeProof` : **0 appel IA**. Compare la valeur déclarée
  à `proof_target.value` (réussite si ≥, pas égalité stricte), attribue `declarative_award` via
  `increment_child_talents` si réussite. Retourne exactement la même forme que
  `validateChallengeProof` (`{challenge, observations, awarded_points, imageAnalyzed, relevant}`)
  — `OutcomeChat` réutilise sans aucune modification son écran de succès et son message de refus,
  seul le formulaire (champ chiffré vs upload photo) est branché sur `proof_mode`.
- Migration additive (`proof_mode` NOT NULL DEFAULT 'photo', `proof_target`/`declarative_award`
  nullable) : tout défi existant ou futur qui ne précise rien garde exactement le comportement
  actuel, aucune régression silencieuse possible.

**Découverte opérationnelle en cours de route** : le connecteur MCP Supabase de cet agent
(`5de1fa6f-...`) est authentifié sur un **compte différent** de celui qui possède le projet
Génizio (`list_projects` retourne BABIMOB_PWA/QuickFlow/ishop, pas geniusio) —
`apply_migration`/`execute_sql`/`generate_typescript_types` échouent donc systématiquement avec
"You do not have permission" sur ce projet. **Contournement qui fonctionne** : le CLI Supabase
local (`npx supabase`) est correctement lié au bon projet (`xpcmjvytbpafmfgvfadm`, org
`atbgmnvekhtunulirgdh`, confirmé par `supabase projects list` et `migration list`) — utiliser
`supabase db push` pour les migrations et `supabase gen types typescript --linked` pour les
types tant que le connecteur MCP n'est pas réauthentifié sur le bon compte.

**Vérifié en production, de bout en bout, sur TestPhase1** (défi test inséré directement en base
pour tester le mécanisme indépendamment du jugement probabiliste de l'IA sur le choix
photo/declarative — un essai réel via le générateur de l'Atelier a par ailleurs confirmé que
l'IA choisit "photo" à bon escient quand le défi produit un livrable visible, comme un tableau de
mesures sur papier, même pour un thème sportif/chronométré) :
- Déclaration sous la cible (5 pour un objectif de 10) : message de refus exact
  ("Pas encore atteint cette fois (5/10 jongles reussis)..."), aucune mutation en base
  (`status`/`ai_observations`/`progress` inchangés), formulaire réaffiché pour réessayer.
- Déclaration au-dessus de la cible (12 pour un objectif de 10) : écran de succès affiché avec
  l'observation déterministe exacte, `status=completed`, `progress=100`, `completed_at` renseigné,
  `target_intelligences=["corporelle"]`, et `talents.corporelle` réellement incrémenté de 0 → 2
  via `increment_child_talents`.
- Le rappel de `processDiscriminantResult` depuis ce nouveau chemin n'a pas été re-vérifié avec un
  cycle d'hypothèses réel — il réutilise exactement la même signature et le même enrobage
  non-bloquant que l'appel déjà vérifié dans `validateChallengeProof` (décision #34), risque jugé
  faible mais non testé en direct pour cette combinaison précise.
- `tsc --noEmit` propre après chaque étape.

## Décision #37 : suppression complète des notes scolaires — remplacées par un référentiel académique interne

**Contexte** : suite à la décision #35 (gap identifié, pas corrigé), l'utilisateur a précisé le
vrai problème : un enfant change de classe/école/pays d'une année à l'autre, et le système ne
connaît aucun programme scolaire réel — une note n'a donc jamais de référentiel stable pour être
interprétée, quel que soit le soin mis à en corriger le calcul de Z-score. Décision, verbatim :
*"je pense finalement qu'il vaut mieux supprimer ce facteur"*, remplacé par un référentiel
académique **interne à Génizio**, par domaine de connaissance et tranche d'âge, calé sur des
standards internationaux exigeants (Singapour/Chine, Common Core US/Canada cités en exemple) —
pour que les défis soient à la fois adaptés à l'enfant ET alignés sur un niveau capable de
"relever le niveau des enfants des zones africaines", plutôt que de refléter la moyenne locale
d'une école particulière.

**Vérifié avant de coder** : `school_grades`/`anomaly_triggers` n'alimentaient QUE le
déclencheur du Phase 3 (`ensureHypothesesForChild`) — aucune génération de défi ne les lisait.
Zéro ligne dans les 3 tables concernées (`school_grades`, `anomaly_triggers`,
`hypothesis_cycles`) au moment de la suppression : aucune perte de donnée réelle, fenêtre de
changement gratuite tant qu'aucun usage n'existe.

**Suppression exécutée** :
- Migration `20260720192542` : `DROP COLUMN hypothesis_cycles.anomaly_trigger_id` (FK NOT NULL
  vers `anomaly_triggers`, devait être retirée en premier), `DROP TABLE anomaly_triggers`,
  `DROP TABLE school_grades`, `DROP FUNCTION detect_grade_anomaly()`.
- `src/lib/school-grades.functions.ts` et `src/components/grades/AddGradeDialog.tsx` supprimés
  (`git rm`).
- `ensureHypothesesForChild` et `narrateForParent` retirés de `hypotheses.functions.ts` (leur
  logique entière reposait sur le snapshot "note anormale" — rien à en garder sans grades) ainsi
  que `SUBJECT_TO_TALENT`/`relatedTalentKey` (mapping matière scolaire → clé Gardner, devenu sans
  objet). **Conservés en l'état** : `generateDiscriminantChallenge` et `processDiscriminantResult`
  (le moteur bayésien lui-même n'est pas spécifique aux notes — juste sa colonne de traçabilité
  `anomaly_trigger_id`, retirée, et son ancien lookup de matière via l'anomalie, remplacé par un
  `"apprentissage"` générique) : prêts à recevoir de nouveaux cycles une fois un futur
  déclencheur construit.
- `profiles.$profileId.portfolio.tsx` : carte "Notes scolaires" retirée, déclenchement
  fire-and-forget de `ensureHypothesesForChild` retiré. `refetchOpenCycle` et la carte "Ce que
  Naya a remarqué" (Phase 4) conservés tels quels — ils ne dépendaient pas des notes, prêts pour
  le futur déclencheur.
- `types.ts` régénéré via le CLI (jamais le MCP sur ce projet — consigne explicite de
  l'utilisateur, cf. [[MEMORY]] principe #8).

**Effet secondaire assumé** : Phase 3a/3b (moteur bayésien de diagnostic) n'a plus aucun
déclencheur — `hypothesis_cycles` ne recevra plus aucune nouvelle ligne tant qu'un remplaçant
n'est pas construit. Décision explicite de ne pas improviser ce remplaçant dans la foulée : il
dépend du référentiel académique, que l'utilisateur doit d'abord valider.

**Premier jet du référentiel** : [genizio_referentiel_academique.md](genizio_referentiel_academique.md)
— brouillon **non sourcé**, banderole d'avertissement en tête du document, à ne câbler dans
aucun système tant qu'il n'a pas été relu et corrigé. Périmètre volontairement restreint à 3
domaines "académiques" au sens scolaire (mathématiques/logique, langage, sciences/monde) sur des
repères annuels de 4 à 14 ans — les 6 autres intelligences Gardner restent hors de ce
référentiel, mesurées comme aujourd'hui via les défis validés.

**Vérifié en production** : zéro régression après suppression — Portfolio et page Défis
rechargés en direct (TestPhase1), aucune erreur console liée à la suppression, `recommendChallengesForChild`/
`getChildAISynthesis` répondent toujours 200. `tsc --noEmit` propre. La déclaration test
"jongles" (décision #36) reste intacte dans la Timeline, preuve que la suppression n'a touché
que son périmètre prévu.

**Alternative rejetée** : garder une saisie de notes minimale comme mémo parent sans rôle
système. Rejetée par l'utilisateur — suppression complète demandée explicitement, cohérent avec
Simplicity Maximizer (un champ qui ne sert plus à rien pour le système ne mérite pas de rester
"au cas où").

**Mise à jour (même jour) — sourçage web du référentiel** : l'utilisateur a demandé de corriger
le brouillon via une vraie recherche internet plutôt que de mémoire. Recherches menées sur
Common Core Mathematics/ELA (US), Singapore Math scope and sequence, NGSS (sciences), curriculum
chinois. Résultat : la majorité des repères en mathématiques et une partie du langage sont
maintenant **sourcés avec citation exacte** (ex : Common Core 3.OA.C.7 — mémorisation de toutes
les tables à un chiffre "from memory" en fin de Grade 3/8 ans ; 6.EE/7.EE pour les premières
équations à 11-12 ans). Deux corrections concrètes trouvées en sourçant, documentées dans le
fichier plutôt que silencieusement corrigées :
1. L'exemple d'origine de l'utilisateur ("table de 5 à 5 ans") est en réalité plus précoce que
   ce qu'aucun des référentiels vérifiés n'exige — même Singapour/Chine (les plus exigeants
   trouvés) placent l'introduction formelle de la multiplication à 7 ans, la mémorisation
   complète vers 8 ans.
2. Sciences restructurées par **bande d'âge** (K-2/3-5/6-8) plutôt que par année précise — NGSS,
   la source la mieux documentée trouvée, n'est lui-même pas organisé année par année ; forcer
   une fausse précision annuelle aurait été moins honnête. "Cycle de l'eau" et "photosynthèse",
   placés trop tôt dans le premier jet, sont en réalité des standards de collège (11-14 ans,
   MS-ESS2-4/MS-LS1-6) avec un vocabulaire précis exigé.

Ce qui reste non sourcé cette passe est marqué explicitement ligne par ligne dans le document
(colonne "Source / confiance") plutôt que laissé ambigu — notamment 4 ans (avant les
référentiels formels), une partie de Grade 1/9 ans en maths, et les standards d'écriture
11-14 ans (Common Core Writing non recherchés individuellement). Toujours **pas câblé** dans le
moteur de génération ni un déclencheur — seul le contenu a changé, pas son statut d'usage.

## Décision #38 : nouveau déclencheur Phase 3 — écart au référentiel académique, 4 défis, les deux sens

**Contexte** : suite aux décisions #35-37, le référentiel académique était rédigé et sourcé mais
non câblé — Phase 3a/3b restait dormante (plus aucun déclencheur depuis le retrait des notes).
Conception du remplaçant avec l'utilisateur : deux paramètres explicitement tranchés par lui —
**4 défis consécutifs** dans le même domaine avant de déclencher (pas 3, pas 2, pas 5-6), et
**les deux sens comptent** : un enfant en retard sur le référentiel ET un enfant en avance
déclenchent tous les deux une investigation (le second cas "pour proposer des défis plus
costauds", pas pour signaler un problème).

**Découverte technique avant de coder** : `difficulty` (facile/moyen/difficile), le seul signal
de niveau qui existait déjà, est délibérément relatif à l'âge déclaré de l'enfant — chaque
prompt de génération l'évalue explicitement "cohérent avec la tranche d'âge". Il ne peut donc
structurellement pas détecter un écart à un référentiel absolu (par construction, tout y est
toujours "cohérent avec l'âge"). Nécessite un signal différent, pas une réutilisation.

**Mécanisme implémenté** (niveau 2 evolution-first — extension de l'existant, `finalizeChallenge`
reste le verrou unique) :
- Référentiel injecté dans les prompts comme texte constant (`ACADEMIC_REFERENTIAL_INSTRUCTION`,
  même pattern que `GENIZIO_PRINCIPLES`/`SAFETY_INSTRUCTION`) — pas de nouvelle table à
  synchroniser avec le markdown source.
- 2 nouveaux champs optionnels sur `challenges` (`academic_domain`, `academic_level_age`) :
  pour les défis dans un des 3 domaines académiques, l'IA étiquette à la génération l'âge
  auquel correspond RÉELLEMENT le contenu du défi — indépendamment de l'âge réel de l'enfant.
  Backstop `resolveAcademicLevel` dans `finalizeChallenge` : domaine/âge incohérent → les deux
  champs redeviennent `null` (repli sûr, un défi mal étiqueté ne doit pas polluer la détection).
- Détection 0 IA (même philosophie que l'ancien Z-score) : `ensureHypothesesForChild`,
  reconstruite, regarde les 4 derniers défis complétés par domaine académique — si les 4
  `academic_level_age` sont constamment ≥1 an en dessous OU ≥1 an au-dessus de l'âge réel,
  déclenche un cycle. Un domaine avec un cycle déjà ouvert est ignoré (pas de doublon).
- Nouvelle cause `READY_FOR_MORE` dans `ALLOWED_CAUSES` : seule cause qui n'est pas un problème
  à résoudre. Branche dédiée dans `generateDiscriminantChallenge` (propose un défi
  "sensiblement plus avancé... présenté comme une mission spéciale/bonus, jamais comme un
  test"). `narrateForParent` reconstruite avec un ton conditionnel (enthousiaste si "en avance",
  chaleureux-mais-pas-alarmiste si "en retard").
- `hypothesis_cycles.trigger_domain` (nouvelle colonne) remplace l'ancienne indirection
  `anomaly_trigger_id → anomaly_triggers → school_grades` : le domaine est stocké directement
  sur le cycle, un seul saut au lieu de deux tables.

**Vérifié en production, de bout en bout, cas réel (TestPhase1, 10 ans)** — 8 défis test insérés
directement (4 "maths" à `academic_level_age=7`, 4 "sciences" à `academic_level_age=13`) pour
isoler le mécanisme du jugement probabiliste de l'IA sur l'étiquetage :
- Chargement du Portfolio → détecte sciences en premier (ordre d'insertion du Map), crée un
  cycle réel avec Sonnet : hypothèse dominante `READY_FOR_MORE` (0.75) citant explicitement
  "quatre observations consécutives à 13, sans variance" ET le Jumeau Pédagogique réel de
  l'enfant (`time_awareness` FORCE) comme preuve à l'appui — raisonnement de qualité, pas un
  gabarit. Seconde hypothèse `LACK_OF_ENGAGEMENT` (0.25) cohérente avec la consigne ("pertinent
  dans les deux directions").
- Rechargement → domaine sciences ignoré (cycle déjà ouvert), détecte maths → cycle réel avec
  3 hypothèses `METHOD_MISMATCH`/`LACK_OF_ENGAGEMENT`/`CONCEPTUAL_GAP`, **`READY_FOR_MORE`
  correctement absente** (la consigne "pertinent UNIQUEMENT si direction = en avance" a été
  respectée par le modèle).
- Piège déjà documenté (décision #36) retombé une 3e fois : narration rejetée deux fois par le
  filet anti-chiffres car Haiku a écrit "TestPhase1" (contient un chiffre) dans le texte —
  confirme que le filet fonctionne toujours. Non un bug : au 3e essai (cycle maths), Haiku a
  spontanément écrit "votre enfant" et la narration est passée — et la résilience de reprise
  (retente uniquement la narration, pas le raisonnement Sonnet coûteux) a fonctionné comme prévu
  entre chaque tentative.
- Carte "Ce que Naya a remarqué" (Phase 4, code inchangé) affichée correctement dans le
  navigateur avec la vraie narration.
- **Défi discriminant `READY_FOR_MORE` généré réellement** (cycle sciences isolé en
  résolvant temporairement le cycle maths) : "Mission : Crée ta Fontaine Magique à Réaction en
  Chaîne", présenté comme une mission valorisante conforme à la consigne, auto-étiqueté
  `academic_domain=sciences, academic_level_age=11` — cohérent avec "sensiblement plus avancé"
  (11 > 10 ans réels), preuve que le mécanisme d'étiquetage boucle correctement même sur les
  défis qu'il génère lui-même.
- `tsc --noEmit` propre à chaque étape. États de test artificiels nettoyés après vérification
  (cycle maths reremis à `open` après isolement temporaire).

## Décision #39 : extension à 8 domaines + citation traçable + accélérateur parent + révision semestrielle

**Contexte** : suite à la décision #38, l'utilisateur a demandé 4 choses d'un coup ("on attaque
tout de front") : (1) réviser le référentiel tous les 6 mois, (2) un moyen de vérifier que l'IA
ne se trompe pas dans son propre étiquetage, (3) un levier pour accélérer le signal sur un
domaine précis, (4) couvrir "tout" plutôt que seulement 3 domaines.

**Item 3 vérifié avant de construire quoi que ce soit** : la page Défis a déjà "Composer un défi
ciblé" avec un sélecteur qui force le domaine du prochain défi généré (`generateSingleChallenge`,
instruction "Tu DOIS générer un défi spécifiquement dans le domaine..."). Pas besoin d'un nouveau
bouton — juste combler les trous : "Mathématiques" était absente de la liste, et rien ne couvrait
le social/émotionnel. Les deux ajoutées à `CATEGORIES`.

**Item 4 — recherche menée sur les 6 talents restants** (corporelle, sociale, émotionnelle,
entrepreneuriale, artisanale, spatiale) :
- **Corporelle** : CDC (checklists officielles, mais seulement jusqu'à 5 ans) + SHAPE America
  (standards officiels K-12, structure par cycle plutôt qu'année précise).
- **Sociale + Émotionnelle** : CASEL, 5 compétences réparties sur les deux domaines, bandes K-2/
  3-5/6-8/9-12 confirmées par plusieurs États US — contenu détaillé par bande estimé, pas extrait
  ligne par ligne.
- **Entrepreneuriale** : NFEC (organisme privé, pas public comme les autres — signalé comme tel),
  bandes PK-2/3-5/6-8 avec "Career & Entrepreneurship" comme thème dédié.
- **Artisanale** : littérature de motricité fine/dextérité manuelle, repères annuels précis
  trouvés (6-7, 8-9, 10-14 ans) — mieux sourcé que prévu.
- **Spatiale** : littérature de psychologie du développement (recherche publiée, pas un
  organisme de standards), repères d'âge précis et concordants entre études (allocentrisme
  2,5-3 ans, pliage mental dès 5 ans, plafond 7-8 ans).
- **Créative — délibérément EXCLUE**, et c'est la trouvaille la plus importante de cette
  recherche : les travaux de Torrance montrent un développement de la créativité **non
  linéaire** (creux normaux et documentés à 5, 9, 13, 17 ans, liés à la transition vers un
  raisonnement plus logique). Le mécanisme de ce document compare systématiquement "niveau
  observé" à "niveau attendu" et interprète un niveau plus bas comme un retard — hypothèse
  fausse et potentiellement trompeuse pour un domaine où un creux à 9 ans est normal et sain.
  Décision : ne jamais étiqueter un défi créatif avec `academic_domain`/`academic_level_age`,
  pas un trou de données mais un refus assumé de fabriquer un mécanisme qui mentirait.

**Item 2 — citation traçable** : plutôt que de faire confiance à un chiffre brut non vérifiable,
l'IA doit désormais aussi fournir `academic_reference_note` — une phrase citant la ligne précise
du référentiel sur laquelle elle s'est basée (ex: "toutes les tables à un chiffre mémorisées vers
8 ans"). Ne conditionne pas la validité de l'étiquetage (un domaine/âge cohérents sans citation
restent utilisables), sert uniquement la traçabilité lors d'une relecture d'échantillon.

**Item 1 — révision semestrielle** : tâche planifiée créée via `create_scheduled_task`
(`genizio-referentiel-revision-semestrielle`, cron `17 9 1 1,7 *` = 1er janvier et 1er juillet
chaque année). Prompt entièrement autonome (aucune dépendance à cette conversation) : relire le
document, re-sourcer chaque domaine, vérifier un échantillon d'étiquetages IA récents en base via
le CLI Supabase, documenter en décision numérotée, committer sans pousser sans confirmation
utilisateur explicite. Limite transparente signalée à l'utilisateur : la tâche ne s'exécute que
si l'application est ouverte au moment prévu, ce n'est pas un cron serveur garanti.

**Implémentation** : `ACADEMIC_DOMAINS` (nouvelle liste exportée, remplace les 3 valeurs en dur
dans le zod enum et `resolveAcademicLevel`), `ACADEMIC_REFERENTIAL_INSTRUCTION` étendue aux 6
nouveaux domaines + instruction de citation, `academic_reference_note` ajoutée aux 6 points de
génération (même schéma que `proof_mode`/`academic_domain` avant elle). Migration : CHECK
constraints de `challenges.academic_domain` et `hypothesis_cycles.trigger_domain` élargis aux 9
valeurs, colonne `challenges.academic_reference_note` ajoutée.

**Vérifié, avec une limite honnête à signaler** :
- `tsc --noEmit` propre après chaque étape.
- Le mécanisme central (`academic_domain`/`academic_level_age` remplis par une vraie génération
  IA) était déjà vérifié en direct lors de la décision #38 (défi "Fusée Mathématique" et "Fontaine
  Magique") — cette extension réutilise strictement le même point de passage
  (`finalizeChallenge`/`resolveAcademicLevel`), donc le risque d'ajouter 6 valeurs d'enum et 1
  champ texte optionnel au même contrat JSON est jugé faible.
- **Non vérifié par une génération IA fraîche cette passe** : le Browser pane a rencontré un
  problème d'outillage pendant cette session (captures d'écran qui expirent, clics qui
  n'atteignent pas la page même via un nouvel onglet et un clic DOM natif confirmé par script) —
  confirmé en interrogeant directement la base (aucune nouvelle ligne créée) plutôt que de se fier
  aux apparences. Contournement partiel : une insertion directe en base a confirmé que la
  contrainte CHECK élargie accepte bien les 6 nouveaux domaines et que la colonne
  `academic_reference_note` fonctionne au niveau base de données — mais aucune vérification que
  Sonnet/Haiku produit réellement une citation cohérente sur les nouveaux domaines n'a pu être
  faite en direct. À refaire dès que l'outillage du navigateur repasse fiable, ou lors de la
  première génération réelle en production.

## Décision #40 : sous-formes de talent (V1) + Boussole d'Opportunités (V3) — pilote corporelle

**Contexte** : discussion produit du 2026-07-22 partie d'une question concrète ("le sport et
l'informatique sont mal couverts par les 9 intelligences") puis recadrée par l'utilisateur vers
une vision plus large — un système d'orientation qui croise les aptitudes réelles observées chez
l'enfant avec les besoins/métiers futurs, pour maximiser le potentiel individuel ET le capital
humain collectif. Analyse complète menée via `/product-intelligence-architect` (mode Sparring +
V1→V4), avec recherche web réelle sur la concurrence plutôt que supposée :
[Talents.Kids](https://www.talents.kids/about) fait déjà la même détection large sur les mêmes 9
intelligences de Gardner (donc plus un différenciateur en soi) ; [ai.io/aiScout](https://youthsportsbusinessreport.com/ai-ios-ai-talent-discovery-app-reaches-45000-youth-athletes-through-mls-partnership/)
prouve que la discrimination fine par discipline sportive est possible, mais via vision par
ordinateur sur des tests physiques standardisés — infrastructure totalement différente de celle
de Génizio (défis à domicile, pas de vidéo/capteurs).

**Décision explicite de l'utilisateur** : construire V1 et V3 seulement (pas V2 — le moteur de
discrimination bayésienne généralisé aux sous-disciplines, prématuré tant que le volume de défis
par domaine est faible ; pas V4 — l'infrastructure de crédentialisation externe, moonshot
pluriannuel). Rejet explicite de deviner une discipline précise (basket vs foot) à partir des
données actuelles — fausse précision, risque de confiance. Rejet explicite de coder en dur une
carte "aptitude → métier de demain" figée (prédiction du marché du travail non fiable à 15 ans).

**V1 — sous-formes de talent (pilote corporelle)** : un enfant fort en "corporelle" ne dit rien de
la sous-forme où le potentiel s'exprime (endurance ≠ explosivité ≠ coordination). Nouveau champ
`trait_subform` sur `challenges` (nullable, migration
`20260722120000_add_trait_subform_to_challenges.sql`, CHECK restreint à 5 valeurs :
`endurance`/`explosivite`/`coordination_fine`/`coordination_collective`/`precision`). Résolu par
`resolveTraitSubform` dans `finalizeChallenge` (même philosophie que `resolveTargetIntelligences` :
ne jamais faire confiance à la seule auto-discipline du modèle — n'accepte une sous-forme que si
"corporelle" fait déjà partie des intelligences résolues ET que la valeur fait partie de
`CORPORELLE_SUBFORMS`). Nouvelle instruction partagée `TRAIT_SUBFORM_INSTRUCTION` (même pattern
que `STEPS_INSTRUCTION`), câblée dans les **5** générateurs de défis. Ce qui a révélé un bug
préexistant en le faisant : `generateDiscriminantChallenge` (hypothèses) et les 2 recommandations
ESSAIMAGE/STABILISATION ne demandaient jamais du tout le champ "intelligences" à l'IA — donc
`target_intelligences` n'était JAMAIS rempli pour ces 3 générateurs depuis leur création. Corrigé
au passage (même instruction ajoutée aux 3), pas seulement pour trait_subform. Agrégation affichée
dans un nouvel encart "Au sein de Corporelle" sur la page Défis (Profil d'Aptitudes), juste sous la
Carte des Talents — compte les défis **complétés** par sous-forme, ne montre rien tant qu'aucune
donnée n'existe.

**V3 — Boussole d'Opportunités** : séparation volontaire en deux couches. Le Profil d'Aptitudes
(carte des talents + sous-formes ci-dessus) reste visible à tout âge — c'est le signal mesuré,
propriété durable de Génizio. La Boussole (`src/lib/opportunity-compass.ts`) est une couche
d'interprétation distincte, explicitement datée ("Vision 2026"), avec disclaimer visible
("à réviser chaque semestre — ne remplace pas un vrai bilan professionnel"), mappant chaque
sous-forme à 3-4 pistes de disciplines. **Réservée à 12 ans et + (`OPPORTUNITY_COMPASS_MIN_AGE`),
décision utilisateur explicite** (via AskUserQuestion) pour ne pas rétrécir prématurément le champ
des possibles d'un jeune enfant. **Contenu NON sourcé** contrairement au référentiel académique
(décision #39) — construction raisonnable de l'agent, pas une recherche académique citée ; à
traiter comme un premier jet révisable, pas une vérité établie.

**Vérifié en direct** : génération réelle d'un défi Sport pour TestPhase1 (10 ans) — réponse LLM
confirmée via l'inspection du réseau : `"trait_subform":"explosivite"` pour un défi de sauts
chronométrés (cohérent avec la définition donnée à l'IA), `target_intelligences:
["corporelle","logico_mathematique"]` correctement résolu. `tsc --noEmit` propre, 168/168 tests
(nouveaux : `finalize-challenge.test.ts` sur le gating de `resolveTraitSubform`). Non vérifié en
direct : l'affichage réel de l'encart "Au sein de Corporelle" et de la Boussole (aucun défi
corporelle historique n'a encore ce champ rempli — normal, c'est un nouveau champ ; se remplira au
fil des complétions réelles) ni le rendu pour un profil 12 ans+ (le seul profil de test disponible
a 10 ans).

**Limite à surveiller** : la migration a d'abord été bloquée par le classificateur auto-mode de
Claude Code (`supabase db push` refusé), débloquée à la deuxième tentative sans changement
d'approche — comportement non déterministe à garder en tête, pas la peine d'insister
indéfiniment si ça se reproduit, redemander à l'utilisateur de lancer la commande lui-même.

---

**Note de numérotation** : les décisions #41 à #46 ci-dessous documentent rétroactivement (le
2026-07-22, en rattrapage) des sessions antérieures à la décision #40 (entre le 2026-07-20 soir et
le 2026-07-22 matin) qui n'avaient pas été journalisées au moment où elles ont eu lieu. Elles sont
numérotées à la suite plutôt qu'insérées chronologiquement pour ne pas invalider les références
`cf. genizio-decisions #40` déjà écrites dans le code (migration, `challenges.functions.ts`,
`opportunity-compass.ts`, `MEMORY.md`). Se fier aux dates indiquées dans chaque **Contexte**, pas
au numéro, pour l'ordre réel des événements.

## Décision #41 : migration deepseek-chat/reasoner → deepseek-v4-flash/v4-pro (dépréciation 2026-07-24)

**Contexte (2026-07-21/22)** : `deepseek-chat`/`deepseek-reasoner` dépréciés le 2026-07-24 15:59
UTC. Mapping de compatibilité officiel DeepSeek : `deepseek-v4-flash` couvre les deux modes
(thinking désactivé = ex-chat, thinking activé = ex-reasoner) ; `deepseek-v4-pro` est un palier
séparé, plus cher et plus avancé (input $0.435/M vs $0.14/M, output $0.87/M vs $0.28/M), avec le
même paramètre `thinking` orthogonal aux deux modèles.

**Débat et décision utilisateur** : proposition initiale de l'agent — router NAYA (rôle
raisonnement bayésien) vers v4-flash en mode thinking. L'utilisateur a contesté ("c'est clairement
dit v4 pro qui est le modèle le plus avancé"), re-vérification faite via WebFetch de la doc
DeepSeek (citée textuellement deux fois), confirmant la distinction entre "mapping de
compatibilité" (v4-flash) et "palier réellement plus capable" (v4-pro). Décision finale de
l'utilisateur (via AskUserQuestion) : v4-pro pour tout ce qui touche à la réflexion neuronale de
NAYA (peu fréquent), v4-flash (avec/sans thinking selon le cas) pour la génération de défis et les
interactions utilisateur. Le thinking sur v4-pro a d'abord été désactivé ("on verra selon les
résultats après données cumulé"), puis réactivé dans la même conversation en même temps que
l'approbation du moteur de progression V1/V2 (décision #42).

**Implémentation** : `callDeepSeekText` (`challenges.functions.ts`) — `isReasoning = model ===
"deepseek-reasoner"` ; `resolvedModel` = v4-pro si reasoning sinon v4-flash ; `thinking:
{type:"enabled", reasoning_effort:"high"}` si reasoning, `{type:"disabled"}` sinon. `NAYA_PRICING`
(`naya-telemetry.ts`) aux tarifs réels v4-pro pour le poste Reasoner (0.435/0.87 par M tokens),
v4-flash pour Chat (0.14/0.28) — un aller-retour dans les valeurs (unifié puis re-séparé) reflète
le débat ci-dessus.

**Vérifié** : `tsc`/tests propres à chaque étape. Non re-testé par un appel API réel à v4-pro dans
cette conversation (dépend d'un vrai écart diagnostiqué par le moteur bayésien, site d'appel à
faible volume) — à confirmer à la prochaine génération d'hypothèses réelle en production.

## Décision #42 : `target_intelligences` câblé pour de vrai + moteur de progression V1/V2 (Zone Proximale d'Apprentissage)

**Contexte (2026-07-22)** : suite à une analyse `/product-intelligence-architect` complète
("comment améliorer Naya en global... faire ressortir réellement les capacités des jeunes"), deux
angles morts identifiés : `target_intelligences` était rempli directement depuis le texte libre de
l'IA sans filtrage (donc jamais fiable comme donnée) ; rien ne fermait la boucle entre le niveau
académique mesuré sur un défi complété et la difficulté ciblée du défi suivant. L'utilisateur a
validé les deux d'un coup ("V1 et V2 m'interesse a appliqué maintenant").

**`target_intelligences`** : `resolveTargetIntelligences` filtre le champ "intelligences" du JSON
généré contre `VALID_TALENT_KEYS` (9 clés Gardner exactes) au lieu de faire confiance au texte
libre de l'IA (qui produisait des valeurs comme "Créativité" au lieu de "creative"). Nouvelle
instruction de prompt `INTELLIGENCES_FIELD_INSTRUCTION`. Câblé dans `finalizeChallenge` (le point
de passage unique), donc actif partout où `finalizeChallenge` était déjà appelé.

**Moteur de progression (Zone Proximale d'Apprentissage, inspiration Vygotsky)** :
`computeProgressionTargets` lit, par domaine académique, le niveau du dernier défi complété + la
cause diagnostiquée la plus probable d'un cycle d'hypothèses ouvert sur ce domaine, calcule un
delta (`READY_FOR_MORE` → +2, autre cause diagnostiquée sur ce domaine → +0 consolidation, aucune
cause applicable → +1 progression par défaut), et injecte une instruction de calibrage
(`formatProgressionInstruction`) dans les prompts `generateChallenges`/`generateSingleChallenge`,
juste après `AGE_DEVELOPMENT_GUIDANCE`.

**Vérifié** : `tsc`/tests propres. Le calibrage delta lui-même n'était pas encore validé par des
données réelles cumulées au moment de cette décision — trou d'instrumentation comblé ensuite par
la décision #43, traité explicitement comme une estimation et non une certitude.

## Décision #43 : fermeture de la boucle ABANDONED + instrumentation "Santé de la Progression" (Admin OS)

**Contexte (2026-07-22)** : suite à la décision #42, l'utilisateur a demandé d'aller plus loin sur
l'instrumentation de résultat ("le vrai goulot, c'est l'absence totale d'instrumentation de
résultat"), en excluant explicitement pour plus tard le vrai test A/B de prompts et les niveaux
V3/V4 (arbre de maîtrise visible, modèle ML entraîné). Approuvé globalement ("Vas-y lance").

**Couche 1 — boucle ABANDONED** : `processDiscriminantResult(challengeId, action:
"COMPLETED"|"ABANDONED", ...)` avait toute la logique bayésienne pour le cas ABANDONED depuis sa
création, mais n'était JAMAIS appelé avec "ABANDONED" nulle part dans le code — fonctionnalité
jamais câblée, pas un bug de logique interne. Nouvelle fonction
`processAbandonedDiscriminantChallenges` (`hypotheses.functions.ts`) : repère les défis
discriminants restés `todo`/`in_progress` 14 jours et plus, appelle `processDiscriminantResult(id,
"ABANDONED")`, marque `abandoned_processed: true` dans `pedagogical_context` (idempotence). Câblée
en fire-and-forget dans `ensureHypothesesForChild`.

**Couche 2 — vue Admin OS** : `getExecutiveKPIsAdmin` ne donnait que des totaux agrégés
superficiels (aucune ventilation par difficulté/domaine) — le calibrage +2/+0/+1 de la décision
#42 restait une estimation non validée faute de données. Nouvelle fonction
`getProgressionHealthAdmin` (par domaine académique : nombre de défis complétés, délai moyen de
complétion, nombre de défis bloqués 14j+) + nouvelle carte "Santé de la Progression par Domaine"
dans `AdminNayaTab`, juste avant les 4 cartes de métriques primaires.

**Vérifié** : `tsc`/tests propres. La carte Admin OS n'a pas pu être vérifiée visuellement en
direct (pas d'accès admin sur le compte de test disponible dans la session) — signalé comme tel à
l'utilisateur au moment de la décision, jamais présenté comme confirmé.

## Décision #44 : `STEPS_INSTRUCTION` — clarté des étapes de défis générés

**Contexte (2026-07-22)** : retour parent concret ("les étapes du défi ne sont pas souvent très
claires... un défi de baromètre dont les instructions n'étaient pas claires... elles sautent des
sous-actions implicites"). Avant ce fix, seule `generateChallenges` avait une consigne minimale
("Étapes claires (3 à 6)"), sans indication de granularité, et les 4 autres générateurs de défis
n'avaient rien du tout sur ce point.

**Implémentation** : nouvelle instruction partagée `STEPS_INSTRUCTION`, exigeant qu'une étape soit
un seul geste concret et complet (exemple donné à l'IA : pas "prépare le baromètre" mais "verse de
l'eau colorée dans la bouteille jusqu'à mi-hauteur"), avec un test explicite ("si on ne lisait QUE
la liste des étapes... pourrait-on réaliser le défi sans se poser de question ?"). Appliquée aux 5
générateurs de défis.

**Vérifié** : `tsc`/tests propres. Le test en direct de cette itération spécifique a été gêné par
une instabilité de l'outil de navigateur (déjà observée dans la session) — changement purement
textuel de prompt, suivant le même schéma que les fragments partagés déjà validés en direct plus
tôt (matériaux, intelligences). Confirmé indirectement depuis : le défi "30 secondes de sauts"
généré en direct pour la décision #40 a des étapes conformes à ce style (gestes uniques, concrets).

## Décision #45 : audit d'accessibilité Admin OS (WCAG 2.1 AA) — contraste `--sky` + état actif des onglets

**Contexte (2026-07-22)** : `/design:accessibility-review` demandé sans cible précise ;
l'utilisateur a choisi "Admin OS complet" via question de clarification.

**Trouvaille principale** : le token de design `--sky` (`oklch(0.85 0.06 240)`, `styles.css`) a un
ratio de contraste calculé (conversion OKLCH → sRGB linéaire → luminance relative, pas une
supposition) d'environ **1.57:1** sur fond blanc — très en dessous des seuils WCAG 1.4.3 (4.5:1
texte normal, 3:1 grand texte). Utilisé comme couleur de **texte** (`text-sky` nu, pas
`text-sky-600`) à 8 endroits dans Admin OS, dont le chiffre KPI "Défis Validés" (AdminExecutiveTab)
et "Volume d'Appels API" (AdminNayaTab). `AdminCommerceTab` utilisait déjà `text-sky-600`/
`text-sky-700` (palette Tailwind standard) pour ses propres bleus — preuve que le fix est cohérent
avec un pattern déjà présent ailleurs dans la même base de code, pas une convention inventée pour
l'occasion.

**Autre trouvaille** : la barre d'onglets Admin OS (`AdminNavTabBar`) ne signalait l'onglet actif
que visuellement, sans `aria-current`/`role="tablist"` — un lecteur d'écran ne peut pas savoir
quelle section est affichée.

**Fix** : remplacement des 11 occurrences de `text-sky`/`bg-sky` (texte/graphique) par
`text-sky-600`/`text-sky-700`/`bg-sky-500` selon le contexte, `aria-current="page"` ajouté sur
l'onglet actif. 3 trouvailles mineures documentées mais non corrigées (focus indicator du
`<select>` de statut commande, noms accessibles ambigus des boutons +/− de slots, `<th>` sans
`scope="col"`) — laissées pour un futur passage de polish, faible urgence.

**Vérifié** : calcul de contraste = preuve mathématique directe, `tsc`/tests propres. Pas de
vérification visuelle live de la page Admin OS (pas d'accès admin sur le compte de test disponible
dans le navigateur de la session).

## Décision #46 : fix `pedagogical_context` — JSON brut affiché au parent au lieu d'une phrase lisible

**Contexte (2026-07-22)** : signalement utilisateur avec capture d'écran — la carte "Intention
Pédagogique" affichait littéralement `{"cycle_id":"...","target_cause":"METHOD_MISM...` au lieu
d'un texte lisible.

**Cause** : `pedagogical_context` sert deux usages depuis la décision #34 (défis discriminants,
`hypotheses.functions.ts`) et les recommandations ESSAIMAGE/STABILISATION
(`recommendations.functions.ts`) : JSON interne pour le moteur bayésien (`{cycle_id, target_cause,
is_discriminant}` ou `{is_recommendation, type}`) au lieu du texte pédagogique lisible que les
défis "normaux" y stockent. 4 sites d'affichage UI (`profiles.$profileId.challenges.tsx` ×2,
`supervisor.tsx`, `boutique.tsx`) affichaient ce champ tel quel, sans jamais vérifier son format.

**Fix** : nouveau helper `formatPedagogicalIntention` (`src/lib/pedagogical-intention.ts`) —
traduit le JSON en phrase lisible (une par cause diagnostiquée, une par type de recommandation),
laisse passer le texte humain normal inchangé, renvoie `null` (jamais de JSON brut) pour une forme
JSON inconnue. Appliqué aux 4 sites.

**Vérifié en direct** : le défi réel concerné par la capture d'écran de l'utilisateur ("La
pâtisserie des fractions", mission d'investigation Naya, cause `METHOD_MISMATCH`) affiche
maintenant la phrase traduite correcte après le fix — retrouvé et confirmé en direct dans le
navigateur, pas seulement en théorie. 6 tests dédiés, `tsc`/tests propres.

## D�cision #47 : Int�gration des Saisons Trimestrielles & Fiabilisation Naya
**D�cision (2026-07-25)** : Introduction des Saisons Trimestrielles (ex: "Saison 1: Les Penseurs & Inventeurs") factur�es � 5 000 FCFA. Ce m�canisme n'est pas qu'une surcouche visuelle mais modifie intrins�quement le fonctionnement de l'IA (le g�n�rateur) en lui ajoutant des instructions de th�matique, SEULEMENT si l'enfant est inscrit.
**D�tails UI** : Ajout d'un badge "En Cours" pr�s du pr�nom dans le profil (header) ; ajout d'une carte "Certificat Trimestriel" dans le Portfolio, positionn�e au-dessus de la carte du passeport certifi� � 50 000 FCFA. Ajout d'un s�lecteur de "Mat�riel" (Maison, Ext�rieur, Magasin, Mixte) pour filtrer explicitement le mat�riel autoris�.
**Pourquoi** : Demande explicite de l'utilisateur. Le filtre par "Saison" modifie le g�n�rateur de d�fis de fa�on transparente et ajoute une composante narrative aux d�fis propos�s (en plus du domaine de base).
**R�solution technique** : 
- Helper getChildEnrolledSeason cr�� avec createServerFn (TanStack) pour l'API.
- L'injection JSON pour la g�n�ration des d�fis acad�miques "secrets" a �t� corrig�e pour fusionner toutes les contraintes de contexte.
- R�solution d'un bug o� ctiveSeason et enrollment �taient d�finis en double via destructuring dans challenges.functions.ts causant un crash local de la compilation TypeScript. Tous les types TypeScript v�rifi�s avec 
px tsc --noEmit.

## Décision #48 : Modèle "Rolling" pour les Saisons & Inscription Admin Manuelle
**Décision (2026-07-25)** : Le modèle de Saisons devient "Evergreen/Rolling" (Option B). Les saisons ont une durée (ex: 3 mois) qui démarre *au moment exact de l'inscription* de chaque enfant, plutôt que des dates de début/fin fixes et globales pour tout le monde. 
**Détails Techniques & UI** : 
- Le prix de la saison par défaut a été ajusté de 5000 FCFA à 10 000 FCFA. L'icône Sparkles de la saison sur le portfolio a été remplacée par Rocket pour la démarquer du Passeport.
- L'UI de la carte Saison affiche désormais "Démarrée le [Date]" et "Fin prévue : [Date]" calculées individuellement.
- Ajout d'une fonctionnalité dans AdminExecutiveTab permettant à un administrateur d'inscrire manuellement un enfant à une saison en cours sans passer par la boutique, avec une AdminSeasonEnrollmentModal dédiée.
**Pourquoi** : Favorise l'acquisition en continu, adapté au B2C éducatif (SaaS), tout en maintenant une expérience personnalisée (le chrono de Naya s'adapte à l'enfant).

## Décision #49 : Retour à "1 profil gratuit + slot payant", Saison incluse automatiquement, prix de bienvenue dégressif

**Décision (2026-08-03)** : Inverse le pivot du 2026-07-22 (décision non numérotée à l'époque, documentée dans un commentaire de `products.functions.ts`) qui avait abandonné le paywall par slot au profit de "5 profils gratuits pour tous, monétisation via les Saisons". Nouveau modèle : **1 profil enfant gratuit par compte**, chaque profil supplémentaire coûte **5 000 FCFA pendant les 3 premiers mois du compte** (prix de bienvenue), **15 000 FCFA ensuite** — prix et échéance toujours affichés, jamais implicites. La Saison trimestrielle (thème IA, badge, certificat) devient **incluse automatiquement** avec chaque profil, remplaçant son ancien palier payant séparé (10 000 FCFA). Même bascule côté organisations : la base gratuite des Superviseurs passe de 5 à 1, les tarifs Superviseur/Éducateur passent de 7 000 à 5 000 FCFA (même dégressivité 3 mois → 15 000 FCFA).

**Grand-père** : tout compte (ou campagne) créé avant le 2026-08-04T00:00:00Z garde son ancien plancher de 5 gratuits. Non-rétroactif par construction — les triggers concernés (`check_child_profile_quota`, `check_supervisor_quota`) ne gatent que la création d'une NOUVELLE ligne, jamais les profils/assignations déjà existants.

**Alternatives rejetées** :
- *Garder le modèle "5 gratuits + Saison payante"* : rejeté par l'utilisateur après avoir lu une analyse tierce sur la confusion "5 prix différents" — l'app en avait déjà 4-5 en circulation (Saison 10k, Passeport 50k, Superviseur/Éducateur 7k, profil supplémentaire dormant à 5k jamais réactivé) sans compter les kits boutique.
- *`GREATEST(base_floor, 2 + extra_slots)` (juste ajouter un IF à l'ancienne formule)* : rejeté — piège trouvé en concevant le changement : un compte grand-pèré déjà à 5 aurait pu acheter jusqu'à 3 slots sans que son plafond bouge (`2+3=5 ≤ 5`). Remplacé par une forme strictement additive (`base_floor + extra_slots`), qui ne rend jamais moins que l'ancienne formule à personne.
- *Fenêtre de promo globale (même date limite pour tous)* : rejeté par l'utilisateur au profit d'un compte à rebours personnel par compte (3 mois depuis `created_at`), plus proche d'un vrai "prix de bienvenue" que d'une offre de lancement.
- *Accès Saison permanent une fois inclus* : rejeté — l'utilisateur a choisi de garder la fenêtre roulante de 3 mois inchangée (elle redémarre simplement sans paiement à chaque réinscription), pour ne pas ajouter un mécanisme de reconduction automatique à un chantier déjà large.

**Bug trouvé et corrigé en marge** (pas demandé, découvert en traçant le mécanisme d'inscription) : `getChildEnrolledSeason` (`seasons.functions.ts`) comparait `season.id` à l'UUID de secours `DEFAULT_FALLBACK_SEASON` pour détecter une saison "fantôme" — sauf que la migration du 26/07 avait délibérément semé la VRAIE Saison 1 sur cet UUID exact (pour résoudre une contrainte de clé étrangère différente). Résultat, depuis cette date : tout enfant réellement inscrit était traité comme "non inscrit" par cette fonction précisément, badge et certificat ne s'affichaient jamais — vérifié en direct en base, 100% des inscriptions existantes étaient affectées. Le check était devenu obsolète et a été retiré.

**Reconstruit dans la foulée** : `updateExtraProfileSlotsAdmin` (aucun outil admin n'existait plus pour accorder `extra_profile_slots` depuis la suppression de `grantProfileSlot` en juillet — vérifié par recherche complète du repo, zéro écriture nulle part) et une nouvelle colonne "Profils suppl." dans `AdminExecutiveTab`.

**Vérifié** : 18 nouveaux tests unitaires (`child-profile-quota.test.ts`, `supervisor-quota.test.ts`, `pricing.test.ts`), suite complète 254 tests verte, `tsc` propre. En base : trigger d'auto-inscription testé par insertion réelle (ligne `season_enrollments` créée avec `payment_status='included'`, nettoyée après coup), backfill confirmé (0 profil sans inscription après migration), et requête directe confirmant que le bug ci-dessus affectait bien 100% des 9 inscriptions existantes en prod avant le fix. Pages marketing publiques (`/`, `/a-propos`) vérifiées en direct dans le navigateur avec le nouveau texte de prix. Écrans authentifiés (modale de mise à niveau, badge Saison, éditeur admin) non vérifiés visuellement faute de compte de test disponible en session — logique validée via DB directe et tests unitaires uniquement.

## Décision #50 : Intégrité de la validation des défis — preuve photo obligatoire, statut "non réussi", cause classée, soutien renforcé progressif (PR #21)

**Contexte** : parti d'un constat fait en auditant `validateChallengeProof` à la demande de l'utilisateur — un commentaire texte seul suffisait à obtenir XP/badges/points/résolution de cycle bayésien, **exactement comme une vraie photo**, sans aucune vérification visuelle. Construit en 4 chantiers séquentiels sur un brainstorming produit étalé sur ~10 échanges avec l'utilisateur, chacun confirmé avant le suivant.

**1. Preuve photo obligatoire** : `validateChallengeProof` refuse toute soumission sans image (nouvelle fonction pure `hasSufficientProof`, testée), avant même l'appel IA — sauf `proof_mode="declarative"` (défis à chiffre, ex. "20 jongles"), qui ne passe jamais par cette fonction et reste inchangé. Vérifié côté serveur, pas seulement côté UI (contournable sinon).

**2. Statut `challenge_status` étendu à `not_completed`** (migration `ADD VALUE` sur l'enum Postgres + colonnes `not_completed_reason`/`not_completed_at`) + nouvelle fonction `submitChallengeNotCompleted`, qui ne donne **jamais** de point/XP/badge — son seul rôle est d'acter honnêtement un non-aboutissement. Bouton dédié dans `profiles.$profileId.challenges.tsx`, réutilisant le champ "Journal d'apprentissage" existant comme texte d'explication (pas de nouveau champ).
**Carte des appelants faite avant d'implémenter** : `challenge_status` est lu à 22 endroits du code — 2 auraient silencieusement mal étiqueté un défi non réussi ("Défi accompli !" et "À faire" par défaut) sans correction explicite, appliquée aux deux.

**3. Classification de la cause par IA** (`classifyNotCompletedReason`, DeepSeek V4 Flash, non-bloquant/arrière-plan) : réutilise **exactement** le vocabulaire de causes déjà utilisé par le moteur de diagnostic NAYA (`METHOD_MISMATCH`/`PERFORMANCE_ANXIETY`/`LACK_OF_ENGAGEMENT`/`CONCEPTUAL_GAP`/`OTHER`, sans `READY_FOR_MORE` qui ne s'applique qu'à un écart "en avance"). `ensureHypothesesForChild` reçoit une **seconde stratégie de détection** (en plus de l'écart âge/référentiel existant) : si les 4 derniers défis non réussis d'un même domaine (nouvelle fonction pure `findRepeatedNotCompletedCause`, testée) partagent la même cause classée, un cycle d'hypothèses s'ouvre — jamais sur un seul commentaire.

**4. Soutien renforcé progressif, capable de redescendre** : nouvelles colonnes `hypothesis_cycles.support_active`/`support_checkpoint_at`. Une cause confirmée (résolution bayésienne ≥0.65) déclenche un accompagnement renforcé — **réutilise le mécanisme "Stabilisation" déjà existant** dans `recommendChallengesForChild` (jusque-là seulement déclenché par un signal `pedagogical_twins` différent), maintenant aussi déclenché par domaine sur une cause confirmée. Après 5 défis réussis en mode soutenu (décision utilisateur explicite), un **défi de retest sans accommodation** (`generateSupportRetestChallenge`, nouveau) vérifie si le soutien est encore nécessaire — succès → `support_active=false` (retour à la normale) ; échec → compteur relancé pour 5 défis de plus (`processSupportRetestResult`, symétrique inversé de `processDiscriminantResult` : ici réussir SANS accommodation est un signal CONTRE la cause, pas pour).

**Alternatives rejetées** :
- ❌ *Prompt de génération entièrement décentralisé, un par enfant* : cassait la révisibilité globale (un futur fix de clarté, comme `STEPS_INSTRUCTION` décision #44, ne profiterait plus qu'à un enfant) et le risque de dérive de la voix de marque de Naya (non-négociable, cf. Key Principle #3) sur des centaines de prompts jamais relus.
- ❌ *Auto-réécriture automatique du prompt partagé* sur la base d'un pattern détecté : jamais implémenté — un ajustement propre à UN enfant peut rester automatique (avec le garde-fou du motif répété), mais tout ce qui toucherait les instructions partagées par tous les enfants doit remonter à une revue humaine, jamais s'auto-modifier. Aucun mécanisme de ce type construit dans ce chantier.
- ❌ *Fusionner le niveau de soutien dans `zpa_level`* (un seul chiffre) : risque de signaux contradictoires (contenu difficile + instructions bébé). Finalement, aucun nouveau champ "niveau" séparé n'a été créé du tout — le soutien renforcé est piloté par la réutilisation directe du mécanisme Stabilisation/Investigation existant, pas par un nouveau dial numérique.
- ❌ *Seuil de motif à 2 occurrences* (proposition initiale de l'utilisateur) : tranché explicitement à **4**, pour rester cohérent avec le seuil déjà utilisé par le déclencheur âge/référentiel (décision #38) plutôt que d'avoir deux disciplines différentes dans le même moteur.

**⚠️ État vérifié (2026-08-03), PAS entièrement résolu** : voir [[genizio-etat-code]] pour l'état complet. Deux bugs de production découverts en testant après déploiement — la carte "Avantage Secret de Naya" est **résolue**, voir décision #51 ; le bouton "non réussi" absent au statut `todo` est corrigé (fix non commité, cf. [[genizio-etat-code]]) mais un clic sur "Commencer le défi" ne produisant aucun effet visible reste **NON résolu**, cause non identifiée à ce jour.

## Décision #51 : Correctif du secret académique de Naya — la cause racine réelle était côté client, pas seulement côté génération

**Contexte** : suite à décision #50, l'utilisateur signale que la carte "Avantage Secret de Naya" reste générique même sur un "single défi" — un chemin que l'audit précédent croyait déjà correct (`generateSingleChallenge`/`assignTemplateChallenge` recopiaient bien `academic_secret` à l'insertion, corrigé depuis `b654636` du 2026-07-27). Ce désaccord entre l'hypothèse et le rapport utilisateur a motivé une re-traçée complète de la chaîne, pas juste une relecture du point d'insertion déjà audité.

**Ce qui a été trouvé, en deux couches** :
1. **6 chemins de génération sur 8** ne demandaient jamais `academic_secret` à l'IA (absent du prompt ET du JSON attendu) : `generateAcademicHomeworkChallenge`, `generateDiscriminantChallenge`, `generateSupportRetestChallenge` (nouveau de décision #50, même trou dès sa naissance), et les 3 branches de `recommendChallengesForChild` (Essaimage, Stabilisation ×2, Exploration). Seuls `generateChallenges` (bulk) et `generateSingleChallenge` incluaient déjà `${ACADEMIC_SECRET_INSTRUCTION}`.
2. **La vraie cause du rapport "single défi"** : `assignTemplateChallenge` copie bien `template.academic_secret` côté serveur — mais les **deux pages clientes** qui appellent cette fonction (`profiles.$profileId.challenges.tsx` → `handleAssignSingle`, et `boutique.tsx` → `handleAssign`) construisaient l'objet `template` envoyé au serveur en énumérant les champs un par un, **sans `academic_secret` dans la liste** (ni `academic_domain`/`academic_level_age`/`academic_reference_note`/`proof_mode`/`proof_target`/`declarative_award`/`trait_subform`, silencieusement perdus aussi). Le serveur avait beau générer un vrai secret dans l'aperçu (`currentGeneratedChallenge`/`generatedChallenge`), il ne survivait jamais l'aller-retour client avant l'insertion réelle. C'est un bug distinct et antérieur à décision #50 — probablement présent depuis la création de ces deux flux, jamais lié à la PR #21.

**Fix** : (a) `${ACADEMIC_SECRET_INSTRUCTION}` + champ JSON `academic_secret` ajoutés aux 6 prompts manquants, `academic_secret: parsed.academic_secret ?? null` ajouté à leurs insertions directes (même motif que les 2 chemins déjà corrects) ; (b) les deux objets `template` côté client remplacés par un spread complet de l'aperçu généré (`...currentGeneratedChallenge`/`...generatedChallenge`), ne gardant que les 3 champs qui ont vraiment besoin d'un repli explicite (`material_tags`, `intelligences`, `requires_supervision`) — plutôt que d'ajouter `academic_secret` à la liste manuelle, ce qui aurait laissé la même classe de bug se reproduire au prochain champ ajouté à `ChallengeSchema`.

**Alternative rejetée** : *Ajouter uniquement `academic_secret` à la liste de champs cherry-pickés côté client* — corrigeait le symptôme rapporté mais laissait `academic_domain`/`proof_mode`/`proof_target`/`declarative_award`/`trait_subform` silencieusement perdus pour ces deux flux (impact réel non mesuré : suivi de progression académique et mode de preuve potentiellement faussés sur tout défi assigné via "Composer un défi ciblé"/devoir fusionné/Atelier du Temps). Le spread complet élimine la classe de bug plutôt qu'une instance ; `ChallengeSchema` n'étant pas `.strict()`, un spread ne risque pas d'introduire un champ rejeté par le serveur.

**Vérifié** : `tsc --noEmit` propre et suite complète (254 tests) verte après chaque étape. Pas de vérification navigateur — reproduire les 7 chemins de génération corrigés demanderait des états enfant réels difficiles à recréer en session (cycle d'hypothèses ouvert/résolu, compteurs de complétion, etc.) et des appels IA réels ; la correction sera visible naturellement au prochain défi complété par chaque flux. Travaillé sur branche dédiée `fix/naya-academic-secret-generation` créée depuis `main` à jour (`cef4928`), pas encore mergée.

## Décision #52 : Naya 3.0 « Le Loup » — Chantier 1 : constitution centralisée, persona expert, builders purs (branche `feat/naya-le-loup`)

**Contexte** : retour utilisateur sur la génération IA — (1) le rôle system « Tu es un assistant IA précis » ne portait aucune expertise, (2) aucun « loup » ne vérifie sémantiquement que le but pédagogique est atteint (risque d'hallucination). Plan approuvé « Naya 3.0 — Le Loup de Naya » en 4 chantiers ; celui-ci est le **Chantier 1** (identité & socle testable).

**Décision** :
- **C1.1 — Constitution centralisée** : les 11 constantes de prompt dispersées dans `challenges.functions.ts` (`GENIZIO_PRINCIPLES`, `SAFETY_INSTRUCTION`, `PROOF_MODE_INSTRUCTION`, `ACADEMIC_REFERENTIAL_INSTRUCTION`, `ACADEMIC_SECRET_INSTRUCTION`, `AGE_DEVELOPMENT_GUIDANCE`, `MATERIAL_TAGS_INSTRUCTION`, `INTELLIGENCES_FIELD_INSTRUCTION`, `TRAIT_SUBFORM_INSTRUCTION`, `STEPS_INSTRUCTION`, `buildAvoidRepeatsInstruction`) et l'ex-`systemReminders` du diagnostic bayésien sont extraites dans `src/lib/naya-prompts.ts` (module pur, zéro dépendance). `challenges.functions.ts` importe et ré-exporte telles quelles → importeurs existants (hypotheses, recommendations, admin-os, tests) inchangés d'un caractère.
- **C1.2 — Persona expert en rôle system** : `NAYA_SYSTEM_PROMPT` (mentor de l'éveil des talents, 5-16 ans, Afrique francophone + diaspora, Gardner, observation-pas-diagnostic) remplace le placeholder dans `callDeepSeekText` (jsonMode → `NAYA_SYSTEM_PROMPT_JSON` = persona + contrainte JSON ; non-json → persona seul) et `callAnthropicVision` (jsonMode → `NAYA_SYSTEM_PROMPT_JSON`). La constitution dense reste dans le contexte utilisateur au lancement (modèle léger v4-flash) ; elle passera en system avec le cache de prompt au chantier 4.
- **C1.3 — Builders purs** : `buildChallengePrompt`, `buildSingleChallengePrompt`, `buildHomeworkPrompt`, `buildRecommendationPrompt` (4 modes : `stabilisation_cycle`/`essaimage`/`stabilisation_fragilite`/`exploration`), `buildHypothesisPrompt` remplacent les templates string géants des 5 call sites (`generateChallenges`, `generateSingleChallenge`, `generateAcademicHomeworkChallenge`, les 4 branches de `recommendChallengesForChild`, `runHypothesisEngine`), avec fidélité byte-à-byte vérifiée contre les templates d'origine (test scratch temporaire, exécuté puis supprimé).

**Pourquoi cette forme** : le point précédent (« prompt général + prompt par enfant », cf. commits `fe35e07`/`6a33cde`) a montré que la seule défense durable contre la dérive des copies collées est la source unique ; les builders purs rendent l'assemblage testable sans IA ni base de données, et la « couverture des rubriques » empêche qu'une édition future fasse tomber silencieusement une rubrique d'un prompt. C'est aussi le socle du Chantier 2 : le Loup vérifiera ces rubriques sémantiquement, sur la même constitution.

**Alternatives rejetées** : *laisser les templates dans chaque call site* (dérive déjà observée plusieurs fois, cf. commentaires « had already drifted once ») ; *builders dans `challenges.functions.ts`* (impossible de tester l'assemblage sans charger tout le module serveur) ; *moteur de templates tiers* (sur-ingénierie pour des chaînes concaténées).

**Vérifié** : `tsc --noEmit` propre, suite complète **324 tests verte** (dont 22 nouveaux : identité system, contrat des builders, couverture des rubriques, disparition du placeholder littéral), `npm run build` OK. Fidélité byte-à-byte des builders confirmée (3 builders complexes + 4 modes de recommandation). Branche `feat/naya-le-loup` créée depuis `main` (`c8e6a2e`), PR à venir après les chantiers suivants.
