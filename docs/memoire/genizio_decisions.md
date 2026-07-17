---
name: genizio-decisions
description: Décisions d'architecture et produit — quoi, pourquoi, alternatives rejetées
metadata:
  type: project
  status: living-document
  last_updated: 2026-07-17
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

**Bug trouvé en vérifiant réellement le flux (pas juste en lisant le code)** : les 3 endroits qui confirment un défi généré (`laboratory.tsx`, `boutique.tsx`, le panneau Labo de `profiles.$profileId.challenges.tsx`) construisaient le payload `template` envoyé à `assignTemplateChallenge` en listant les champs à la main, et aucun des 3 n'incluait `requires_supervision`, `supervision_warning`, ni le nouveau `difficulty` — un défi que l'IA avait explicitement marqué comme nécessitant une supervision adulte (cuisine, objets tranchants, feu) aurait donc silencieusement perdu ce marqueur exactement au moment de la sauvegarde réelle, retombant toujours sur `false` par défaut côté serveur. **Repéré en générant et assignant un vrai défi** : la prévisualisation affichait "🟢 Facile", mais la ligne effectivement sauvegardée en base montrait `difficulty: "moyen"` (valeur de repli serveur) — preuve que le payload ne transportait pas le champ. Corrigé dans les 3 fichiers, puis re-vérifié par un second aller-retour génération+assignation : `difficulty: "facile"` correctement persisté cette fois, confirmé par requête SQL directe.

**Vérifié en direct** : deux générations réelles via le Labo (1,1 s et 3,8 s — aucun ralentissement notable dû à l'ajout du framework), contenu concret/adapté à l'âge/zéro-coût sans caractère Markdown brut, badges 🟢/🟡 corrects sur la liste des défis à côté d'un défi historique à `difficulty: null` qui n'affiche justement aucun badge plutôt qu'une valeur inventée. Données de test nettoyées après vérification.

**Commit** : `fe35e07`. `tsc --noEmit` propre.




