---
name: genizio-decisions
description: Décisions d'architecture et produit — quoi, pourquoi, alternatives rejetées
metadata:
  type: project
  status: living-document
  last_updated: 2026-07-20
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
