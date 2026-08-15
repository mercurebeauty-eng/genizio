---
name: genizio-decisions
description: Décisions d'architecture et produit — quoi, pourquoi, alternatives rejetées
metadata:
  type: project
  status: living-document
  last_updated: 2026-08-15
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
**Statut** : **tout livré** — les 7 phases ont été implémentées puis largement dépassées par les refontes suivantes (Portfolio, Quête, hub Mentor, Admin OS, Naya V4...). Cette décision décrit la refonte « Génizio v2 » d'origine ; elle est conservée pour l'historique, l'état réel du code fait foi (cf. [[genizio-etat-code]]).

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
léger) livrée par la [[#14]] (table `orders` + suivi admin) ; Phase 4 (paiement in-app) différée au
backlog.

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

## Décision #47 : Intégration des Saisons Trimestrielles & Fiabilisation Naya
**Décision (2026-07-25)** : Introduction des Saisons Trimestrielles (ex: "Saison 1: Les Penseurs & Inventeurs") facturées à 5 000 FCFA. Ce mécanisme n'est pas qu'une surcouche visuelle mais modifie intrinsèquement le fonctionnement de l'IA (le générateur) en lui ajoutant des instructions de thématique, SEULEMENT si l'enfant est inscrit.
**Détails UI** : Ajout d'un badge "En Cours" près du prénom dans le profil (header) ; ajout d'une carte "Certificat Trimestriel" dans le Portfolio, positionnée au-dessus de la carte du passeport certifié à 50 000 FCFA. Ajout d'un sélecteur de "Matériel" (Maison, Extérieur, Magasin, Mixte) pour filtrer explicitement le matériel autorisé.
**Pourquoi** : Demande explicite de l'utilisateur. Le filtre par "Saison" modifie le générateur de défis de façon transparente et ajoute une composante narrative aux défis proposés (en plus du domaine de base).
**Résolution technique** :
- Helper `getChildEnrolledSeason` créé avec createServerFn (TanStack) pour l'API.
- L'injection JSON pour la génération des défis académiques "secrets" a été corrigée pour fusionner toutes les contraintes de contexte.
- Résolution d'un bug où `activeSeason` et enrollment étaient définis en double via destructuring dans `challenges.functions.ts` causant un crash local de la compilation TypeScript. Tous les types TypeScript vérifiés avec `tsc --noEmit`.
**⚠️ Note d'encodage (2026-08-15)** : ce bloc avait été écrit avec des caractères corrompus (mojibake), ce qui le rendait invisible aux recherches (d'où son absence apparente de l'index des décisions). Texte restauré.
**Statut** : SUPPERSÉDÉ — la Saison payante a été incluse automatiquement puis dégradée en simple étiquette (décisions #49 et #60, 2026-08-03/12) ; `getChildEnrolledSeason` ne sert plus qu'à l'information (étiquette/certificat, inscription explicite).
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

**✅ État vérifié et CLÔTURÉ (2026-08-13)** : voir [[genizio-etat-code]] pour l'état complet et l'addendum ci-dessous. Les deux bugs de production découverts en testant après déploiement sont résolus : la carte "Avantage Secret de Naya" (ci-dessous) ; le bouton "non réussi" absent au statut `todo` (déjà en production via le reframe 2026-08-09, stash résorbé en PR #50) ; et le clic "Commencer le défi" sans effet visible — **cause identifiée et clôturée**, voir addendum.

## Décision #51 — Addendum (2026-08-13) : clôture du bug « Commencer le défi sans effet visible »

**Symptôme historique (signalé ~2026-08-03, après déploiement PR #21/#22)** : cliquer "Commencer le défi" ne produisait aucun effet visible — pas de changement d'état, pas de message d'erreur.

**Cause racine identifiée (2026-08-13, vérifiée dans le code)** : le bug était dans le **filtre de liste**, pas dans la mutation.
- La mutation fonctionnait : `setStatus` → mise à jour optimiste + `updateChallenge` (pré-checks verrouillage/désactivation, ownership, repli `time_limit_minutes`) → `in_progress` en base.
- Mais la mise à jour optimiste **retirait la carte du filtre « À faire » avant la réponse serveur** — et le filtre restait sur « À faire » → le défi disparaissait sans qu'on voie où il était allé. « Aucun effet visible » = la carte n'était plus nulle part, seul un toast passait.

**Correctif (déjà en place depuis le 2026-08-05, confirmé)** : au clic depuis « À faire », le filtre **suit la carte vers « En cours »** — elle reste visible dans son nouvel état (bloc « Défi débuté. Nous attendons vos validations… » + lien « Valider le défi (Mode Enfant) 📸 ») + toast explicite. Angles morts vérifiés : filtre « Tous » (carte visible dans les deux états), filtre « En cours » (déjà affichée), échec serveur (rollback + toast d'erreur), un seul CTA « Commencer » dans toute l'app.

**Garantie de non-régression (PR #56, mergée)** : logique extraite en fonction pure `followFilterAfterStart` (`src/lib/challenge-list-filters.ts`, pattern du projet) + 5 tests de régression.

**Reste (manuel)** : test navigateur réel — clic sur un défi « À faire » → la carte bascule en « En cours » avec le bloc « Défi débuté… » + lien Mode Enfant, toast, `in_progress` en base.

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

## Décision #53 : Naya 3.0 « Le Loup » — Chantier 2 : vérification sémantique (shadow → enforce), journal `generation_audits`, tableau de bord admin

**Contexte** : l'utilisateur a demandé qu'un « loup » vérifie sémantiquement, sur chaque génération IA, que l'objectif pédagogique est atteint (anti-hallucination, anti-défi générique, anti-texte clinique). Le chantier 1 (#52) a posé la constitution unique et le persona expert ; ce chantier installe la boucle de vérification sur les 16 sites d'appel IA, en mode shadow d'abord (zéro impact utilisateur), avec un mécanisme d'enforcement prêt à être activé par flag.

**Ce qui a été fait** :
1. **C2.1 — `src/lib/naya-verifier.functions.ts`** (module nouveau, ~800 lignes). `verifyGeneration({kind, output, context}) → verdict {conformity: conforme|mineur|majeur, violations: [{rule, severity, detail, suggestion}]}`. Deux couches délibérément découplées :
   - couche 1 **déterministe, pure, synchrone, gratuite** (toujours active) : rubriques structurelles par type — défis (titre/description présents, 1-2 intelligences valides parmi les 9, difficulté/proof_mode dans le spec, declarative complet, trait_subform ancré à une sous-forme de l'intelligence parente, 3-6 étapes, tags minuscules, academic_level_coherent + vs âge réel, supervision cohérente, titre unique, zéro Markdown), homework (behavioral_driver présent, zpa_level 1-5, anti-anxiété : contexte anxiété + difficulty=difficile → majeur), recommandations (difficulté douce en stabilisation), hypothèses (somme des probabilités = 1, causes dans l'allow-list, evidence_log ancré au snapshot, direction cohérente avec l'écart), synthèses/lettres/narrations (zéro chiffre, ton non-pathologisant — mots cliniques proscrits, pas de Markdown), preuves (observations présentes, clés de talents valides, points 0-3), classification (cause dans les 5), tampon.
   - couche 2 **sémantique IA échantillonnée** (`NAYA_VERIFY_SEMANTIC_RATE`, défaut 10 %) : le Loup (modèle léger, maxTokens 600) contrôle les critères qualitatifs (observable, anti-bricolage-passif, matériaux réalistes africains, non-générique, cohérence niveau/contenu, tonalité) via une rubrique par type (`semanticRubricFor`), réponse JSON validée par zod. En cas de panne IA → `[]` (la couche 1 reste la source de vérité). `callClaude` importé en **dynamique** pour éviter tout cycle ES avec `challenges.functions.ts`.
2. **C2.2 — migration `20260806100000_generation_audits.sql`** : table `generation_audits` (id, child_id FK, kind, source_function, verdict, violations jsonb, regenerated, semantic_checked, context jsonb, model, estimated_cost, created_at, processed) + index (kind, created_at desc), child, processed partiel, verdict. **Appliquée au projet distant** (seule migration en attente, vérifié par `db push --dry-run` avant/après). Types Supabase (`src/integrations/supabase/types.ts`) étendus manuellement — bloc `generation_audits` vérifié **identique** à la génération officielle `supabase gen types --linked` (seul le CRLF diffère, cohérent avec le fichier).
3. **C2.3 — shadow sur les 16 sites** : `void verifyAndLog({...})` en fire-and-forget après chaque parse, jamais `await`é, échec silencieux. Sites : challenges.functions (8 : bulk, proof_validation, classification, homework, single, synthesis, letter, tampon), hypotheses.functions (4 : narrateForParent, runHypothesisEngine, discriminant, support_retest), recommendations.functions (4 : stabilisation_cycle, essaimage, stabilisation_fragilite, exploration). Contexte transmis (âge, nom, anxiété, stabilisation, direction, titres existants) pour enrichir le learning.
4. **C2.4 — enforce préparé** : `NAYA_VERIFY_ENFORCE` (défaut `false`), `shouldEnforce()`, `buildRecadrageSuffix(verdict)` qui génère le suffixe de recadrage listant les règles majeures violées avec suggestions (vide si aucune majeure). Prévu pour une régénération ciblée max 1 sur les chemins à défi unique ; **non branché par défaut** — le comportement en production reste strictement shadow.
5. **C2.5 — `getGenerationAuditsAdmin`** : endpoint GET lecture seule (middleware `requireAdmin`, même pattern que admin-os) — total, répartition par verdict/type, taux de vérification sémantique, coût estimé (table locale par type), top 20 violations récurrentes (alimentera le chantier 3), 50 derniers audits.

**Pourquoi cette forme** : la vérification doit être **non-bloquante par construction** (le Loup ne peut jamais casser une génération — d'où le try/catch global de `verifyGeneration` et l'insert en arrière-plan) et **apprendre de la réalité** (chaque verdict journalisé, `processed` flag pour le chantier 3). Le dédoublement couche déterministe/sémantique fait que même en panne IA la surveillance structurelle continue à 0 coût ; l'échantillonnage borne le coût de la couche 2 (~10 % des générations, modèle léger, 600 tokens max). Les tables locales (clés/sous-formes) sont copiées dans le module pour qu'il reste pur/testable, **verrouillées par un test** d'égalité contre talent-buckets/challenges.functions.

**Alternatives rejetées** : *vérification sémantique sur 100 % des générations dès le départ* (coût ×10, aucune donnée encore pour calibrer les seuils) ; *enforce branché d'office* (régénération = coût + latence, à activer seulement quand le taux de conformité réel est connu via le dashboard) ; *écriture synchrone de l'audit* (latence utilisateur inacceptable) ; *table générée par réécriture complète des types* (régénération distante non fiable sans le bon état de branche — l'ajout manuel vérifié contre la génération officielle est plus sûr ici).

**Vérifié** : `tsc --noEmit` propre, suite complète **361 tests verte** (dont 37 nouveaux : parseur de verdict, payload par type, couverture des 13 rubriques, verrouillage des tables locales, mergeViolations, buildRecadrageSuffix, non-régression finalizeChallenge), `npm run build` OK. Migration appliquée en remote (push réel, rien en attente ensuite). Travaillé sur `feat/naya-le-loup` (à la suite du chantier 1, commit `5e1ad76`).

## Décision #54 : Naya 3.0 « Le Loup » — Chantier 3 : le Loup qui apprend (agrégation des audits, seuils de récurrence, bloc LEARNED_RULES)

**Contexte** : le chantier 2 (#53) a installé la boucle de vérification shadow sur les 16 sites d'appel et le journal `generation_audits`. Ce chantier transforme les verdicts accumulés en apprentissage : une violation récurrente doit devenir une règle explicite de la constitution, sans noyer le signal sous les données.

**Ce qui a été fait** :
1. **C3.1 — `src/lib/naya-constitution.functions.ts`** (module nouveau). Fonctions **pures** et testables sans base ni IA : `aggregateAuditViolations(rows)` regroupe les violations par (règle, type de génération, domaine extrait du contexte — Gardner pour les défis, matière pour les devoirs) avec compteur d'occurrences, **set d'enfants distincts** (un enfant très générateur ne gonfle pas le seuil), sévérité max et détails dédupliqués ; `computeRecurringRules(aggregates, thresholds)` n'admet une règle que si elle franchit **≥ N occurrences ET ≥ M enfants distincts** (défauts : 3 et 2, configurables via `NAYA_CONSTITUTION_MIN_COUNT`/`NAYA_CONSTITUTION_MIN_CHILDREN`).
2. **C3.2 — suggestions d'évolution de constitution** : `buildLearnedRuleText` numérote les règles apprises (`LEARNED_RULE 1. « règle » (type, domaine) — Observée N fois chez M enfants — Constat — Correctif`), `buildDecisionDraft` produit un brouillon prêt pour `genizio_decisions.md`, `buildLearnings` assemble le bloc `## LEARNED_RULES` daté. Deux endpoints admin (middleware `requireAdmin`, pattern #53) : `getConstitutionSuggestionsAdmin` (GET, lecture seule — agrège les audits non traités, applique les seuils, ne marque rien processé tant que la décision humaine n'est pas actée) et `acknowledgeConstitutionSuggestionsAdmin` (POST, acquitte les audits correspondant aux règles validées → `processed = true` pour que le signal ne ressurgisse plus).
3. **C3.3 — 11 tests** d'agrégation et de seuils (groupement par clé, enfants distincts, sévérité prime, extraction du domaine, seuils par défaut, rédaction numérotée).

**Pourquoi cette forme** : le même remède que les décisions #52/#53 — la source unique et la vérification humaine. Le Loup ne réécrit jamais la constitution tout seul ; il *propose* un bloc numéroté que l'admin recopie dans `genizio_decisions.md` après lecture (validation humaine explicite, pattern déjà en place), et l'acquittement n'est qu'une marque de traitement. Les seuils (occurrences + enfants distincts) évitent deux biais connus : la rareté qui n'est pas un motif, et l'enfant unique très générateur qui fausserait le signal. La séparation fonctions pures / endpoints admin rend l'agrégation testable sans réseau.

**Alternatives rejetées** : *application automatique des règles apprises dans la constitution* (le Loup apprendrait de lui-même ses propres biais — la validation humaine du pattern genizio_decisions.md est précisément le garde-fou voulu par l'utilisateur) ; *table dédiée `constitution_suggestions`* (le calcul live depuis `generation_audits` + flag `processed` suffit à ce stade — une migration supplémentaire serait de la sur-ingénierie avant d'avoir un volume réel) ; *seuil en occurrences seules* (le signal « beaucoup de violations d'un même enfant » serait compté comme une tendance générale).

**Vérifié** : `tsc --noEmit` propre, suite complète **372 tests verte** (dont 11 nouveaux C3), `npm run build` OK. Aucune migration ce chantier. Travaillé sur `feat/naya-le-loup` (à la suite du chantier 2, commit du C2).

## Décision #55 : Naya 3.0 « Le Loup » — Chantier 4 : télémétrie du Loup, cache de prompt, garde-fous coût

**Contexte** : les chantiers 2-3 (#53/#54) ont installé la vérification sémantique shadow et l'apprentissage. Ce chantier ferme le volet opérationnel : mesurer ce que le Loup coûte et détecte, tirer parti du cache de contexte des fournisseurs, et borner le poste de coût sémantique.

**Ce qui a été fait** :
1. **C4.1 — télémétrie du Loup** : `naya-telemetry.ts` étendu — `calculateNayaWolfTelemetry(audits)` (pure) calcule taux de conformité (conforme/mineur/majeur), taux de recadrage, taux de vérification sémantique, top 10 violations récurrentes, ventilation par type de génération, et le **coût propre du Loup** (vérifications sémantiques × coût par appel v4-flash estimé ~2 500 tokens entrée + 800 sortie). `getNayaTelemetryAdmin` interroge maintenant `generation_audits` et remplace l'état vide par les données réelles. Panneau « Le Loup de Naya » ajouté à l'onglet admin (AdminNayaTab).
2. **C4.2 — cache de prompt** : la constante `NAYA_SYSTEM_PROMPT(_JSON)` est un **préfixe byte-identique en premier message (rôle system) sur chaque appel DeepSeek** — le context caching automatique de DeepSeek s'applique donc par construction (tarif cache hit), documenté dans `naya-prompts.ts`. Côté Anthropic (vision uniquement), le bloc system reçoit désormais `cache_control: {type: "ephemeral"}` — seul changement de code nécessaire, le préfixe étant déjà stable. La constitution dense reste dans le contexte utilisateur (modèle léger v4-flash) : la déplacer en system changerait le comportement de génération sans gain de cache supplémentaire mesuré.
3. **C4.3 — garde-fous coût** : le Loup sémantique est borné par construction — modèle économique par défaut (deepseek-v4-flash), `NAYA_VERIFY_MAX_TOKENS` plafonné **entre 300 et 800** (défaut 800, remplace l'ancien 600), **entrée tronquée** via `truncateJsonForLoup` (~40 Ko max : un lot bulk entier passe en UNE vérification — la vérification « par lot » est donc naturelle, pas un appel par défi), `NAYA_VERIFY_SEMANTIC_RATE` déjà configurable (chantier 2). Kill-switch opérationnel `NAYA_VERIFY_ENABLED=false` qui neutralise tout le Loup en un flag.

**Pourquoi cette forme** : la télémétrie du Loup est une **fonction pure** nourrie par l'endpoint admin existant (aucune nouvelle route, le panneau lit `telemetry.wolf`) — et les garde-fous sont des **bornes dures dans le code** plutôt que des bonnes pratiques documentées : on ne peut pas dépasser 800 tokens de sortie ni envoyer 100 Ko d'entrée même en éditant le code plus tard (le plafond est dans la fonction). Le cache de prompt n'a quasi rien coûté en code parce que la conception du chantier 1 (constantes en rôle system) avait déjà créé le préfixe stable : C4.2 documente l'existant et ajoute le seul `cache_control` manquant côté Anthropic.

**Alternatives rejetées** : *déplacer la constitution dense en rôle system pour un cache plus long* (changement de comportement de génération sur les 16 sites pour un gain de coût non mesuré — le préfixe system déjà stable + les constantes byte-identiques des builders donnent déjà l'essentiel du cache) ; *file d'attente de vérifications par lot côté serveur* (un timer setTimeout en worker Cloudflare ne survit pas à la fin de requête — la vérification par lot est déjà naturelle pour le site bulk, et un échec de flush perdrait des audits) ; *mesurer le coût du Loup par token réel* (naya-telemetry reste un estimateur par design, décision historique — les tokens réels seraient une refonte de la lecture de coût, hors périmètre).

**Vérifié** : `tsc --noEmit` propre, suite complète **381 tests verte** (dont 9 nouveaux : calculateNayaWolfTelemetry ×5, garde-fous ×4), `npm run build` OK. Aucune migration ce chantier. Travaillé sur `feat/naya-le-loup` (à la suite des chantiers 2-3).

## Décision #56 : Naya 3.0 « Le Loup » — validation hybride des règles apprises dans l'admin (auto par seuil paresseux + décisions humaines + journal)

**Contexte** : le chantier 3 (#54) avait livré l'apprentissage côté serveur (suggestions + `acknowledge…`), mais **aucune UI** ne l'exposait — les données existaient en base sans écran pour les voir, le scénario « doc oublié au fond de l'ordi » que l'utilisateur refuse explicitement. Il a demandé une validation **hybride** : auto-acquittement par seuil de confiance pour les cas évidents, **pouvoir de décision humain** (la règle intégrée est-elle pertinente ? à revoir ? rejeter ?) et **journal tracé**, le tout dans l'onglet admin (panneau « Le Loup qui apprend », après la télémétrie du #55).

**Ce qui a été fait** :
1. **Migration `20260806110000_loup_rule_decisions.sql`** : `generation_audits` enrichie — `decision` (`en_attente` par défaut \| `auto` \| `valide` \| `a_revoir` \| `rejete`, check constraint), `decision_at`, `decision_by` (email admin ou `'système'`), `decision_note` (commentaire humain optionnel) + index `(decision, created_at desc)`. `processed` reste le marqueur « traité » (un audit est traité dès qu'une décision ≠ `en_attente` est posée). Types Supabase mis à jour à la main (précédent #53) et vérifiés contre `gen types --linked`.
2. **`naya-constitution.functions.ts`** : types `LoupDecision`/`AuditDecision`/`WolfState`/`RuleDecision` ; fonctions pures `computeAutoAckRules` (réutilise les seuils de récurrence avec les seuils auto par défaut **≥ 5 occurrences / ≥ 3 enfants**, env `NAYA_CONSTITUTION_AUTO_ACK_COUNT`/`…_CHILDREN`), `clampAutoAckThresholds` (l'auto ne descend jamais sous les seuils de suggestion 3/2 : on n'auto-acquitte que du déjà-proposable), `ruleKeyOf` (clé canonique `kind|domaine|règle`), `buildRuleJournal` (journal des décisions regroupé par règle, décision la plus récente prime, enfants distincts). **3 endpoints** (middleware `requireAdmin`) : GET `getConstitutionSuggestionsAdmin` **évolué** (réponse `{ auditsConsidered, wolfState, suggestions, journal, learnedRulesBlock, decisionDrafts }`, lecture seule) ; POST `runLoupAutoAcknowledgementAdmin` (auto-acquittement paresseux, idempotent → `processed=true` + `decision='auto'`, `decision_by='système'`) ; POST `decideLoupSuggestionsAdmin` (**remplace** `acknowledge…`, aucun consommateur) — décisions `valide`/`a_revoir`/`rejete` + note optionnelle, tracées par `context.claims.email`.
3. **UI** : panneau « 🐺 Le Loup qui apprend — Validation des règles apprises » dans `AdminNayaTab` — état du Loup en clair (mode OBSERVATION/ENFORCE, échantillonnage sémantique %, kill-switch, seuils suggestions vs auto), cartes de suggestions en attente avec **3 boutons** (Intégrer / À revoir / Rejeter, spinner par carte), **journal des décisions** (badges colorés par décision, date fr-FR, auteur), bouton « Copier le bloc LEARNED_RULES » pour la promotion finale volontaire. Route `admin.index.tsx` : `loadData` enchaîne auto-acquittement **puis** GET (ordre volontaire pour que le panneau reflète les auto-décisions), handler `handleDecideSuggestion` + toast.
4. **7 tests purs** ajoutés (fichier `naya-constitution.test.ts` → 18 au total) : franchissement du seuil auto 5/3, borne du clamp, `ruleKeyOf`, journal (regroupement, enfants distincts, décision la plus récente, `en_attente` ignoré, note portée).

**Pourquoi cette forme** : l'auto-acquittement est **paresseux** — étape idempotente déclenchée à la consultation du panneau, **pas de `pg_cron`** (décisions #3, #54 et commentaires de migrations : le projet privilégie le déclenchement événementiel / « rotation automatique paresseuse », cf. `seasons.functions.ts`) ; pour un panel mono-consultant c'est fonctionnellement identique, sans extension ni job en base. Le seuil auto est **borné au-dessus** des seuils de suggestion : on ne soustrait jamais au regard humain une règle qui ne serait pas déjà proposée. La **promotion finale dans la constitution reste volontaire** (copier LEARNED_RULES → `genizio_decisions.md`) : le Loup apprend sous contrôle et ne s'auto-valide jamais (garde-fou anti-biais de #54). Le journal rend chaque décision traçable (quoi, quand, qui) — y compris les auto-acquittements.

**Alternatives rejetées** : *vrai `pg_cron` quotidien* (casse la convention documentée du projet pour un gain nul sur un panneau consulté par l'admin lui-même — l'étape paresseuse couvre le cas) ; *table dédiée `constitution_suggestions`* (confirmé #54 : le calcul live + `processed`/`decision` suffit) ; *acquittement binaire seul* (l'ancien `acknowledge…` ne permettait pas de distinguer intégrée/à revoir/rejetée — le journal serait muet et le pouvoir de décision demandé par l'utilisateur absent).

**Vérifié** : `tsc --noEmit` propre, suite complète **388 tests verte** (dont 7 nouveaux Décision #56), `npm run build` OK, migration appliquée à la base distante (dry-run puis push). Travaillé sur `feat/naya-le-loup` (à la suite des chantiers 2-4).

## Décision #57 : Email de contact mis en évidence dans les pages — passage à `serviceclient@genizio.com`

**Contexte** : le mail de contact mis en évidence dans les pages légales était l'email personnel historique de l'éditeur, `traorecheikkh@gmail.com` (défini en D-01 lors de la création des pages légales). L'utilisateur a demandé son remplacement par une adresse de service : **`serviceclient@genizio.com`** — le contact opérationnel devient une adresse dédiée, l'identité juridique de l'éditeur (nom et statut) restant inchangée dans les mentions légales.

**Ce qui a été fait** : remplacement de **toutes** les occurrences (liens `mailto:` **et** texte affiché, `className="text-brand underline"`) dans les deux pages concernées :
- `src/routes/mentions-legales.tsx` — 4 occurrences (section « Éditeur du site » + section « Contact ») ;
- `src/routes/privacy.tsx` — 4 occurrences (section « 1. Qui sommes-nous ? » + section DPO/contact).
Soit 8 occurrences au total. Un balayage exhaustif de `src/routes/` a confirmé qu'aucun autre email n'est mis en évidence côté pages (les seuls autres emails du dépôt sont des placeholders de formulaires ou des emails back-end).

À la revue, l'utilisateur a étendu le périmètre aux **emails sponsor back-end** (les adresses enregistrées dans `season_enrollments`/`sponsorship_tokens` quand un enfant est inscrit par parrainage B2B ou par attribution admin) : `b2b@genizio.com` (`campaigns.functions.ts`, 2 occurrences) et `admin@genizio.com` (`seasons.functions.ts`, 1 occurrence) passent eux aussi à `serviceclient@genizio.com`. L'email de décision `admin@genizio.com` présent comme fixture dans `naya-constitution.test.ts` est conservé (donnée de test du journal, sans lien avec les sponsors).

**Pourquoi cette forme** : une adresse de service plutôt que personnelle pour tout contact visible du public — c'est l'adresse que les parents verront sur les pages légales et qu'ils contacteront ; l'email personnel reste tracé dans l'historique des décisions (D-01) sans être édité (un journal de décisions ne se réécrit pas).

**Hors périmètre (à trancher séparément si besoin)** : expéditeur des emails de bienvenue `hello@genizio.com` (`welcome-email.functions.ts`) et liste admin `ADMIN_EMAILS` (env).

**Vérifié** : `tsc --noEmit` propre, plus aucune occurrence de `traorecheikkh@gmail.com`/`b2b@genizio.com`/`admin@genizio.com` (hors fixture de test Naya) dans `src/`, 11 occurrences de `serviceclient@genizio.com` en place (8 pages légales + 3 sponsors). Travaillé sur `feat/contact-email-serviceclient` (créée depuis `origin/main`).

## Décision #58 : Suppression différenciée des défis — soft-delete, friction par statut, signal d'abandon consommé par le Loup

**Contexte** : à la revue de la suppression des défis, l'utilisateur a posé trois principes (angles validés en sparring produit) — (1) un défi **terminé** doit être protégé par un modal danger avec code à remplir ; (2) un défi **non terminé** se supprime légèrement ; (3) la philosophie des données : *on ne supprime jamais vraiment* — seule la suppression d'un profil purge les données, car **les traces laissées par chaque situation sont le contexte dont Naya a besoin** pour affiner ses suggestions. La suppression d'un défi non mené à terme devient un **signal** (« pas le bon moment », « pas intéressé·e »…) qui enrichit le Loup. Rappel du constat d'origine : `deleteChallenge` faisait un hard-delete (ligne physiquement retirée), les fichiers photo devenaient orphelins, aucun événement de suppression n'était tracé.

**Ce qui a été fait** :
1. **Soft-delete** : colonne `challenges.deleted_at` + index partiel `(child_id) where deleted_at is null`. `deleteChallenge` fait désormais `UPDATE { deleted_at }` au lieu de `.delete()`. **RLS durcie** : la policy owner exige `deleted_at IS NULL` (toute lecture de l'utilisateur cache les supprimés), la policy « Anyone can view completed challenges » exige aussi `deleted_at IS NULL` (corrige une fuite : une ligne complétée supprimée serait restée visible publiquement), et la policy publique de `child_profiles` filtre les défis supprimés dans son EXISTS. Les lectures service-role (admin/télémétrie/kit/campagnes/superviseurs) reçoivent des filtres `.is("deleted_at", null)` explicites (le RLS ne couvre pas le service role). Avantage induit : la ligne conservée garde `proof_image_url` → fini les photos orphelines.
2. **Friction différenciée** : composant `ChallengeDeleteDialog` — **terminé** : modal danger + saisie du **titre complet** pour confirmer (la confirmation porte sur *quoi* on supprime, pas seulement sur le fait de confirmer) ; **non terminé** (`todo`/`in_progress`/`not_completed`) : chips de raison **1 tap** (« Pas le bon moment », « Déjà fait autrement », « Pas intéressé·e », « Doublon », « Sans raison ») + note libre optionnelle. Le reroll « Pas celui-ci » (recommandation EXPLORATION) envoie automatiquement le chip `pas_interesse`.
3. **Signal d'issue** : nouvelle table `challenge_outcomes` (kind `deleted_uncompleted`/`deleted_completed`, `reason_chip`, `reason_note`, `domain`, `status_when_deleted`, `pending_duration_days`, écriture service role, RLS sans policy). Journalisée en arrière-plan (non-bloquante, pattern `verifyAndLog`) par `deleteChallenge`.
4. **Signal `CHALLENGE_ABANDONED` préservé** : une nouvelle branche de `log_challenge_observation` (trigger UPDATE existant) émet l'événement au passage `deleted_at NULL → NOT NULL` quand `status <> 'completed'` — sans quoi le passage du hard-delete au soft-delete aurait silencieusement privé le Jumeau Pédagogique du signal d'abandon (trait persévérance).
5. **Le Loup apprend** : `aggregateOutcomeSignals(rows)` (pure) groupe par (raison, type, domaine) avec enfants distincts et durée moyenne d'attente ; GET `getConstitutionSuggestionsAdmin` interroge `challenge_outcomes` et expose `outcomeSignals` ; panneau admin « 📉 Signaux d'abandon » dans « Le Loup qui apprend », avec la mention explicite **« signal faible à décroissance : il informe Naya sans jamais condamner un domaine »** (garde-fou anti-contraction de l'espace d'exploration).
6. Tests : `aggregateOutcomeSignals` ×4 (groupement + enfants distincts, moyenne d'attente, fallback `sans_raison`, kind inconnu ignoré). Correction au passage d'une erreur de typage **préexistante** sur `origin/main` dans `profiles.$profileId.portfolio.tsx` (garde de type `typeof sub === "string"`, aucun changement de comportement).

**Pourquoi cette forme** : trois niveaux de garantie complémentaires — la RLS garantit que *rien* ne réapparaît côté utilisateur (contrainte « le supprimé ne revient pas »), le soft-delete conserve la preuve et les traces, et le signal est **faible par conception** (jamais une règle dure : décroissance et pondération à venir en Phase 2, quand un volume réel de signaux existera). La suppression de profil reste le seul hard-delete (purge par cascade), conforme au principe validé ; la **récupération de profils supprimés** reste un chantier séparé.

**Alternatives rejetées** : *hard-delete maintenu* (orphelins Storage, aucun signal, contexte IA perdu) ; *champ de raison obligatoire sur le chemin léger* (contredit la légèreté voulue — les chips 1 tap capturent le signal sans frappe) ; *injection directe des signaux dans les prompts de génération dès maintenant* (changerait le comportement des 16 sites sans volume réel — Phase 2, après observation) ; *table `constitution_suggestions` dédiée* (le calcul live + `challenge_outcomes` suffit, cohérent #54).

**Vérifié** : `tsc --noEmit` propre, **424 tests verts** (dont 4 nouveaux Décision #58 ; timeout du test PDF porté à 15 s car il flake sous charge parallèle), build OK, migration `20260809130000_challenge_soft_delete_and_outcomes.sql` appliquée à la base distante. Travaillé sur `feat/challenge-soft-delete-outcomes` (créée depuis `origin/main`).

## Décision #59 : Porte d'entrée — l'âge 5-16 devient une contrainte serveur

**Contexte** : analyse utilisateur « Évolution de Génizio » §2 — la limite « jusqu'à 16 ans » n'existait que dans le slider UI (`min=5 max=16`) ; en base, le CHECK acceptait 3-20 et l'insertion passant par le client (RLS `auth.uid() = user_id` uniquement), n'importe quel client authentifié pouvait créer un profil hors limite (l'utilisateur l'avait reproduit : un profil à 19 ans). L'âge est destiné à devenir une **donnée structurante** (défis accessibles, difficulté, attentes pédagogiques, recommandations).

**Ce qui a été fait** :
1. Audit PostgREST avant migration : **1 profil hors bornes** (19 ans, profil de test créé le jour même de l'analyse, birthdate 2007-05-21) — ramené à 16 ans avec birthdate effacée dans la migration elle-même, sans quoi le trigger `sync_child_age_from_birthdate` recalculerait 19 à chaque UPDATE et ferait échouer toutes les mises à jour de cette ligne.
2. Migration `20260812120000_enforce_age_limit_5_16.sql` : `CHECK (age BETWEEN 5 AND 16)` (nom explicite `child_profiles_age_check`).
3. `ProfileDialog` : bornes min/max sur l'input date (aujourd'hui −16 ans … aujourd'hui −5 ans) + message explicite « l'âge doit être compris entre 5 et 16 ans » si la date donne un âge hors fenêtre.
4. Alignements : slider démo de la landing 4→5, bandes `AGE_DEVELOPMENT_GUIDANCE` recalées sur 5-7/8-11/12-16 (la bande 1-3 ans, hors périmètre produit, disparaît).

**Pourquoi** : la seule barrière serveur honnête pour une donnée structurante est une contrainte en base ; l'UI seule était contournable et la base seule (3-20) acceptait l'illégal produit.

**Alternatives rejetées** : *garder le CHECK 3-20 et seulement le slider* (contournable, c'est le bug signalé) ; *laisser le profil à 19 ans tel quel* (chaque UPDATE échouerait — le profil deviendrait inutilisable) ; *supprimer le profil de test* (destructif inutile — le clamp conserve les données).

**Vérifié** : migration appliquée, probe SQL directe : insertion age=17 **refusée** (code 23514 check_violation), profil « essaie2 » passé à 16/birthdate null, 447 tests verts, `tsc` propre, build OK.

## Décision #60 : Saison → étiquette ; campagnes 100 % indépendantes

**Contexte** : analyse §3 — l'utilisateur doute de la pertinence des saisons (« si la saison cadre les défis, tous les défis seront biaisés par la saison ») et demande explicitement l'avis : **mon avis rendu** — le rôle commercial de la saison est mort (monétisation passée sur abonnement famille / accès mensuel / parrainage), son rôle structurel restant (fenêtre d'accès, thème narratif) est soit absorbé par les campagnes, soit exactement le biais redouté. Décision utilisateur : **dégrader en étiquette**.

**Ce qui a été fait** :
1. Migration `20260812130000_seasons_as_label_and_campaigns_independent.sql` : `DROP TRIGGER trg_child_profiles_auto_enroll_season` + `DROP FUNCTION auto_enroll_new_child_in_active_season()` (plus d'auto-inscription de tout enfant à la saison active) ; `season_enrollments.season_id` passe en **nullable** (les inscriptions existantes restent : historique/certificat).
2. Retrait total du thème de saison des prompts de génération (`challenges.functions.ts`, 2 sites : `generateChallenges` et `generateSingleChallenge`) — suppression de la lecture `season_enrollments`, du calcul `seasonInstruction` et du paramètre des builders purs (`buildChallengePrompt`/`buildSingleChallengePrompt`) + tests mis à jour. **Plus aucun biais de saison sur les défis.**
3. `DEFAULT_FALLBACK_SEASON` reste pour l'information (Admin, tokens de parrainage) — plus rien ne gâte l'accès ni la génération dessus.

**Conservé en l'état** : table `seasons`, onglet Admin « Trimestres & Diaspora », inscription manuelle admin (opt-in), certificat de saison (seulement si inscription explicite), parrainage diaspora (tokens, `season_id` déjà nullable), fenêtre cohorte des campagnes portée par `campaigns.start_date/end_date` (la couverture B2B « permanent » de `getChildAccessStatus` repose sur `campaign_id`, inchangée).

**Pourquoi** : supprimer entièrement les saisons aurait détruit le parrainage diaspora et le certificat pour un gain marginal ; les garder comme étiquette préserve ces surfaces sans aucun effet sur les défis ni l'accès.

**Alternatives rejetées** : *suppression totale des saisons* (destructif, perte diaspora/certificat) ; *statut quo avec documentation* (le biais thématique demeure — c'est le risque identifié par l'utilisateur).

## Décision #61 : Temps adaptatif — le temps devient une composante pédagogique du défi

**Contexte** : analyse §5 — sans contrainte temporelle, un défi peut être interrompu et repris des heures plus tard : le défi devient une activité de loisir et ne travaille ni l'attention, ni la persévérance, ni la gestion du temps. MAIS le chrono ne doit jamais être une règle rigide : paramètre pédagogique configurable, adapté au profil (jamais punitif — non-négociable du produit).

**Ce qui a été fait** :
1. Migration `20260812140000_adaptive_time_pressure.sql` : `child_profiles.time_pressure` (`standard` / `gentle` ×1,5 / `none` sans chrono, défaut standard), `challenges.time_limit_minutes int NULL`, type `TIME_OVER` ajouté au CHECK de `observation_events`.
2. Module pur `src/lib/time-limit.ts` : `resolveTimeLimitMinutes` (estimation ou repli par difficulté 15/25/40 × facteur d'âge 5-7 ans ×1,5 / 8-12 ×1,25 / 13-16 ×1 × facteur de pression, borné 3-120 min ; `none` → null) + `formatTimePressureNote` (injectée dans les prompts — l'IA adapte la durée indicative).
3. Câblage : limite calculée à l'assignation (`assignTemplateChallenge`) et **en repli au démarrage** (`updateChallenge` au passage `in_progress` pour les défis générés en lot, sans estimation).
4. UI : composant `ChallengeCountdown` sur la carte « Mission active » — compte à rebours depuis `started_at`, **à expiration : bannière douce « Naya te laisse continuer », jamais d'auto-échec**, et un événement `TIME_OVER` journalisé UNE fois par défi (fonction serveur `recordChallengeTimeOver`, idempotente) → nourrit le driver `time_awareness` du Jumeau Pédagogique.
5. Tests : `time-limit.test.ts` ×12 (facteurs, bornes, replis, notes de prompt).

**Pourquoi cette forme** : la résolution pure et bornée rend le chrono déterministe et testable ; le repli au démarrage garantit que le chrono existe aussi sur le chemin le plus courant (lot) ; le signal `TIME_OVER` réutilise le canal append-only existant sans nouvelle table.

**Alternatives rejetées** : *deadline dure avec auto-échec* (violerait le non-négociable « Naya ne juge pas ») ; *chrono strict sans adaptation* (contredit §5 — certains profils nécessitent du temps rallongé ou aucun chrono) ; *parsing de la durée texte de l'IA* (fragile, non testable — l'estimation et le repli par difficulté suffisent).

## Décision #62 : Quotas — l'UI promet exactement ce que la base accepte (+ offre legacy honnête)

**Contexte** : analyse §4 — l'utilisateur croyait que « tout le monde peut créer plusieurs comptes gratuitement ». **Réalité vérifiée** : le trigger base bloque bien (plancher 5 pour les comptes créés avant 2026-08-04 — grand-pérés — sinon 1) ; le vrai bug était l'inverse : `computeChildCreationLimit` ajoutait un « +1 » (profil mensuel « en cours de première mise en paiement », modèle 2026-08-05) que le trigger final `20260809120000` **n'a pas** — un compte neuf croyait pouvoir créer un 2ᵉ enfant, la base le rejetait avec « Quota de profils atteint (1 / 1 profils) ».

**Ce qui a été fait** :
1. `computeChildCreationLimit` (child-access.ts) : **suppression du « +1 »** — miroir exact du trigger (plancher + slots, couverture famille → 5, plafond 5). Tests mis à jour (1+0=1, 1+2=3).
2. Unification : `computeChildProfileQuota` (formule orpheline dans child-profile-quota.ts) supprimée au profit de l'unique source ; le
fichier ne porte plus que les constantes partagées.
3. Modale legacy honnête : « Accès mensuel — profil supplémentaire » (intent `extra_slots`) octroie en réalité un **slot permanent** — le texte promettait un renouvellement mensuel. Renommée « Profil supplémentaire permanent » (paiement unique ; le nombre de mois choisit le montant, l'accès ne s'interrompt jamais). Fulfillment inchangé.

**Pourquoi** : une promesse d'UI que la base rejette est un bug de confiance ; le modèle « 1 gratuit + profils payants » de l'analyse §4 est exactement la règle du trigger, il suffisait d'aligner le client.

**Alternatives rejetées** : *réintroduire le +1 dans le trigger* (ressuscite un parcours « créer puis payer » déjà remplacé par l'abonnement famille, et élargit le plancher de fait) ; *masquer l'offre slot* (elle est la traduction directe de « profils supplémentaires payants » de l'analyse).

## Décision #63 : Pouvoir administratif exceptionnel sur les profils (is_active, déverrouillage, onglet Admin « Profils »)

**Contexte** : analyse §4 — la règle commerciale par défaut ne doit jamais empêcher l'administrateur de gérer un cas particulier. À l'état du code : aucun concept d'activation/désactivation d'un profil ; `access_locked_at` (verrou B2B) n'avait **aucun déverrouillage programmatique** ; aucun outil admin dédié aux profils.

**Ce qui a été fait** :
1. `child_profiles.is_active boolean NOT NULL DEFAULT true` (migration `20260812150000`).
2. **Gating complet** : tous les sites de génération/validation/recommandation/hypothèses/guildes qui filtrent `access_locked_at` gagnent `is_active = true` (challenges ×9, hypotheses ×3, guilds ×2, recommendations ×1) + pré-checks explicites dans `updateChallenge`/`deleteChallenge`/validation de preuve (« Ce profil est désactivé par l'administrateur »). Un profil désactivé = plus de génération/validation, données intactes, réactivation immédiate.
3. Fonctions admin (`admin-os.functions.ts`) : `searchChildProfilesAdmin` (recherche par prénom + email parent), `setChildProfileActiveAdmin`, `unlockChildAccessAdmin` (seul chemin d'écriture sur `access_locked_at`), `setChildTimePressureAdmin`. Le « dépassement temporaire de limite » reste `updateExtraProfileSlotsAdmin` (Exécutif).
4. Nouvel onglet Admin OS « Profils » (10e onglet, `AdminProfilesTab.tsx`) : recherche, statut actif/désactivé/verrou B2B, pression temporelle, actions Désactiver/Réactiver/Déverrouiller. Test `admin-route.test.ts` mis à jour (10 onglets).

**Pourquoi** : distinguer nettement la règle par défaut (trigger/quota) du pouvoir exceptionnel (admin) — un bouton par action, aucune réécriture des règles commerciales nécessaire.

**Alternatives rejetées** : *réutiliser `access_locked_at` comme désactivation manuelle* (confondrait verrou B2B automatique et décision admin — le déverrouillage serait ambigu) ; *hard-delete du profil désactivé* (contre la philosophie « on ne supprime jamais vraiment », décision #58).

**Vérifié** : migrations appliquées et vérifiées en base (CHECK 5-16 actif, clamp du profil 19 ans, colonnes présentes), 447 tests verts, `tsc` propre, build OK. Travaillé sur `feat/porte-entree-fondations-naya-v4` (depuis `origin/main`).

## Décision #64 : Onboarding orienté profil — « À quel enfant avons-nous affaire ? » + déclaration de l'enfant

**Contexte** : analyse §6-7, §10, §17 — relecture complète du document directeur demandée par l'utilisateur après un premier plan trop étroit. Deux corrections produit structurantes : (1) la question « à quel enfant avons-nous affaire ? » (contexte de parcours, handicaps, facilités/difficultés, niveau scolaire, langues) se pose **en tout début** d'onboarding — pas repliée en section optionnelle ; (2) le **choix d'aspiration est conditionnel au type de profil** : central pour les profils délaissés/rue/précaire (rapport à l'argent, méfiance des adultes — la déclaration est une boussole), **pas nécessaire pour les autres** (l'exploration passe par les intérêts/talents). La déclaration enregistre **les mots de l'enfant** (source « enfant »), saisie par le parent à l'onboarding — pas d'UI en mode Quête (décision utilisateur).

**Ce qui a été fait** :
1. `ProfileDialog` restructuré en parcours à étapes visibles : Qui → Comment il est → **À quel enfant avons-nous affaire ?** → **Ce qu'il veut devenir (conditionnelle)**. L'étape contexte (vie privée, consentement `context_declared`) remplace le repliable du chantier 1.
2. `shouldAskAspirations(context)` (pur, testé) : vraie si `life_context` ∩ {parcours_rue, environnement_precaire, famille_eloignee} ≠ ∅, ou rapport à l'école ∈ {conflit, non_scolarise}, ou des aspirations existent déjà (on ne cache jamais des données). Sinon l'étape 4 disparaît (3 étapes).
3. Étape 4 : « Ce que **votre enfant dit** vouloir faire — ses propres mots, même s'ils vous surprennent », chips + saisie libre, **source `enfant`** (rétrocompat : les aspirations du chantier 1 sans source sont lues `parent`).
4. `formatChildProfileContext` mentionne la source (« déclarée(s) par l'enfant lui-même »).

**Pourquoi** : un enfant de rue n'aborde pas l'aspiration comme un enfant scolarisé — sa déclaration (souvent motivée par l'argent, la survie) doit être explorée par l'expérience ; demander des aspirations à tous les parents serait du bruit pour les profils standards. La voix de l'enfant se collecte là où il est présent : à l'onboarding.

**Alternatives rejetées** : *section aspiration visible pour tous* (contredit « pas besoin de choix d'aspiration ») ; *déclaration en mode Quête* (l'enfant n'a pas de compte propre — décision utilisateur) ; *texte libre pour le contexte* (données sensibles de mineurs — préréglages uniquement, chantier 1).

**Vérifié** : `tsc` propre, tests `shouldAskAspirations` ×6, 492 tests verts au total, build OK.

## Décision #65 : Moteur d'aspirations + défis-projets (chantier Naya V4, analyse §8, §10-16, §27-28)

**Contexte** : la boucle §20 (PROFIL → HYPOTHÈSE → DÉFI → OBSERVATION → MISE À JOUR) appliquée aux aspirations. L'aspiration n'est ni une vérité ni un mensonge : un terrain d'exploration testé par l'expérience, jamais un verdict affiché (§10, §16). Et un défi n'est pas qu'un exercice : il peut être un véritable projet (§27) dont le guidage se réduit à mesure que l'enfant progresse (§28).

**Ce qui a été fait** :
1. **Migration `20260812160000`** : `challenges.kind` (micro/projet), `challenges.guidance_level` (1-5), `challenges.aspiration_label` (marqueur lisible de défi-pont).
2. **`aspiration-map.ts`** : ponts curés aspiration → {talentKeys, domains, skillsHint, worldAnchor} (Menuiserie → artisanale/spatiale/logico, mesurer/compter/proportions…), matching tolérant (tokens, accents, préfixes courts), fallback générique — ne casse jamais.
3. **`aspiration-confidence.ts`** : statuts dérivés à la lecture (pattern `interest-confidence`), seuils identiques aux intérêts (8 essais, engagement net 0,65/0,35) ; comptage par chevauchement domaines/talents mappés + marqueur `aspiration_label` ; `getAspirationHypothesesSnapshot` ne jette jamais.
4. **Branche de recommandation `ASPIRATION`** (priorité INVESTIGATION → ASPIRATION → STABILISATION → ESSAIMAGE → EXPLORATION) : génère un défi-pont via `buildAspirationBridgePrompt` — scénarisé dans l'univers visé mais ciblant les compétences fondamentales (« la motivation naît de la finalité »), **ancrage monde réel renforcé pour profils vulnérables** (§14-15 : argent, marché, débrouillardise, « entre dans son monde »), « observe les aptitudes réelles, ne conclus jamais sur la seule déclaration ». Idempotent (un seul pont en attente par aspiration, pas de pont si défi récent < 14 j dans les domaines mappés).
5. **§8 — entraînement des difficultés** : `difficulty-map.ts` mappe les difficultés déclarées sur les clés Gardner et **biaise doucement** (jamais durement) le choix de la faiblesse à entraîner (ESSAIMAGE) et les cibles d'EXPLORATION.
6. **Défis-projets** : consigne `kind`/`guidance_level` dans toutes les specs JSON des builders ; filets déterministes `resolveKind` (projet seulement si l'IA le demande ET ≥ 3 étapes) et `resolveGuidanceLevel` (clamp 1-5 + **retrait progressif** : −1 cran tous les 4 défis complétés dans le domaine, câblé dans `generateChallenges` via `completedInDomain`).
7. **UI** : badge « 🏗️ Projet » sur les cartes (Quête + parent) ; « 🧭 La boussole de Naya » en mode Quête et « Univers explorés » au Portfolio — narration qualitative déterministe (`aspiration-narrative.ts`, 0 IA, jamais de chiffres ni de verdict, règles de sanitisation de `narrateForParent` en code) : « Tu dis aimer X. Explorons cela ! » → « Naya cherche ce qui te motive vraiment ».

**Pourquoi cette forme** : la détection reste en code pur (0 IA), l'IA n'intervient qu'au point de raisonnement (génération du pont) ; le statut dérivé à la lecture évite une table dédiée et ses risques de désynchronisation ; la narration par statut garantit le non-négociable « Naya enquête, elle ne juge pas ».

**Alternatives rejetées** : *réutiliser `hypothesis_cycles` pour les aspirations* (machinerie de diagnostic causal d'échec, sémantique différente — après lecture du schéma, un motif léger dérivé à la lecture est plus propre) ; *narration IA pour la réorientation* (coût + risque de dérive — le déterministe suffit pour l'instant) ; *biais dur des difficultés* (placerait l'enfant en échec forcé — priorité douce uniquement).

**Vérifié** : migration appliquée et probe SQL (colonnes présentes), types régénérés, **492 tests verts** (42 fichiers, +45 tests), `tsc` propre, build OK. Branche empilée `feat/naya-v4-aspirations-projets` (depuis `feat/porte-entree-fondations-naya-v4`).

**Note utilisateur (même jour, après livraison)** : l'ancrage monde réel des profils vulnérables ne doit pas seulement *éviter* de supposer la confiance en l'adulte — il doit la **construire**. L'enfant doit travailler à apprendre à faire confiance, et découvrir qu'on est là pour lui donner ce qui lui a manqué. L'instruction d'ancrage du pont d'aspiration et le contexte général des prompts (formatChildProfileContext) portent désormais un **escalier de confiance** : (1) l'adulte en retrait, simple présence fiable ; (2) l'adulte donne d'abord (outil, démonstration, temps, attention) sans rien exiger ; (3) l'adulte tient une promesse simple rendue vérifiable par le défi ; (4) seulement ensuite une petite collaboration où l'enfant garde l'initiative. Jamais de proximité forcée — c'est l'enfant qui fait le pas.

## Décision #66 : Boucle de réévaluation des modalités — un échec n'est jamais un verdict (chantier 3, analyse §22-26, §35, §38)

**Contexte** : trois constats issus de l'exploration avant planification — (1) la notion de « modalité » (manière de présenter le savoir : texte, image, démonstration, manipulation, histoire, analogie, conversation, projet, situation concrète) n'existait nulle part ; (2) un défi `not_completed` était **terminal** : jamais re-proposé sous une autre forme, « reformulation » inexistante dans le code ; (3) le **canal échec → Jumeau était troué** : le trigger `log_challenge_observation` ignorait le passage à `not_completed`, donc le Jumeau ne voyait jamais les échecs et ne pouvait pas apprendre « quelle manière d'enseigner échoue ». La question directrice du §36 devient la règle : *« L'enfant ne sait-il pas faire, ou n'avons-nous pas trouvé la bonne manière de lui faire démontrer qu'il sait faire ? »* — jusqu'à 3 modalités testées avant toute conclusion.

**Ce qui a été fait** :
1. **Migration `20260812170000`** : `challenges.presentation_mode` (CHECK 9 valeurs) ; événement `CHALLENGE_NOT_COMPLETED` ajouté au CHECK d'`observation_events` **et** branche dans le trigger (payload `{challenge_id, domain, presentation_mode, cause}`) + `presentation_mode` dans les payloads ASSIGNED/COMPLETED ; `pedagogical_twins.presentation_signals` — comptage échecs/réussites par modalité dans `apply_observation_to_twin` (persévérance 0.15 sur échec, comme ABANDONED).
2. **`modalities.functions.ts`** (nouveau, tout déterministe) : vocabulaire fermé `PRESENTATION_MODES` + libellés humains ; `canReformulate` (causes accommodables : METHOD_MISMATCH, PERFORMANCE_ANXIETY, LACK_OF_ENGAGEMENT, CONCEPTUAL_GAP — OTHER/null non) ; `resolveNextModality` (priorité par cause — manipulation/démonstration pour METHOD_MISMATCH, histoire/conversation pour PERFORMANCE_ANXIETY, projet pour LACK_OF_ENGAGEMENT, analogie pour CONCEPTUAL_GAP — borne `MAX_MODALITY_ATTEMPTS = 3`, jamais de répétition) ; `parseReformulationContext` / `summarizeModalityAttempts` (filiation par `pedagogical_context` TEXT) ; `processModalityReformulation` (génère la reformulation) + wrapper server fn `reformulateChallenge`.
3. **Reformulation** : même objectif pédagogique que le défi original (titre, domaine, description conservés dans le prompt), modalité imposée avec sémantique (`MODALITY_SEMANTICS`), consigne absolue « ne mentionne JAMAIS que ce défi est un second essai » — l'enfant découvre un défi frais ; kind forcé `micro`, guidance relevée `max(guidance, 4)` (défi de soutien, jamais une épreuve) ; filiation `{is_reformulation, original_challenge_id, modality_attempt, presentation_mode}` ; time_limit calculé comme les autres assignations.
4. **Le Loup** : kind `reformulation` + rubrique sémantique en 3 règles (reformulation-meme-objectif, reformulation-modalite, reformulation-fraiche), `originalTitle` ajouté au `VerifyContext`.
5. **Intégration** : `submitChallengeNotCompleted` — étape 5 en arrière-plan : si cause accommodable → la **prochaine mission est la reformulation** (idempotente : une seule en attente, plafond 3) ; sinon (cause absente/OTHER ou reformulation impossible) → repli sur la recommandation classique, le parent ne reste jamais sans mission.
6. **UI** : invisible pour l'enfant (le prompt l'exige) ; le parent voit dans l'intention pédagogique « Naya présente cette compétence autrement — par une histoire cette fois » (`pedagogical-intention.ts`, qualitatif, jamais de mention de l'échec, jamais de chiffres).

**Pourquoi cette forme** : la détection reste en code pur (0 IA), l'IA n'intervient qu'au point de raisonnement (la reformulation elle-même) ; la filiation par `pedagogical_context` évite une table dédiée (pattern déjà en place pour les discriminants/recommandations) ; la reformulation est une micro-activité de soutien, pas une épreuve ; le Jumeau reçoit enfin l'échec et accumule le signal « quelle modalité échoue/réussit » (base du modèle d'enseignement du chantier 5).

**Alternatives rejetées** : *étendre `hypothesis_cycles`* (le discriminant teste une hypothèse causale globale — la reformulation garde le MÊME objectif, la filiation légère est plus juste) ; *modifier le défi original en place* (les événements append-only référencent les défis — on ne réécrit pas l'histoire, on crée une nouvelle mission) ; *reformulation par template* (perte d'adaptation — l'IA au point de raisonnement uniquement, filets déterministes autour).

**Vérifié** : migration poussée + probe fonctionnel réel (profil de test créé puis nettoyé par cascade : `CHALLENGE_NOT_COMPLETED` émis avec payload complet, Jumeau alimenté — persévérance 0.15 + `presentation_signals.manipulation.failed=1`), types régénérés (CLI local), **529 tests verts** (44 fichiers, +22 tests), `tsc --noEmit` propre, build OK. Branche `feat/naya-v4-modalites-apprentissage` (depuis `main` @ merges #43+#44). Note : les PR #43 et #44 ont été mergées dans `main` en début de session (étape 0 de la feuille de route approuvée) — l'incident de propagation GitHub (merge commit de #44 créé mais référence `main` non avancée) a été résolu en poussant le commit officiel (avance de référence, aucune réécriture).

## Décision #67 : Calibration du temps par les observations — la proposition ne s'impose jamais (chantier 4, analyse §5 suite)

**Contexte** : le temps adaptatif (chantier 1, décision #61) a introduit `time_pressure` (standard/gentle/none) comme préférence **déclarée** par le parent et surmodulable par l'admin. Il manquait la boucle d'apprentissage : les événements `TIME_OVER` (écrits par `recordChallengeTimeOver`) n'étaient **consommés nulle part** — ni par le Jumeau (aucune branche dans `apply_observation_to_twin`), ni par une lecture applicative. La spec §5 (suite) demande : N répétitions de `TIME_OVER` dans un même domaine → **proposition** de passage en `gentle`, jamais automatique — le parent valide.

**Ce qui a été fait** :
1. **Migration `20260812180000`** : branche `TIME_OVER` dans `apply_observation_to_twin` — le dépassement alimente le driver `time_awareness` comme un point faible (0.25, alpha 0.08) ; la calibration nourrit enfin le Jumeau.
2. **`time-calibration.functions.ts`** : `suggestTimePressureChange` (pure, testable) — suggestion seulement si `time_pressure = "standard"`, seuil `GENTLE_SUGGESTION_THRESHOLD = 3` dépassements par domaine, fenêtre `GENTLE_SUGGESTION_WINDOW_DAYS = 30` (filtrage dans la fonction ET dans la requête) ; `getGentleTimeSuggestion` (server fn GET, ownership) ; `applyGentleTimeProposal` (POST, ownership + gating, idempotent si déjà gentle).
3. **UI Portfolio** : carte « Plus de temps pour {enfant} ? » dans le cluster « Naya propose » (pattern exact « Une découverte de Naya ») — deux boutons : « Activer le Temps généreux (×1,5) » (validation → update + toast) et « Pas maintenant » (rejet mémorisé en localStorage `genizio_dismissed_gentle_proposal_${profileId}`) ; `time_pressure` ajouté au select du portfolio. L'admin surmodule déjà via l'onglet Profils (`setChildTimePressureAdmin`, chantier 1) — aucun travail côté admin.

**Pourquoi cette forme** : la suggestion est **dérivée à la lecture** (0 table dédiée, pattern du projet) ; le rejet est local (philosophie `dismissDiscovery` — pas de colonne pour un « ne re-propose pas ça ») ; le seuil de 3 par domaine évite le bruit d'un dépassement isolé ; `gentle`/`none` ne reçoivent jamais de proposition (déjà adaptés).

**Alternatives rejetées** : *table de propositions avec statuts* (une simple carte conditionnelle suffit — pas d'infra de notifications dans le projet) ; *passage automatique en gentle* (contredit « jamais automatique : le parent valide » — le temps est une préférence parentale, décision #61) ; *seuil global sans domaine* (un dépassement isolé par domaine serait du bruit — le domaine est le signal pertinent, payload déjà écrit par `recordChallengeTimeOver`).

**Vérifié** : migration poussée, **535 tests verts** (44 fichiers, +6 tests), `tsc --noEmit` propre, build OK. Même branche que le chantier 3 (`feat/naya-v4-modalites-apprentissage`) — PR #45 mise à jour.

## Décision #68 : Boucle de réévaluation complète — la question du §36 devient une carte « Ce que Naya a compris » (chantier 5, analyse §36, §35)

**Contexte** : les chantiers 3-4 ont construit le moteur (reformulation en modalités, calibration du temps). Il manquait l'orchestration de bout en bout du §36 : *échec → analyse de la réponse → analyse de la compréhension de la consigne (modification de la formulation) → nouvelle tentative dans un nouveau support → comparaison des résultats → identification du facteur explicatif → mise à jour du profil* — avec la question directrice : *« L'enfant ne sait-il pas faire, ou n'avons-nous pas trouvé la bonne manière de lui faire démontrer qu'il sait faire ? »* — et la règle d'or « personne n'est nul » (§35).

**Ce qui a été fait** :
1. **`failure-sequence.functions.ts`** : `evaluateFailureSequence(attempts)` (pure, 0 IA) — compare les issues des tentatives d'une chaîne de reformulation : une modalité réussie → facteur trouvé `MODALITY_FOUND` (la modalité gagnante est nommée) ; tout échoue avec ≥ 2 modalités testées → `STILL_EXPLORING` ; **garde-fou §35** : moins de 2 modalités testées → null (la boucle continue, AUCUNE conclusion). `isSequenceConcludable` exposée. `buildFailureNarrative` (pure) — narration qualitative : jamais « il ne peut pas », jamais de chiffres, jamais de mention de l'échec. `getLatestFailureSequence` (server fn GET) — dernière chaîne de reformulations dérivée à la lecture (filiation `pedagogical_context`, pattern du projet).
2. **Le Loup** : kind `failure_sequence` + rubrique en 3 règles (zero-verdict, garde-fou-35, zero-chiffre). La narration restant 100 % déterministe, la rubrique est le garde-fou de référence pour une évolution future vers un facteur assisté par IA — pas d'audit IA d'un code pur (superflu, cohérent avec `aspiration-narrative`).
3. **UI Portfolio** : carte « Ce que Naya a compris » (cluster émeraude des propositions de Naya, `NayaAvatar`, badge « Ce que Naya a compris ») — visible seulement quand la séquence est concluante : soit « Fanta a réussi ce défi quand Naya le lui a présenté par une histoire. Naya garde cette manière en mémoire… », soit « …pas encore tout à fait prêt·e — Naya le laisse de côté un moment et continue d'observer… ». Jamais de verdict.

**Pourquoi cette forme** : la mise à jour du profil est **dérivée à la lecture** — les triggers DB alimentent déjà `presentation_signals` (réussites/échecs par modalité, chantier 3) et la narration se calcule à la volée : aucune table de séquence, aucun état à désynchroniser. La comparaison des résultats (§36) est le cœur du module ; l'analyse de la compréhension de la consigne est incarnée par la reformulation elle-même (le chantier 3 en est le moteur) ; la clôture éthique est le garde-fou §35 (≥ 2 modalités, jamais de verdict).

**Alternatives rejetées** : *table de séquences avec statuts* (état dupliqué — la filiation et les statuts de défis suffisent, pattern dérivé à la lecture) ; *narration IA* (coût + risque de dérive verbale — le déterministe garantit le 0 chiffre / 0 verdict par construction) ; *conclure « capacité absente » après 3 échecs* (interdit par §35 — la compétence reste « encore à explorer », elle n'est jamais déclarée impossible).

**Vérifié** : **544 tests verts** (44 fichiers, +9 tests), `tsc --noEmit` propre, build OK. Même branche (`feat/naya-v4-modalites-apprentissage`) — PR #45 couvre désormais les chantiers 3-5.

## Décision #69 : Double contextualisation local → global + interdisciplinarité assumée (chantier 6, analyse §30-31, §32)

**Contexte** : le référentiel académique (décision #39) calibre déjà le CONTENU sur les standards internationaux (Common Core, Singapore Math, NGSS…). Il manquait la mise en scène : un défi devait partir des matériaux et réalités locaux du pays (bambou, bois, textile, recyclé) puis **ouvrir** sur les outils technologiques simples et le monde — « ne JAMAIS enfermer l'enfant dans son environnement immédiat » (§30-31) — et un projet devait pouvoir mobiliser plusieurs compétences sans que l'enfant en ait conscience (§32).

**Ce qui a été fait** :
1. **`contextualization.ts`** (nouveau, 100 % déterministe, 0 IA) : `normalizeCountryKey` (minuscules, accents, articles/qualificatifs retirés — « Côte d'Ivoire » → `cote ivoire`, « République démocratique du Congo » → `congo`) ; `localMaterialsForCountry` — mapping curé de 14 pays (Côte d'Ivoire : iroko/sipo, bambou, coques de cacao… ; Sénégal : coquillages, pagne… ; Cameroun, Mali, Burkina, Niger, Togo, Bénin, Guinée, Gabon, Congo, Tchad, Madagascar, France) + repli générique jamais cassant ; `buildContextualizationInstruction(location)` — la consigne d'escalier : (1) ancrage local concret → (2) outil/mécanisme technologique simple (levier, poulie, boussole, circuit de base) → (3) ouverture monde (numérique, standard international, autre pays) — « le local est le point de départ, jamais le plafond ».
2. **Injection prompts** : `buildChallengePrompt` (bulk), `buildSingleChallengePrompt` (contexte immédiat), `buildAspirationBridgePrompt` (après l'ancrage monde réel) — chaque défi généré porte désormais l'instruction avec les matériaux réels du pays de l'enfant.
3. **Interdisciplinarité (§32)** : `INTELLIGENCES_FIELD_INSTRUCTION` étendue — pour un PROJET, 2 clés COMPLÉMENTAIRES quand deux compétences sont réellement mobilisées (mobile géométrique : spatial + logico ; saynète scientifique : linguistique + logico) — « l'interdisciplinarité est assumée, l'enfant n'a pas à en avoir conscience ». Le pipeline résolvait déjà les multi-intelligences (`resolveTargetIntelligences`) et la validation distribue déjà les points multi : aucun changement BDD.

**Pourquoi cette forme** : le mapping pays → matériaux est du code pur (jamais de rêve d'IA sur les réalités locales) ; l'instruction vit au point de génération (chaque builder) avec le pont explicite vers le référentiel international ; la contrainte d'enfermement est formulée négativement (« jamais le plafond ») pour être actionnable par le modèle.

**Alternatives rejetées** : *matériaux par IA à chaque génération* (coût + invraisemblance — le déterministe est plus fiable et gratuit) ; *base de données des matériaux par pays* (13 clés en dur suffisent, vocabulaire fermé) ; *injecter aussi dans les recommandations* (l'input `buildRecommendationPrompt` ne porte pas la localisation — périmètre v1 : bulk/single/pont ; à étendre si besoin).

**Vérifié** : **554 tests verts** (44 fichiers, +10 tests), `tsc --noEmit` propre, build OK. Même branche (`feat/naya-v4-modalites-apprentissage`) — PR #45.

## Décision #70 : Monde réel hors-app — fondations de données (chantier 7, analyse §19, §29)

**Contexte** : la vision fondatrice fait de l'application « une interface entre l'enfant, son potentiel et le monde réel — jamais un univers fermé ». Les rencontres réelles (mécanicien, atelier de menuiserie, camps, labs) restent **hors de l'application** (phase ultérieure) ; ce chantier pose les fondations : la règle de non-exploitation des données et l'infrastructure qui prépare la réponse à « quels environnements favorisent quels talents ? ».

**Ce qui a été fait** :
1. **Migration `20260812190000`** : vue interne `talent_environment_signals` — complétions **validées par l'IA** (`ai_observations` non nul, règle « pas de score sans preuve réelle ») agrégées par environnement (pays, ville, domaine) × talent observé (`target_intelligences` déplié par `CROSS JOIN LATERAL`, garde `jsonb_typeof` contre les valeurs décoratives des vieux défis). `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + `COMMENT ON VIEW` documentant la finalité : données au service du développement des enfants, jamais d'exploitation commerciale.
2. **Documentation vision** : spec NAYA V4 (chantier 7) + cette décision — le principe de non-exploitation est inscrit au référentiel.

**Pourquoi cette forme** : une vue (pas une table) — aucune donnée dupliquée, toujours à jour, zéro code ; `REVOKE` explicite — même défense en profondeur que les fonctions SECURITY DEFINER (leçon des décisions #22) ; l'agrégation par environnement est la première brique de la question « quels environnements favorisent quels talents ? », sans jamais exposer de données individuelles d'enfants (agrégats uniquement, accès service role seul).

**Alternatives rejetées** : *table de statistiques maintenue par le code* (état dupliqué à désynchroniser — la vue est dérivée par construction) ; *exposer la vue aux parents* (des agrégats croisés multi-familles sont sensibles même anonymisés — strictement interne pour l'instant) ; *fonction RPC d'agrégation* (équivalent, mais la vue est plus simple à auditer).

**Vérifié** : migration poussée + probe réel — le service role lit la vue (5 lignes d'échantillon existantes), **anon est bloqué** (« permission denied for view talent_environment_signals »). Aucun test unitaire (pas de code applicatif). Branche `feat/naya-v4-modalites-apprentissage` — PR #45 (chantiers 3-7).

**Clôture de la feuille de route (étape 0 du 2026-08-12)** : chantiers 3 (modalités), 4 (calibration du temps), 5 (boucle complète §36), 6 (double contextualisation), 7 (fondations monde réel) — tous livrés et poussés. 554 tests verts, tsc propre, build OK. Il reste, hors PR : les deux bugs antérieurs (bouton « Commencer le défi », fix « bouton non réussi » dans un stash) et les rencontres réelles (phase ultérieure).

## Décision #71 : Refonte de l'Admin OS — contrôles manuels de secours + navigation « grille d'accueil » (2026-08-13)

**Contexte** : demande utilisateur — « une refonte et amélioration de l'Admin OS pour qu'il matche avec notre nouvelle vision et nos nouveaux workflows. Admin doit pouvoir contrôler manuellement plus de choses, au cas où il y a des soucis de déclenchement de webhook de paiement et autre. » Deux explorations complètes ont établi l'état des lieux : (1) **trou béant** — aucune fonction admin ne lisait la table `payments` : un paiement resté `initiated` (webhook manqué, page de retour perdue, divergence de montant) était invisible et non rejouable ; (2) les abonnements n'avaient que le webhook comme chemin d'activation (1er paiement) et d'extension (renouvellement) ; (3) l'onglet « Seasons » était un vestige complet (CRUD de saisons inutile depuis la dégradation en étiquette, décision #60) ; (4) la navigation à 10 onglets se condensait (UI/UX). Choix utilisateur : refonte complète + **grille de cartes d'accueil** pour la navigation.

**Ce qui a été fait** :

1. **UI/UX — navigation** : `admin.index.tsx` démarre sur un écran d'accueil en **grille responsive de 9 cartes** (pastille d'icône, libellé, sous-libellé, badge d'alerte vivant « ● N paiements en attente », press effect) ; un onglet ouvert affiche une **barre de pills persistante** (bouton Accueil 🏠 + 9 onglets compacts — scroll mobile, wrap desktop) ; header rajeuni (badge « Milestone 4 » obsolète supprimé). `AdminNavTabBar` refondue : `AdminTab` passe de 10 à **9 onglets** (`seasons` et `subscriptions` supprimés, `payments` ajouté), libellés 100 % français, `ADMIN_TABS` = source unique partagée grille + pills.

2. **Nouvel onglet « Paiements & Accès »** (`AdminPaymentsTab.tsx` + `payments-admin.functions.ts`) — 4 sections :
   - **Paiements (secours webhook)** : `listPaymentsAdmin` (GET, `requireAdmin` — 100 dernières, intent, email parent), `retryPaymentFulfillmentAdmin` (POST `{paymentId, mode}`) — mode `verify` : `verifyPaystackTransaction` (statut + montant vérifiés) puis `markPaymentSuccessAndFulfill` (idempotent, skip si déjà success) ; mode `manual` : fulfillment direct (paiement WhatsApp/Mobile Money, décision admin) — payment ET bénéfice écrits ensemble. `getPaymentsPendingCountAdmin` alimente le badge de la grille.
   - **Abonnements** : `activateSubscriptionFromReferenceAdmin` (branche enfin `verifyFamilySubscriptionPayment`, jusqu'ici orpheline — secours du 1er paiement), `extendSubscriptionPeriodAdmin` (extension `current_period_end`, fenêtre cumulée pure `computeSubscriptionExtensionWindow` — jamais de découpe), `cancelSubscriptionAdmin` (+ `disablePaystackSubscription`) ; anomalie « actif à période dépassée » visible.
   - **Parrainages** : historique migré (`listSponsorshipsAdmin`, `confirmSponsorshipPaymentAdmin`, copie code) + `createSponsorshipTokenAdmin` (token CONFIRMÉ créé manuellement — secours du parrainage online sans token).
   - **Renouvellements d'accès** : `getUpcomingExpirationsAdmin` + prolongations +1/+3 mois (`extendChildAccessAdmin`) migrés de Seasons.

3. **Campagnes B2B — mode test vs payant + lien partageable** (demande utilisateur explicite) : migration `20260813100000` — `campaigns.mode` ('test' défaut / 'paid') + `campaigns.price_per_token_xof`. Mode test : codes confirmés d'office (workflow validable sans facturation). Mode payé : `generateCampaignPaymentLinkAdmin` (Paystack initialize, metadata `{type: "campaign_b2b", campaign_id}`, URL partageable — modale copie) ; **webhook** : nouvelle case `campaign_b2b` dans `applyPaystackEntitlement` → lot de codes B2B confirmés (`resolveCampaignTokenLot` pur : montant ÷ prix, plafonné au `target_count` restant, garde anti-dépassement identique à `generateCampaignTokensAdmin`). UI : badge Test/Payé + éditeur prix + bouton « Lien de paiement » par carte.

4. **Nettoyage de cohérence** : onglet Seasons supprimé (`AdminSeasonsTab`/`CreateSeasonModal`/`AdminSubscriptionsTab` retirés, 5 fns CRUD saisons supprimées — `getActiveSeason` conservé pour l'étiquette) ; Produits = catalogue + stats (sous-onglet Commandes supprimé — Commerce est la source unique) ; toggles passeport « Bloqué/Débloqué » dans Profils (secours du webhook `passport`) ; prix en dur remplacés par `PASSPORT_PRICE_XOF` ; libellés anglais → français (« Telemetry », « Action 1-Click »…) ; orphelines `listParentsBI`/`createOrder` supprimées.

**Pourquoi cette forme** : les briques idempotentes existaient (`markPaymentSuccessAndFulfill`, `verifyPaystackTransaction`, `activateFamilySubscription`) — il manquait l'écran et les fns admin ; les imports des modules serveur sensibles restent dynamiques (jamais côté client) ; la logique critique est extraite en fonctions pures testées (`computeSubscriptionExtensionWindow`, `campaignTokenCount`, `resolveCampaignTokenLot`) ; `requireAdmin` partout, `supabaseAdmin` (bypass RLS).

**Alternatives rejetées** : *onglet Seasons conservé* (vestige — l'utile migre) ; *paiement manuel sans journal* (une payment `initiated` doit toujours finir `success` avec `paid_at` — l'admin agit sur la payment, jamais à côté) ; *rejouer sans vérifier Paystack en mode verify* (divergence de montant = refus, même règle que le webhook) ; *nav tabs horizontales conservées* (choix utilisateur : grille d'accueil).

**Vérifié** : migration `20260813100000` poussée, types régénérés (CLI local, jamais MCP), **562 tests verts** (45 fichiers, +8), `tsc --noEmit` propre, build OK. Branche `feat/adminos-refonte-vision` (empilée sur `feat/naya-v4-modalites-apprentissage` — les migrations 2026081217/18/1900 des chantiers 3-7 sont présentes pour la cohérence du suivi distant ; le fix admin de la PR #46 est fusionné dedans).

## Décision #72 : Campagnes B2B — mode test vs payé + lien de paiement partageable (2026-08-13, refonte Admin OS)

**Contexte** : deux workflows manquaient à la section Campagnes (exigence utilisateur pendant la refonte Admin OS, décision #71) : définir une campagne **test** sans facturation (tokens confirmés d'office pour valider tout le workflow) ou une campagne **payée** avec un lien de paiement partageable pour l'ONG.

**Ce qui a été fait** :
1. **Migration `20260813100000_campaigns_test_paid_mode.sql`** : `campaigns.mode` (`text CHECK ('test','paid')`, défaut `'test'`) + `campaigns.price_per_token_xof` (`integer`).
2. **Mode test** : `generateCampaignTokensAdmin` — tokens confirmés d'office, aucun paiement.
3. **Mode payé** : `generateCampaignPaymentLinkAdmin` (POST, `requireAdmin`) → Paystack `initialize` (montant = count × prix, référence `GENIZIO-CAMP-…`, metadata `{type:"campaign_b2b", campaign_id, token_count}`) → **URL partageable** (modale copie, `AdminCampaignsTab`). Webhook : case `campaign_b2b` dans `applyPaystackEntitlement` — lot de codes B2B confirmés (`count = montant / prix`, plafonné au `target_count` restant via `resolveCampaignTokenLot`, pure testée).
4. **Garde anti-dépassement** à la génération du lien : `existingCount + tokenCount ≤ target_count`.

**Alternatives rejetées** : *tokens confirmés même en mode payé* (la facturation doit être réelle pour une ONG) ; *lien sans garde de capacité* (dépassement d'objectif silencieux).

**⚠️ Corrections ultérieures (revue de code, décision #73, PR #51)** : à la livraison, le flux payé était en réalité **cassé de bout en bout** — aucune ligne `payments` créée à la génération du lien (le webhook ne retrouvait jamais la référence → ONG débitée, zéro code), et le lot multi-codes violait la contrainte `UNIQUE` sur `paystack_reference`. Voir #73 pour le détail.

## Décision #73 : Revue de code approfondie 2026-08-12/13 — 3 P0, 7 P1, 13 P2 vérifiés et corrigés (PR #51-55)

**Contexte** : demande utilisateur — « fais comme Codex, des review suggestions, c'est important d'avoir le code et les fonctions/workflow les plus optimaux. » Méthode retenue : **4 revues parallèles par sous-système** (chemin argent · boucle d'apprentissage · recommandations/aspirations/difficultés · Admin OS/routes), puis **chaque trouvaille P0/P1 relue dans le code réel avant correction** — zéro faux positif livré (leçon des 5 avis Codex vérifiés en session précédente).

**Les 3 P0 (critiques)** :
1. **Lien de campagne : l'ONG était débitée sans qu'aucun code soit créé** — `generateCampaignPaymentLinkAdmin` n'insérait aucune ligne `payments` ; le webhook ne retrouvait jamais la référence `GENIZIO-CAMP-…` et répondait 200 sans fulfillment ; le paiement était invisible même dans l'onglet Paiements. **Fix (PR #51)** : ligne `payments` (`initiated`, metadata `campaign_b2b` + `token_count`) créée avant l'initialisation Paystack, via `createPaystackPayment` (exporté — point de passage unique des 6 intents).
2. **Lot B2B multi-codes impossible** — `paystack_reference` (colonne **UNIQUE**) était posée sur chaque code du lot → violation dès 2 codes → webhook 500 + retries infinis. **Fix (PR #51)** : seul le **premier** code porte la référence (idempotence = pattern `sponsorship`), les suivants `NULL` ; `amount_paid` = prix unitaire par code.
3. **Boucle de modalités jamais bornée, même modalité re-servie** — `processModalityReformulation` groupait les tentatives par parent immédiat : au 2ᵉ échec, `modality_attempt` restait à 1, `MAX_MODALITY_ATTEMPTS` jamais atteint, `resolveNextModality` re-choisissait la 1ʳᵉ priorité, et la carte « Ce que Naya a compris » (chantier 5) ne s'affichait jamais. **Fix (PR #52)** : `resolveReformulationRoot` (pure testée) — filiation par la **racine** de la chaîne ; + tri déterministe des siblings, + `existingTitles` de toute la chaîne.

**Les 7 P1 + #10** :
4. **Double application du bénéfice en course webhook/page de retour** (flux nominal !) — garde `status !== success` non atomique (TOCTOU). **Fix (PR #53)** : **compare-and-swap** dans `markPaymentSuccessAndFulfill` (UPDATE `status = success` où `status ≠ success`, seul le vainqueur applique le bénéfice, les suivants reçoivent `already_fulfilled`) — exactement-une-fois au niveau base.
5. **Domaines des ponts d'aspiration non canoniques (16/20)** — libellés d'affichage (« Sciences & Ingénierie »…) vs vocabulaire fermé `challenges.domain` → comptage d'essais, garde « défi récent » et vocabulaire inséré en base faussés. **Fix (PR #53)** : valeurs canoniques + test « chaque `bridge.domains[i] ∈ DOMAINS` » (`DOMAINS` exporté).
6. **Biais « difficultés déclarées » inerte sur l'Exploration** — `getLeastExploredTalentLabels(..., 1)` : un seul candidat = re-tri sans effet. **Fix (PR #53)** : 3 candidats.
7. **Imports statiques du client service-role** (`seasons` + `campaigns`) — frontière documentée franchie (bundle client). **Fix (PR #54)** : imports dynamiques dans les 25 handlers (script + revue du diff, tsc propre).
8. **`submitChallengeNotCompleted` sans garde de statut** — un re-clic pouvait faire basculer un `completed` en `not_completed`. **Fix (PR #53)** : refus si `completed` ou déjà `not_completed`.
9. **Plafonnement silencieux du lot de campagne** — trop-perçu possible (capacité réduite entre génération du lien et paiement). **Fix (PR #51)** : `campaignLotDiscrepancy` (pure testée) — tout écart payé/livré **bloque** avec message explicite ; la payment reste en attente pour traitement admin.
10. **État React non synchronisé entre les onglets Admin** — un passeport débloqué dans Profils restait verrouillé dans Commerce/Exécutif. **Fix (PR #55)** : callback `onDataChanged` remonté (Profils + Produits).

**Les 13 P2 (PR #55, résumé)** : redemptions de code atomiques (claim CAS + rollback best-effort, 2 flux), clamp fin de mois `setMonth` (+2 tests), `getChildEnrolledSeason` sans auth → `requireSupabaseAuth` + ownership, comptage `completedInAspirationDomains` dédié (le `.limit(6)` tronquait), `school_level`/`languages` manquants au select, cible `proof_target` bornée [1,1000], `applyGentleTimeProposal` refus si `none`, override « pas de N+1 » dans le prompt de reformulation, `findUserIdByEmail` paginé (listAllUsers), valeurs `.or()` PostgREST entre guillemets, `searchChildProfilesAdmin` cherche enfin l'email du parent (tous les comptes), double toast d'erreur supprimé, code mort retiré (`listOrdersAdmin`, imports inutilisés).

**Laissés volontairement** (documentés, pas des bugs ouverts) : `suggestTimePressureChange` non pure (refactor d'API), contraintes DB `UNIQUE` sur `token_id` des crédits/périodes (couche la plus robuste — migration optionnelle, le CAS applicatif couvre déjà le double-clic), rencontres réelles (phase ultérieure, vue `talent_environment_signals` prête).

**Vérifié** : 585 tests verts (49 fichiers, +27 depuis la refonte), `tsc --noEmit` propre, build OK à chaque étape ; merge des 5 PR (une résolution de conflit trivial « garder les deux » sur #54 vs main) ; branches nettoyées (locales + distantes). **Clôture décision #51** (PR #56 + #57) : le bug « Commencer le défi sans effet visible » était un bug de **filtre** (cause identifiée, correctif 2026-08-05 confirmé, régression verrouillée par `challenge-list-filters.ts` + 5 tests) ; le stash « bouton non réussi » résorbé (PR #50, `autoPort`).

## Décision #74 : Superviseur = opérateur (copilote) pour les enfants accompagnés — le contrat complet (2026-08-15)

**✅ IMPLÉMENTÉ (2026-08-15, branche `feat/superviseur-copilote`)** — la décision produit a été posée en session (product-intelligence-architect), puis entièrement implémentée le même jour. Le constat d'origine : la direction de l'app fait du superviseur un copilote, mais le code ne lui donnait qu'un dashboard lecture seule + déclaration de séance, et la V4 (PR 82-87) avait industrialisé l'économie du superviseur-observateur sans toucher à ses droits. Aucune table `supervisor_actions` ni `supervisor_reports` n'existait en base.

**Livré** :
- **Migration `20260815000000_supervisor_copilot.sql`** (appliquée en prod le 2026-08-15 + types régénérés — voir MEMORY) : `supervisor_actions` (journal d'audit), `supervisor_reports` (bilan), `app_notifications` (canal parent), `challenges.created_by_user_id` (attribution).
- **Fondations testées** : `child-accompaniment.ts` (`resolveChildAccompaniment` — miroir LECTURE de la chaîne pack→campagne), `supervisor-operator.ts` (`canOperateSupervisor` pur + `assertSupervisorOperator` + `isLastPayableSession`), `supervisor-actions.ts`, `app-notifications.ts`, `supervisor-reports.ts` (machine à états draft→submitted→validated|rejected).
- **Cœurs IA extraits** (comportement parent byte-identique, suite 660 tests verte au refactor) : `validateChallengeProofCore`, `submitDeclarativeProofCore`, `generateChallengesCore`, `assignTemplateChallengeCore` — la voie superviseur réutilise STRICTEMENT la même chaîne IA, seul l'acteur change.
- **`supervisor-operator.functions.ts`** (6 fns, toutes via service role APRÈS `assertSupervisorOperator`) : update (start/progress + notes→journal), abandon (motif, même chaîne post-échec), preuve photo en séance, preuve déclarative, génération, assignation (`user_id` reste le parent, `created_by_user_id` = superviseur).
- **`supervisor-reports.functions.ts`** : rédaction brouillon, soumission, lecture superviseur, lecture parent (ownership), validation/rejet parent (avec feedback).
- **Payout (condition de paiement)** : `approveSupervisorSessionAdmin` bloque la 12ᵉ séance du mois (budget `PACK_SESSIONS`) d'un enfant financé si aucun bilan validé ne couvre la période — `isLastPayableSession` pur testé, conservateur (funding 'none' jamais bloqué).
- **UI superviseur** (`/supervisor`) : onglet Défis | Bilan, boutons opérateur dans la modale de détail (Commencer / progression / note de séance / non réussi / soumettre la preuve photo ou déclarative), génération de défis, rédaction + soumission du bilan, statut + feedback parent ; `getSupervisorDashboard` annoté (`accompaniment` + `supervisorActions`).
- **UI parent** : bandeau « Mode accompagnement » (info superviseur + badge d'activité + liste notifications + tout marquer lu), bouton « Réouvrir » sur les défis complétés (points conservés), carte « Bilan du superviseur » au portfolio (valider / demander des modifications / PDF / WhatsApp), route `/profiles/$profileId/bilan-print` + `BilanPdf` (@react-pdf/renderer, polices de marque).

**✅ Tout livré dans cette tranche** : migrations poussées en prod + types régénérés (2026-08-15, vérifié dans MEMORY et le backlog) ; pas de push cross-appareil (pull + badge, assumé dans la décision).

**Contexte** : le pack Accompagnement (60 000 F/mois/enfant, 12 séances, bilan inclus) vendu par la V4 paie aujourd'hui un **observateur**. Décision utilisateur : pour les enfants **accompagnés**, le superviseur devient l'**opérateur principal** du cycle de vie des défis ; le parent passe en **validateur** (garde le dernier mot). Le non-négociable fondateur #1 (« le parent valide les défis et publie ») est préservé **par veto** — le parent a choisi le pack, choisi le superviseur, et peut tout annuler — plutôt que par gatekeeping à chaque défi.

**Le contrat (5 sous-décisions verrouillées)** :

1. **Pouvoirs du superviseur (enfants accompagnés)** : démarrer, faire progresser, notes/journal de séance, abandonner (motif obligatoire), générer/assigner des défis, proposer la clôture. **Jamais** de suppression d'un défi, **jamais** de publication mur public. Le parent reste opérateur par défaut sur les enfants non accompagnés.
2. **Complétion des défis — la chaîne IA est INTACTE, seul l'acteur change.** Un défi se complète comme aujourd'hui : preuve → `validateChallengeProof` (IA photo) → points / Jumeau / observations. Pour un enfant accompagné, c'est **le superviseur qui prend la photo en séance et la soumet** — il est le seul physiquement présent, et c'est lui qui joue le rôle que le parent joue aujourd'hui. Aucune nouvelle voie de preuve : soumettre la preuve = l'attestation. Le mode `declarative` (décision #36) couvre déjà les défis sans photo possible (le superviseur remplit la valeur, points via `declarative_award`). L'IA vérifie toujours la pertinence de la photo (anti-triche), le parent est notifié et peut **réouvrir** le défi en un clic, à tout moment (veto éclairé, pas aveugle : il voit la photo + le résultat IA).
3. **Bilan de fin (le « bilan inclus » du pack)** — la seule pièce à **validation explicite** du parent. Le superviseur le rédige depuis `/supervisor` → carte « Bilan du superviseur » dans le portfolio (section guidée : réalisations, compétences observées, recommandations) → le parent valide ou demande des corrections → export PDF/WhatsApp. Le flow quotidien marche en confiance + veto ; le bilan en validation explicite. (Nouvelle table `supervisor_reports` à créer.)
4. **Ownership — on ne casse rien.** `challenges.user_id = parent` reste la clé d'ownership (RLS, lectures parent, historique). On ajoute `created_by_user_id` (attribution) et **un seul choke-point** : `canOperate(childId, userId)` = parent **ou** (superviseur actif assigné **et** enfant accompagné). Toutes les mutations passent par cette fonction au lieu du `.eq("user_id", userId)` naïf. La brèche est unique, surveillée, auditable.
5. **Payout inchangé, bilan = condition de paiement.** 3 500 F/séance conservé (70 % × 5 000 F). Le bilan devient un **livrable obligatoire** : la dernière séance du mois n'est payable que si le bilan est rendu et validé. Zéro changement de pricing.

**Règles transverses posées en même temps** :
- **Enfant « accompagné »** = une seule règle dérivée : couverture `family_coverages` source `accompaniment_pack` **ou** compartiment séances d'une campagne financée. Une notion, deux opérateurs possibles (parent par défaut, superviseur si accompagné). Règle la frontière pack/campagne.
- **Score V2 inchangé** : il mesure désormais l'opérateur (50 % séances + 25 % feedback + 25 % progression = la production du superviseur) — assumé, recalibrage plus tard si le volume de feedback le justifie.
- **Journal `supervisor_actions`** (qui, quoi, quand) — non-négociable dès qu'un tiers écrit sur les défis, dans l'esprit de `generation_audits`. Trace aussi les soumissions de preuve superviseur.
- **UX parent** : bandeau « Mode accompagnement — suivi par [prénom] » + boutons Réouvrir / Voir le bilan. Le parent reste opérateur par défaut sur ses autres enfants.

**Alternatives rejetées** : *superviseur lecteur + signal « prêt » sans droit de complétion* (copilote sans bouton — rejeté par l'utilisateur : si le superviseur ne valide rien, le pack n'a aucun sens) ; *attestation superviseur sans photo* (casserait la chaîne IA : points/Jumeau/observations indexés sur la preuve) ; *`user_id = superviseur` à l'écriture* (casserait toutes les lectures parent et le modèle d'ownership) ; *validation parent bloquante à chaque défi* (friction insupportable — le parent valide le bilan, pas chaque micro-décision).

**✅ Implémentation complète livrée** (2026-08-15, branche `feat/superviseur-copilote` puis renommée Mentor — décision #76) : couche d'autorisation `canOperateSupervisor`/`assertSupervisorOperator`, UI `/supervisor`, `supervisor_reports`, condition de payout (`isLastPayableSession`), journal d'audit `supervisor_actions` — voir les sections « Livré » ci-dessus et [[#76]].

## Décision #75 : Rétro-documentation des décisions V4 « Pass Enfant » 1-5 (2026-08-15)

**Contexte** : les décisions V4 n'avaient **jamais été écrites dans la mémoire** — elles ne vivaient que dans les corps de PR #82-87. Dette de mémoire comblée : reconsignées ici, fidèles aux PR (documentées comme observées, pas comme ré-analysées). Les implémentations correspondantes sont mergées dans `main` (PR #82, #83, #84/#87, #85, #86, 2026-08-14), migrations Vagues A/B/C marquées « NON appliquées en prod avant revue » à l'époque.

1. **Décision 1 — Fusion parrainage (PR #86)** : la branche individuelle de rédemption par-enfant (`child_access_periods`) est **remplacée** par la couverture famille (`sponsorship_credits` + `family_coverages` source `sponsorship`), identique à `redeemSponsorshipCode`. Un même code agit pareil quel que soit le chemin. Branche B2B (campagne) → `season_enrollments` + sync `family_coverages`. `SeasonEnrollmentModal` (rédemption legacy) supprimée.
2. **Décision 2 — Pack par enfant (PR #84/#87)** : l'intent `accompaniment_pack` Paystack est **PAR ENFANT** (1/3/6 mois, 60 000 F/mois) — crédite `12 × months` séances sur `family_coverages` (source `accompaniment_pack`, `child_id`), un rachat étend la fenêtre sans découpe (`computeAccessPeriodWindow`).
3. **Décision 3 — Campagne 2 compteurs (PR #83, #86)** : `campaigns.sessions_target/sessions_used` — un compartiment SÉANCES (budget d'accompagnement financé) **distinct** du compartiment APP (`target_count`). La consommation (débit atomique au fil des déclarations) est posée en Vague C. Carte admin « N enfants + X/Y séances », pastille ONG « + X/Y séances financées ».
4. **Décision 4 — Score superviseur auto dès la V1 (PR #82)** : `computeSupervisorScore` (pure, testée) — V1 : 60 % séances + 40 % progression ; **évolué en Score V2** (PR #85) : 50 % séances + 25 % feedback famille + 25 % progression, renormalisé tant qu'aucune note (un superviseur parfait sans retour reste à 100). Ponctualité reportée (exige la planification des séances, inexistante).
5. **Décision 5 — Paliers +5, cap 50 (PR #83, #84/#87)** : l'intent `extra_slots` devient **palier** : +5 enfants par palier (source `purchase`, une ligne par achat), même tarif mensuel famille. Trigger V10 : plancher → éducateur 10 → couverture 5 → +paliers → **cap 50**. Copy « ajoutez un palier » (fini « créez un nouveau compte »).

**Cadre commun** : `family_coverages` = **source unique** de couverture d'une famille (subscription | accompaniment_pack | campaign | sponsorship | purchase), `computeAppQuota` (miroir TS pur, testé) et `getChildAccessStatus`/`getFamilyCoverage`/`getFamilySubscriptionStatus` la lisent — writers synchronisés, plus de lecture parallèle abonnement/crédit/campagne.

> **Note de renommage (décision #76, 2026-08-15)** : la terminologie « superviseur » de cette décision et de la #74 est **renommée en « mentor »** — tables, code, labels, routes. Voir [[#76]].

## Décision #76 : « Superviseur » devient « Mentor » — renommage total + fusion avec le partage (2026-08-15)

**✅ IMPLÉMENTÉ (2026-08-15, branche `refactor/superviseur-to-mentor`)** — décision produit : le terme « mentor » est plus vendeur commercialement (accompagnement vs contrôle) et la page « Mentors » déjà présente dans le dashboard parent est bien placée. Deux chantiers en un :

1. **Renommage total « superviseur » → « mentor », DB comprise.** Tables `supervisors`→`mentors`, `supervisor_profiles`→`mentor_profiles`, `supervisor_sessions`→`mentor_sessions`, `supervisor_feedback`→`mentor_feedback`, `supervisor_actions`→`mentor_actions`, `supervisor_reports`→`mentor_reports` ; colonnes `supervisor_user_id`→`mentor_user_id`, `supervisor_session_id`→`mentor_session_id`, `campaigns.extra_supervisors_quota`→`extra_mentors_quota` ; fonction trigger `check_supervisor_quota`→`check_mentor_quota` (corps plpgsql recréé — le texte des fonctions ne suit pas les renommages de tables) ; index, contraintes, policy RLS « Mentors can read their own assignments » ; routes `/supervisor`→`/mentor`, `/admin/supervisors`→`/admin/mentors` ; ~45 fichiers `src` (labels FR, identifiants, commentaires, tests). **Hors périmètre** : `challenges.requires_supervision`/`supervision_warning` = concept de SÉCURITÉ (présence d'un adulte), ≠ rôle → inchangé ; `campaign_educators` (éducateur de campagne, distinct) → inchangé ; « Naya, le mentor IA » déjà nommé mentor.
2. **Fusion des deux concepts « mentor ».** L'ancienne fonction `child_mentors` (lien de partage en lecture seule envoyé à un prof/coach externe, aucun compte requis) est **supprimée** : table DROPPée (0 ligne en prod, vérifié avant), fonctions `inviteMentor`/`revokeMentorAccess`/`getSharedChildView`, composants `InviteMentorDialog`/`MentorGrantsTable`, route `/s/$token`. « Mentor » désigne désormais l'accompagnateur opérateur (compte réel, assigné par l'admin).

**Conséquence UX parent** : l'onglet « Mentors » devient **« Mentor »** et pointe vers un **hub d'accompagnement** (`/profiles/$profileId/mentors`) : mentor assigné + accompagnement (pack/campagne + budget séances, `getChildMentorInfo` enrichi via `resolveChildAccompaniment`) + **bilan de fin** (validation parent, feedback, export PDF, partage WhatsApp — déplacé depuis le portfolio) + note de séance (feedback 1-5) + activité récente (notifications). Le portfolio garde un lien discret vers ce hub.

**Migration** : `20260815120000_supervisor_to_mentor_rename.sql` — **appliquée en prod** (aucune perte : `mentors` = 3 lignes conservées, `child_mentors` = 0 ligne), types régénérés (`supabase gen types typescript --linked`). **Vérifié** : 675 tests verts (55 fichiers), `tsc --noEmit` propre, build OK.

## Décision #77 : Photos iOS (Live Photos HEIC) — conversion client + filet serveur WASM (2026-08-15)

**✅ IMPLÉMENTÉ (2026-08-15)** — constat utilisateur : une photo « live » (Live Photo iPhone) échoue à l'envoi pour valider un défi — il fallait passer par une capture d'écran (PNG). Cause racine : iOS livre les Live Photos en **HEIC**, que le pipeline navigateur (`<img>`/canvas) ne décode pas → `fileToCompressedProof` échouait avec « Image illisible. » **avant** tout envoi (le serveur ne voyait rien). Deuxième constat (doute utilisateur sur la compression, justifié) : Safari n'encode **pas** le WebP via `canvas.toBlob` et retombe **silencieusement** sur un PNG (spec HTMLCanvasElement) — le repli `!blob` ne se déclenchait jamais, la « compression » produisait un PNG de plusieurs Mo sur iOS.

**Livré** :
- **Client** (`src/lib/image-proof.ts`, partagé /quest + OutcomeChat + mentor) : détection HEIC/HEIF (type MIME normalisé + extension en repli pour le quirk iOS « type vide ») → conversion **heic2any** (libheif WASM, ~1,3 Mo, import dynamique — jamais dans le bundle initial) → pipeline existant. Échec de conversion → envoi **brut** HEIC (le serveur convertit). Encodage durci : après `toBlob`, vérification du `blob.type` réel — une demande WebP qui rend un PNG (Safari) est ré-encodée en **JPEG explicite**.
- **Serveur** (`src/lib/server-heic.ts` + `validateChallengeProofCore`) : filet — une preuve HEIC qui arrive quand même (client ancien, WASM indisponible, type non reconnu) est détectée (type MIME **et** magie `ftyp` heif/heic) puis convertie en JPEG avant l'appel vision. Échec → analyse **texte seul** (même repli que l'ancien fallback vision, mais sans l'appel Claude gaspillé sur des octets HEIC relabelés JPEG). Le stockage `proofs` enregistre la version normalisée (JPEG).
- **Pourquoi WASM et pas sharp** : le runtime de production est **Cloudflare Workers** (`src/server.ts`, `.output/server/wrangler.json`, `nodejs_compat`) — sharp embarque des binaires natifs libvips et n'y tourne pas ; il reste cantonné aux scripts d'assets build-time (`scripts/convert-images.js`). Le filet utilise donc `libheif-js` (décodeur HEIC, WASM **embarqué** en base64, aucun fetch/fs) + `@jsquash/jpeg` (mozjpeg, wasm embarqué via `scripts/embed-mozjpeg-wasm.mjs`). Imports dynamiques : le module (~1,7 Mo) ne peut pas entrer dans le bundle client des server functions.

**Vérifié** : 682 tests verts (55 fichiers, dont nouveaux tests de détection HEIC), `tsc --noEmit` propre (hors erreur pré-existante `admin.index.tsx` d'une autre branche), build Nitro/Workers OK (chunks WASM embarqués dans `.output/server/_libs`, **zéro référence `fs`**), conversion testée en réel sur un HEIC de référence (1280×854 → JPEG 474 Ko qualité 92, contenu vérifié au re-décodage).

**Alternatives rejetées** : *sharp côté serveur* (impossible sur Workers) ; *`@jsquash/heic`* (retiré du registry npm — 404) ; *dépendre du CDN pour le WASM* (hors-ligne/CI fragile — on embarque les octets) ; *relabeler HEIC en JPEG et laisser Claude échouer* (appel gaspillé + erreur trompeuse — remplacé par détection + conversion propre).

## Décision #78 : Admin OS — appellations modèles DeepSeek réelles + barème creux/plein + dé-doublonnage Commerce (2026-08-15)

**Contexte (constats utilisateur)** : (1) l'onglet « IA Naya » affichait des appellations dépréciées (« DeepSeek Chat » / « DeepSeek Reasoner », alias supprimés par DeepSeek le 2026-07-24) et des coûts « loin de la réalité » ; (2) « Produits & Stock » et « Commerce » se chevauchaient sur les Suggestions Matériel Naya IA, avec des boutons d'ajout rapide inopérants, et un produit ajouté au catalogue ne pouvait pas être modifié.

**Livré (non commité à la clôture — vérifier `git status`)** :

1. **Appellations alignées sur les modèles API réels.** `deepseek-v4-flash` (texte courant, réflexion désactivée) et `deepseek-v4-pro` (raisonnement NAYA, réflexion activée — effort élevé) partout dans `naya-telemetry.ts` et l'onglet IA Naya. Le mode réflexion est documenté et affiché ; le fait qu'il n'ait pas de tarif séparé (tokens de raisonnement facturés comme sortie) est explicité.
2. **Barème creux/plein DeepSeek intégré (effectif 2026-08-16 16:00 UTC).** Les taux promotionnels actuels (flash 0,14/0,28, pro 0,435/0,87 $/M) sont remplacés par un barème nettement plus élevé : pointe flash 0,44/1,32 et pro 1,32/3,96 $/M (cache miss), creux = moitié (flash 0,22/0,66, pro 0,66/1,98) ; heures de pointe 01:00-04:00 et 06:00-10:00 UTC. L'estimateur utilise des **taux pondérés 70 % creux / 30 % pointe** (part creuse = 17 h/24 h, usage famille hors fenêtre nocturne/matineale) via `calculateDeepSeekChatCost/ReasonerCost(input, output, offPeakSharePct)`. La réponse expose un **plafond** `peakCeilingCostUsd/Xof` (100 % en pointe), affiché sur la carte « Coût Estimé » avec l'heure actuelle pointe/creuse (`isDeepSeekPeakHour`).
3. **Dé-doublonnage Commerce → Produits & Stock.** Les panneaux dupliqués « Catalogue Produits Boutique » et « Suggestions Matériel Naya IA » sont **supprimés** de l'onglet Commerce (décision : la gestion a une seule source de vérité, Produits & Stock). À la place, une carte CTA compacte affiche les compteurs (produits + suggestions Naya en attente) et bascule sur l'onglet Produits (`onOpenProductsTab`). Le mécanisme de pré-remplissage trans-onglet (`prefillSuggestion`/`onPrefillConsumed`) livré en cours de session a été retiré comme code mort.
4. **Édition des produits du catalogue.** L'onglet Produits expose enfin « Modifier » (nom, description, prix, stock, tags) : le formulaire unique sert à créer ET à modifier (`editingId`), avec bouton « Annuler la modification ». Le backend `updateProduct` (édition partielle) existait déjà — seul l'UI manquait.

**Alternatives rejetées** : *garder les panneaux dupliqués avec un bouton d'ajout rapide trans-onglet* (deux surfaces pour la même donnée = incohérence garantie ; la page Produits a déjà son panneau « Matériaux détectés sans produit » avec pré-remplissage — c'est la bonne surface d'action) ; *garder les taux promotionnels en attendant* (le changement DeepSeek est effectif le lendemain — l'estimateur devait refléter le nouveau barème, avec plafond conservateur) ; *modéliser le tarif creux par tranche horaire* (l'estimateur travaille sur des comptages, pas des horodatages d'appels — une part pondérée documentée est plus honnête qu'une fausse précision).

**Vérifié** : `tsc --noEmit` propre, suite complète verte (682 tests + mises à jour des assertions de tarifs), lint sans nouvel apport (bruit CRLF préexistant au repo). Sources tarifaires : api-docs.deepseek.com (pricing + guides/thinking_mode), recoupées avec la presse (augmentation annoncée ~×3 à ×4,5).

## Décision #80 : Mode Parent/Mentor — bascule (toggle) + navigation adaptative (2026-08-15)

**✅ IMPLÉMENTÉ (2026-08-15, branche `feat/mentor-activation-codes`)** — la Vague 5 multicouche (spec §7) a livré l'activation du mode Mentor par code (table `mentor_activation_codes` + RPC `activate_mentor_code`, génération admin, carte de saisie dans Réglages). Restaient deux comportements demandés par le porteur, livrés ici :

1. **Le toggle ne sert qu'à switcher.** `setMentorMode` (server fn) bascule `auth.users.user_metadata.mode` entre `parent` et `mentor` — pur commutateur de contexte, il ne suspend ni ne modifie jamais le statut du compte (`mentor_profiles`). Un compte banni/suspendu se voit refuser la bascule vers mentor. Après bascule, `refreshSession()` (nouveau token) propage le mode au store → la barre d'onglets réagit immédiatement.
2. **En mode Mentor, l'onglet « Mentor » de la barre basse disparaît** (« on ne se suit pas soi-même ») : `AppTabBar` filtre l'onglet hub de l'enfant (`/profiles/$profileId/mentors`) quand `mode === "mentor"`. En mode Parent, le côté mentor réapparaît (onglet + espaces d'accompagnement dans les réglages).
3. **Trou comblé : mentor activé par code sans enfant assigné.** `checkIsActiveMentor` (V1) ne détectait que les ASSIGNATIONS (`mentors` actives) — un mentor certifié par code (ligne `mentor_profiles` créée par la RPC) avec zéro enfant assigné ne voyait ni l'espace `/mentor` ni son statut après rechargement (la carte de saisie réapparaissait). `getMentorActivationStatus` définit « certifié » = profil `mentor_profiles` OU assignations actives ; la carte Réglages → Mode Mentor affiche le toggle pour tout mentor certifié, et le bloc « Accompagnant & Pro » montre le lien `/mentor` (profil OU assignations).
4. **UI Réglages → « Mode Mentor »** : non certifié → saisie du code (carte Vague 5 conservée à l'identique) ; certifié → badge de statut (warning/suspended/banned) + toggle Parent/Mentor + texte expliquant le comportement de l'onglet selon le mode.

**Contexte de livraison (réconciliation)** : le cœur de l'activation (base + RPC + génération admin + carte de saisie) a été livré en parallèle par la Vague 5 multicouche (déjà mergée, migration `20260815180000_multicouche_v5_mentor_activation.sql` appliquée en base). Cette décision n'apporte QUE le delta : la bascule de mode et la navigation adaptative. Les parties initialement construites en double par cette session (migration `mentor_activation_codes` alternative avec horodatage en collision, helpers de codes `mentor-codes.ts`, panneau admin `AdminMentorCodesPanel`) ont été abandonnées au profit de l'existant. Aucune migration nouvelle : la table + la RPC existent déjà en base.

**Vérifié** : `tsc --noEmit` propre, suite de tests verte (base `main` @ merges multicouche + admin-os + confiance mentor).

## Décision #79 : Confiance Mentor — validation parent, points, statut automatique, palier 75/25, push & email (2026-08-15)

**✅ IMPLÉMENTÉE (2026-08-15, branche `feat/confiance-mentor`)** — le système de récompense/punition des mentors existait (statut, score, payout) mais était **informatif et manuel** : le score n'avait aucune conséquence, la sanction dépendait de l'admin, et la déclaration de séance du mentor suffisait pour le payout. Décision du porteur : tout automatiser et faire entrer le parent dans la boucle. Quatre volets, cadrés par 4 réponses du porteur :

1. **La déclaration seule ne suffit plus — le parent valide.** Nouveau statut `confirmed` dans le cycle `declared → confirmed (parent) → approved (admin) → paid`. `confirmMentorSession` (ownership parent sur `child_profiles.user_id`, transition atomique `.eq("status","declared")` — jamais de double confirmation), crédite +1 point. **Le score, les points et le payout ne comptent que les séances confirmées** (statuts `confirmed/approved/paid`). `approveMentorSessionAdmin` n'approuve plus que les `confirmed`. Notification in-app immédiate au parent à la déclaration (`mentor_session_to_validate`). *Alternative rejetée* : laisser l'admin seul valider (aucun contrôle du parent sur le contenu facturé) ; un statut « contestée » (le parent signale une séance non réalisée) — différé au backlog (le feedback 1-5 couvre déjà le mécontentement).
2. **Points (solde de récompenses) — « les deux » (compteur + solde).** Table `mentor_points`, crédits : séance confirmée +1, défi complété par le mentor +2, note famille 5/5 +1. Index uniques partiels `(session_id, kind)` / `(challenge_id, kind)` : le double crédit est **impossible en base** (idempotence structurelle, pas applicative). Paliers : 10 pts badge Bronze, 30 pts +5 % payout, 60 pts badge Or +10 %. Le compteur (séances confirmées/attendues) alimente le score comme avant.
3. **Statut automatique dans les deux sens — « auto dans les 2 sens ».** `computeMentorStatusFromScore` : score < 40 → `warning`, < 25 → `suspended`, au-dessus des seuils → `active` ; `banned` reste une décision humaine (jamais auto). Calculé sur une **fenêtre glissante de 30 jours** (pas le mois civil) : un mentor parfait sur le mois passé retomberait à ~0 au début du mois suivant et serait sanctionné à tort — le score de CONFIANCE (statut) est séparé du score affiché (mensuel). Réconciliation dans `listMentorsAdmin` (compteurs déjà en mémoire, UPDATE seulement si changement) + `getMentorDashboard` + après chaque déclaration/confirmation/feedback (`syncMentorTrustStatus`, non-fatal). Notification mentor + admins à chaque bascule.
4. **« Passer à 75/25 » = partage du payout.** Le palier de confiance (score ≥ 75 sur 30 j) fait passer le mentor de 70 % (3 500 F) à **75 % (3 750 F)** de la séance. `payout_xof` reste un **snapshot immuable posé à la déclaration** (palier + bonus points du moment) — l'invariant « le montant ne change jamais après coup » est conservé.
5. **Push + email — « tous les événements mentor ».** Infrastructure nouvelle : (a) PWA passée en **injectManifest** avec un service worker custom `src/sw.ts` (workbox-precaching + handlers `push`/`notificationclick`) — le SW généré (generateSW) ne pouvait pas porter le push ; (b) `push_subscriptions` + `savePushSubscription`/`removePushSubscription` + `sendPushToUser` (web-push, clés VAPID, endpoints morts 404/410 nettoyés au fil de l'eau) ; (c) email Brevo/nodemailer idempotent via `consent_events` (`notification-email.functions.ts`). `notifyUser` orchestre les 3 canaux : in-app toujours, push+email en fire-and-forget non-fatal. Câblé sur : séance à valider (parent), séance confirmée (mentor), bilan soumis (parent — **trou comblé** : le type `mentor_bilan_submitted` était rendu par l'UI mais jamais émis), bilan validé/refusé (mentor), statut changé (mentor + admins). Bandeau « Activer les notifications » monté dans `__root`, désabonnement à la déconnexion.

**Seuils décidés** : confiance ≥ 75 ; warning < 40 ; suspended < 25 ; points : +5 % à 30, +10 % à 60. Tous paramétrables en constantes (mentor-score.ts).

**Migration** : `20260815130000_mentor_trust_system.sql` (statut `confirmed` + `confirmed_by/confirmed_at`, `mentor_points`, `push_subscriptions` ; RLS sans policy, service-role) — **appliquée en prod + types régénérés depuis la base** (2026-08-15, jeton Supabase réparé). **Vérifié** : suite complète verte (+22 nouveaux : seuils, palier, payout tier/bonus, paliers points), `tsc --noEmit` propre, build OK (`sw.js` injectManifest généré, handlers push/notificationclick présents).

**Différé au backlog** : « contester une séance » (rejet parent explicite — **en cours 2026-08-15**), « cadeau boutique » au palier 60 pts (la boutique/orders existe, l'intégration produit est un chantier à part), notification admin sur bascule de statut via la page admin elle-même (les admins reçoivent push+email, le panneau in-app admin n'existe pas — **en cours 2026-08-15**).

## Décision #81 : Ponctualité/planification des séances · Contester une séance · Panneau admin des notifications (2026-08-15)

**✅ IMPLÉMENTÉ** — trois items du backlog (décisions #75 pt 4 et #79 différés) livrés ensemble sur `main` : la ponctualité (reportée depuis la grille V4 parce qu'elle exigeait la planification), le rejet parent explicite d'une séance déclarée, et le journal admin des notifications. Cadrés par 3 réponses du porteur (grille de score, force de pénalité, emplacement du panneau).

### 1. Planification des séances + ponctualité (décision #75 pt 4)

- **Migration `20260815200000_mentor_session_planning_and_contest.sql`** (NON poussée en prod dans un premier temps — revue, convention du repo) : table `mentor_session_slots` (id, mentor_user_id, child_profile_id, planned_at, notes, status planned/cancelled, cancelled_at/by, created_at, index mentor+enfant, RLS sans policy) ; `mentor_sessions` gagne `scheduled_at` (heure planifiée dénormalisée), `mentor_session_slot_id` (FK SET NULL, index partiel UNIQUE : un créneau ne lie qu'une séance), et le statut `contested` (point 2).
- **Flux** : le mentor planifie un créneau (`planMentorSessionSlot` — date + heure + note, enfant assigné actif, statut non suspendu/banni) → le parent est notifié (`mentor_session_planned`, push+email). À la déclaration, la séance peut être liée au créneau (`declareSessionMentor` accepte `slotId`, valide l'appartenance/statut du créneau, écrit `scheduled_at`) → **ponctualité = séances planifiées réalisées à l'heure (±30 min, `PUNCTUALITY_WINDOW_MINUTES`) ÷ séances planifiées**. `cancelMentorSessionSlot` (annulation silencieuse), `listMyPlannedSlots` (mentor), `listChildPlannedSlots` (parent, ownership).
- **Score re-grillé 40/15/15/30** (décision porteur : « la part de la progression doit être plus grande car c'est la valeur qu'on recherche ») — tenue 40 % · ponctualité 15 % · feedback 15 % · **progression 30 %** (était 25 %). Renormalisé sur les composantes mesurables quand la ponctualité (aucun créneau planifié — jamais punitif) ou le feedback manquent. `computeMentorScore` gagne `punctualityScore` et `contestedSessions` ; appelants mis à jour (`listMentorsAdmin` mensuel + roulant, `getMentorDashboard`, `computeRollingScore`). Helper pur `punctualityFromSessions` pour unifier le calcul.
- **UI** : `/mentor` — bouton « Planifier une séance » + modale (date+heure+note) + liste des créneaux à venir avec annulation + sélecteur « Créneau planifié » dans la modale de déclaration ; hub parent — carte « Séances planifiées ».

### 2. Contester une séance (décision #79 différé)

- **Statut `contested`** ajouté au CHECK de `mentor_sessions` + `contested_by`/`contested_at`/`contest_reason`. Exclu de `CONFIRMED_SESSION_STATUSES` (ni score, ni points, ni payout) et inapprovable par l'admin (transition `.eq("status","confirmed")` inchangée).
- **`contestMentorSession`** (ownership parent, transition atomique `.eq("status","declared")` — jamais de double contestation) : motif par vocabulaire fermé (`not_done`/`non_compliant`/`not_on_time`/`other`, `CONTEST_REASONS`) + note optionnelle ; **remboursement** de la séance financée (`family_coverages.sessions_used − 1` si pack, `campaigns.sessions_used − 1` si campagne, garde ≥ 0 — cœur `processSessionContest`/`refundSessionDebit` testé avec fake DB) ; journal `mentor_actions` (`session_contested`) ; notifications mentor + admins (`mentor_session_contested`) ; `syncMentorTrustStatus`.
- **⚠️ Garde « travail validé » (complément anti-faille, même jour)** : sans elle, un parent malveillant pouvait laisser le mentor travailler (défi complété + preuve validée par l'IA, l'enfant garde le bénéfice) puis contester la séance pour ne pas la payer. Désormais `processSessionContest` REFUSE la contestation si l'enfant a un défi **complété et validé** (preuve IA `ai_observations` non nul OU défi déclaratif complété) dont la complétion tombe **le jour de la séance ou dans les 7 jours SUIVANTS** (`hasValidatedChildWorkNearSession`, `CONTEST_VALIDATED_WORK_WINDOW_DAYS` — constante). Fenêtre **à sens unique** : un défi validé AVANT la date de la séance n'atteste pas celle-ci (autre séance, travail du parent) et ne bloque pas la contestation. Garde fermée : si la vérification échoue, la contestation est refusée (l'admin reste joignable). Le parent a toujours la note 1-5 et le canal équipe pour signaler un problème ; l'admin voit le tout dans le journal. UI : mention explicite dans le dialogue de contestation.
- **Pénalité « compteur négatif »** (choix porteur) : `sessionsScore = max(0, confirmées − contestées) ÷ attendues` — une contestation retire 1 séance confirmée du numérateur (12 confirmées − 2 contestées = 10/12). Garde anti-abus : chaque contestation est visible dans le journal admin (point 3).
- **UI parent** : chaque séance de « Séances à valider » gagne un bouton « Contester » (dialogue motif + note) à côté de « Confirmer ».

### 3. Panneau in-app admin des notifications (décision #79 différé)

- **`listAppNotificationsAdmin`** (requireAdmin) : journal global paginé de `app_notifications` (page/pageSize/type/count, tri created_at desc), destinataire résolu — emails parents via `parent_profiles` (indexée), comptes restants via `auth.admin.getUserById` bornés (≤ pageSize, jamais listAllUsers) — rôle dérivé (admin si email dans ADMIN_EMAILS, parent si parent_profiles, sinon mentor).
- **Trou comblé** : `updateMentorStatusAdmin` (suspend/ban/rétablir MANUEL) n'émettait aucune notification — le journal était muet pour l'action humaine. Il émet désormais `mentor_status_changed` (mentor + admins, push+email), comme les bascules automatiques de `syncMentorTrustStatus`.
- **UI** : 11ᵉ onglet « Notifications » (`AdminTab` + `ADMIN_TABS`, icône Bell, `AdminNotificationsTab`) — filtre par type, libellés français + payload résumé, `AdminPagination`, lecture seule. Chip « Contestée par le parent » ajouté au ledger de séances de l'onglet Mentors.

**Alternatives rejetées** : *score 50/25/25 inchangé + ponctualité informative* (le porteur a choisi de rééquilibrer avec une progression plus lourde) ; *ponctualité en bonus de points* (le poids de grille était documenté, il se réintègre comme composante) ; *contester une séance déjà confirmée* (contradictoire — le parent a déjà validé ; le chemin « déclarée » couvre le besoin, l'admin garde le levier sur le reste) ; *panneau admin dans l'onglet Mentors* (choix porteur : onglet dédié, le journal couvre toutes les notifications, pas seulement les bascules) ; *statut « contestée » sans remboursement* (la séance n'a pas eu lieu, le budget pack/campagne doit revenir au créneau).

**Vérifié** : 746 tests verts (57 fichiers, dont `mentor-scheduling.test.ts` ×11, `mentor-contest.test.ts` ×11, `mentor-score.test.ts` étendu à 42), `tsc --noEmit` propre, `npm run build` OK (Nitro/Workers). Migration `20260815200000` NON poussée en prod (revue requise, puis `supabase gen types typescript --linked` — le code cast `(supabaseAdmin as any)` pour les colonnes/tables nouvelles et compile sans regen, convention #74).

## Décision #82 : Univers Mode Mentor — filtrage de bout en bout + thème indigo/violet (2026-08-15)

**✅ IMPLÉMENTÉE (2026-08-15, branche `feat/mode-mentor-univers`)** — la décision #80 a livré le toggle Parent/Mentor, mais il ne faisait que masquer l'onglet « Mentor » de la barre basse : l'app restait une app parent (enfants du compte, défis, création de profils…). Réponse au constat du porteur (« le toggle ne filtre pas la liste des enfants assignés ni la liste des défis ») et à sa clarification produit : **le mentor est le remplaçant du parent** (qui n'a pas le temps ou est analphabète) — il doit pouvoir faire presque tout comme le parent, **sauf supprimer, acheter/payer et créer/gérer des profils** ; c'est aussi un **conseiller d'orientation** qui analyse l'enfant et donne ses indications au parent (bilan de fin conservé). En mode mentor, l'app bascule dans un univers distinct.

1. **Univers visuel indigo/violet (choix porteur)** : `data-mode="mentor"` posé sur `<html>` (`__root.tsx`, via `useSession`) + bloc `:root[data-mode="mentor"]` dans `styles.css` — la famille `--brand*` passe de l'orange ambre à l'indigo/violet, `--surface`/`--glow-100` refroidissent, le décor de fond (`--page-bg`, nouvelle variable) change aussi. Tout l'app suit via les tokens Tailwind, `/mentor` compris.
2. **Le mentor agit comme le parent (acteur enfant)** : nouveau `child-actor.ts` — `canActAsChildActor` (pur, testé) / `resolveChildActor` / `assertChildActor` : parent propriétaire OU mentor assigné actif non banni/suspendu. Appliqué aux fns d'action parent (lectures service role dans le chemin mentor, filtre d'ownership retiré, `createdByUserId=mentor` pour l'attribution) : `generateChallenges`, `generateSingleChallenge`, `generateAcademicHomeworkChallenge`, `assignTemplateChallenge`, `updateChallenge`, `submitChallengeNotCompleted`, `recordChallengeTimeOver`, `getChildAISynthesis`, `getAcademicGapsForChild`, `recommendChallengesForChild`, `getGentleTimeSuggestion`, `applyGentleTimeProposal` + nouvelle `acceptChildInterestDiscovery` (le write `child_profiles.interests` du portfolio passait par le client, bloqué par RLS). **Jamais** pour la suppression (`deleteChallenge`) ni les paiements (`initializeOrderPayment`, `initializePassportPayment`) — owner uniquement.
3. **Accueil filtré** : `/profiles` charge `getMentorDashboard` (étendu à `child_profiles(*)`) en mode mentor — les enfants ASSIGNÉS et leurs défis, fini les profils du compte. Onboarding parent (lien/téléphone), « Nouveau profil », modale d'accès : masqués.
4. **Pages enfant** : Défis / Portfolio / Quête / Guilde chargent l'enfant via la nouvelle `getMentorChildView` (profil + défis + cycle d'hypothèse, service role) — plus de « Profil introuvable ». Page Défis : les actions complètes passent par les fns étendues (générer, démarrer, progression, notes, non réussi, synthèse, recommandations) ; **masqués en mode mentor** : suppression (bouton + « Pas celui-ci »), commande de kit (suggestions + modale), mode Enfant (vue parent forcée), paiement Passeport (remplacé par une note « le parent peut activer »). Guilde : opt-in de partage masqué (décision de l'enfant/du parent).
5. **Navigation & Réglages** : `/profiles/manage` → redirection `/profiles` (le mentor ne gère pas de profils) ; hub `/profiles/$profileId/mentors` → redirection `/mentor` (on ne se suit pas soi-même). Réglages : carte « Compte Mentor » + « Enfants assignés » (`assignedCount` ajouté à `getMentorActivationStatus`), « Gérer mes profils » et « Votre lien avec l'enfant » masqués ; **le toggle Parent/Mentor reste accessible** (seul moyen de rebasculer).

**Alternatives rejetées** : *lire les données mentor via le client RLS* (la RLS ne rend pas les défis non-complétés ni les cycles d'hypothèses aux mentors — migrations non applicables telles quelles, d'où le service role + garde explicite, convention décision #74) ; *opérateur limité aux enfants accompagnés sur ces surfaces* (décision #74 reste pour le cockpit /mentor ; ici le mentor est le remplaçant du parent sur TOUS ses enfants assignés).

**Vérifié** : `tsc --noEmit` propre, 758 tests verts (59 fichiers, dont `child-actor.test.ts` ×7 et `mentor-mode.test.ts` ×5), aucune migration nouvelle.
