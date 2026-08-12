---
name: genizio-etat-code
description: État actuel de l'implémentation — snapshot vérifié contre le code réel
metadata:
  type: reference
  status: living-document
  last_updated: 2026-08-03
---

# État du Code

> Vérifié le 2026-08-12, branche `feat/naya-v4-modalites-apprentissage` (depuis `main` — PR #43 et #44 mergées, chantiers 1-2 en production).

## Snapshot du 2026-08-12 — Chantier 3 « Modes d'apprentissage » : boucle de réévaluation des modalités (décision #66, analyse §22-26, §35, §38)

**Branche** : `feat/naya-v4-modalites-apprentissage` (depuis `main` @ merges #43+#44). Contenu complet dans le Status Overview de [[MEMORY]].

**Migration appliquée et vérifiée** : `20260812170000_modality_reevaluation.sql` — `challenges.presentation_mode` (CHECK 9 modalités), événement `CHALLENGE_NOT_COMPLETED` (CHECK + trigger `log_challenge_observation` : branche not_completed + `presentation_mode` dans les payloads ASSIGNED/COMPLETED), `pedagogical_twins.presentation_signals` (branches échec/réussite dans `apply_observation_to_twin`). Probe fonctionnel réel : profil de test créé puis nettoyé par cascade, événement émis avec payload complet, Jumeau alimenté (persévérance 0.15 + `manipulation.failed=1`).

**Nouveaux modules** : `modalities.functions.ts` (PRESENTATION_MODES fermé, `canReformulate`, `resolveNextModality`, `parseReformulationContext`, `summarizeModalityAttempts`, `processModalityReformulation`, server fn `reformulateChallenge`), `modalities.test.ts` (22 tests).

**Modifiés** : `challenges.functions.ts` (submitChallengeNotCompleted — étape 5 : reformulation comme prochaine mission si cause accommodable, repli recommandation sinon), `naya-prompts.ts` (`MODALITY_SEMANTICS`, `buildReformulationPrompt`), `naya-verifier.functions.ts` (kind `reformulation`, rubrique 3 règles, `originalTitle` dans VerifyContext), `pedagogical-intention.ts` (traduction parent qualitative), types régénérés.

**Vérifié** : 529 tests verts (44 fichiers), `tsc --noEmit` propre, build OK.

**+ Chantier 4 « Calibration du temps » (décision #67, même branche, PR #45)** : migration `20260812180000_time_calibration.sql` (branche TIME_OVER dans `apply_observation_to_twin` — time_awareness faible), `time-calibration.functions.ts` (`suggestTimePressureChange` pure seuil 3/30 j, `getGentleTimeSuggestion` GET, `applyGentleTimeProposal` POST idempotent), carte « Plus de temps pour {enfant} ? » dans le portfolio (pattern « Une découverte de Naya », rejet localStorage, `time_pressure` ajouté au select). 535 tests verts, tsc propre, build OK.

**+ Chantier 5 « Boucle de réévaluation complète » (décision #68, même branche, PR #45)** : `failure-sequence.functions.ts` (`evaluateFailureSequence` pure — facteur = modalité gagnante ou « encore à explorer », garde-fou §35 ≥ 2 modalités ; `buildFailureNarrative` 0 chiffre / 0 verdict ; `getLatestFailureSequence` GET dérivée à la lecture), carte « Ce que Naya a compris » au Portfolio, Loup kind `failure_sequence` (rubrique 3 règles). 544 tests verts, tsc propre, build OK.

**+ Chantier 6 « Double contextualisation local → global » (décision #69, même branche, PR #45)** : `contextualization.ts` (0 IA — `normalizeCountryKey`, `localMaterialsForCountry` mapping 14 pays, `buildContextualizationInstruction` escalier), injection dans bulk + single + pont aspiration (`naya-prompts.ts`), `INTELLIGENCES_FIELD_INSTRUCTION` étendue (projet → 2 clés complémentaires). Aucune migration. 554 tests verts, tsc propre, build OK.

**+ Chantier 7 « Monde réel hors-app » — fondations (décision #70, même branche, PR #45)** : migration `20260812190000_talent_environment_signals.sql` — vue interne `talent_environment_signals` (complétions validées par l'IA par environnement × talent, `CROSS JOIN LATERAL` jsonb + garde `jsonb_typeof`), `REVOKE` pour anon/authenticated, `COMMENT ON VIEW` (non-exploitation). Probe vérifié : service role lit (5 lignes échantillon), anon bloqué. Aucun code applicatif.

**Clôture de la feuille de route Phase 4 restante** : les 5 chantiers (3-7) sont livrés sur `feat/naya-v4-modalites-apprentissage` (PR #45). 554 tests verts (44 fichiers), tsc propre, build OK. Migrations 2026081217/18/1900 poussées et vérifiées.

## Snapshot du 2026-08-12 — Chantier 2 « Naya V4 » : aspirations + défis-projets (décisions #64-65)

**Branche** : `feat/naya-v4-aspirations-projets` (depuis `feat/porte-entree-fondations-naya-v4`), contenu complet dans le Status Overview de [[MEMORY]].

**Migration appliquée et vérifiée** : `20260812160000_aspirations_engine_and_challenge_kind.sql` — `challenges.kind` (micro/projet), `challenges.guidance_level` (1-5), `challenges.aspiration_label`. Probe SQL : colonnes présentes.

**Nouveaux modules** : `aspiration-map.ts` (ponts curés + matching tolérant), `aspiration-confidence.ts` (statuts dérivés à la lecture), `aspiration-narrative.ts` (narration qualitative enfant/parent, 0 IA), `aspiration.functions.ts` (getAspirationCompass), `difficulty-map.ts` (biais §8), `ChallengeKindBadge.tsx`, `AspirationCompassCard.tsx`.

**Modifiés en profondeur** : `ProfileDialog.tsx` (parcours en 4 étapes, étape aspiration conditionnelle `shouldAskAspirations`, source « enfant »), `recommendations.functions.ts` (branche ASPIRATION, biais difficultés ESSAIMAGE/EXPLORATION), `challenges.functions.ts` (`resolveKind`/`resolveGuidanceLevel` dans finalizeChallenge, `formatProgressionInstruction` exportée), `naya-prompts.ts` (`buildAspirationBridgePrompt`, `KIND_GUIDANCE_INSTRUCTION`, specs JSON enrichies), `naya-verifier.functions.ts` (contexte aspirationLabel), Quête (boussole + badge), Portfolio (Univers explorés + badge), cartes de défi (badge Projet).

**Types régénérés** après migration (CLI local, jamais MCP — Key Principle #8).

**Tests** : 492 verts (42 fichiers), `tsc --noEmit` propre, build OK.

> La section historique ci-dessous (chantier 1 puis 2026-08-03) reste valable pour le contexte antérieur — le Status Overview de [[MEMORY]] est la source la plus à jour.

## Snapshot du 2026-08-12 — Chantier « Porte d'entrée » (décisions #59-63)

**Branche** : `feat/porte-entree-fondations-naya-v4` (depuis `main` @ `6ab51ee`), non mergée — contenu complet dans le Status Overview de [[MEMORY]].

**Migrations appliquées et vérifiées en base** (probe SQL directe) :
- `20260812120000_enforce_age_limit_5_16.sql` — CHECK `child_profiles_age_check` (5-16) actif : insertion probe age=17 refusée (23514) ; le profil de test « essaie2 » (19 ans, créé le jour de l'analyse) clampé à 16/birthdate null.
- `20260812130000_seasons_as_label_and_campaigns_independent.sql` — trigger d'auto-inscription supprimé, `season_enrollments.season_id` nullable.
- `20260812140000_adaptive_time_pressure.sql` — `time_pressure`, `time_limit_minutes`, type `TIME_OVER`.
- `20260812150000_multidimensional_child_profile.sql` — `school_level` (+CHECK), `languages`, `ability_profile`, `school_relation` (+CHECK), `life_context`, `aspirations`, `is_active`.

**Types régénérés** : `src/integrations/supabase/types.ts` via `supabase gen types --linked` (CLI local, jamais MCP — Key Principle #8).

**Nouveaux modules** : `src/lib/time-limit.ts` (résolution pure + note prompt), `src/lib/profile-context.ts` (vocabulaire fermé + `formatChildProfileContext`), `src/components/challenges/ChallengeCountdown.tsx` (chrono doux non-punitif), `src/components/admin/AdminProfilesTab.tsx` (10ᵉ onglet Admin).

**Modifiés en profondeur** : `challenges.functions.ts` (thème saison retiré des 2 générateurs, `time_limit_minutes` à l'assignation + repli au démarrage, `recordChallengeTimeOver`, gating `is_active` ×9 + pré-checks ×5), `naya-prompts.ts` (paramètres `timePressureNote`/`profileContextNote`), `ProfileDialog.tsx` (bornes âge + section « Contexte & aptitudes »), `admin-os.functions.ts` (4 fonctions admin), `child-access.ts` (fin du « +1 » fantôme), `child-profile-quota.ts` (formule orpheline supprimée).

**Bugs de production antérieurs toujours ouverts** (non touchés par ce chantier) : « Commencer le défi sans effet visible » (cause inconnue, décision #51) ; fix « bouton non réussi à todo » toujours dans un `git stash` non commité.

> La section historique ci-dessous (à partir de « Snapshot du 2026-08-03 ») reste valable pour le contexte antérieur — le Status Overview de [[MEMORY]] est la source la plus à jour pour l'historique complet.

## Snapshot du 2026-08-03 — PR #21 + PR #22 mergées et déployées

**Git** : `main` = `2cd451c` (merge PR #21, [[genizio-decisions]] #50) puis `cef4928` (merge PR
#22, [[genizio-decisions]] #49) — les deux confirmés mergés (`gh pr view`) ET déployés avec
succès sur Vercel (statut commit GitHub `"Deployment has completed"` vérifié sur les deux
commits de merge).

**Deux bugs de production découverts en testant après le déploiement de la PR #21** :
1. **✅ RÉSOLU (voir [[genizio-decisions]] #51)** — Carte "Avantage Secret de Naya"
   (`AcademicSecretCard`, `profiles.$profileId.challenges.tsx`) retombant sur son texte
   générique. L'hypothèse initiale ci-dessus ("seulement 2 des ~6 chemins de génération
   peuplent `academic_secret`") était **incomplète** — elle n'expliquait pas le rapport
   utilisateur sur un "single défi", justement l'un des 2 chemins censés déjà fonctionner.
   Cause racine réelle trouvée en traçant la chaîne complète client→serveur (pas seulement le
   point d'insertion) : les 2 pages qui assignent un défi depuis un aperçu généré
   (`profiles.$profileId.challenges.tsx` et `boutique.tsx`) reconstruisaient l'objet `template`
   envoyé à `assignTemplateChallenge` champ par champ, **sans jamais inclure `academic_secret`**
   (ni `academic_domain`/`academic_level_age`/`academic_reference_note`/`proof_mode`/
   `proof_target`/`declarative_award`/`trait_subform`) — le vrai secret généré par le serveur ne
   survivait donc jamais l'aller-retour client, quel que soit le chemin de génération. Corrigé
   avec les 6 chemins qui, eux, ne demandaient jamais le champ à l'IA en premier lieu. Voir
   [[genizio-decisions]] #51 pour le détail complet et les alternatives rejetées.
2. **Bouton "Le défi n'a pas pu être fait" absent au statut `todo`** (n'apparaissait qu'à
   `in_progress`) — cause confirmée et corrigée en code, mais **le fix n'est toujours pas
   commité**, toujours dans le même `git stash` qu'au 2026-08-03 (voir état Git ci-dessous, non
   déplacé lors du travail sur #51). Symptôme distinct et plus grave toujours **NON résolu** :
   cliquer sur "Commencer le défi" ne produit **aucun effet visible** (pas de changement d'état,
   pas de message d'erreur). Cause non identifiée. Piste en cours : demander à l'utilisateur si
   un rechargement complet (F5) fait apparaître "Terminer le défi" (mise à jour serveur réussie
   mais UI pas rafraîchie) ou si rien ne change même après (échec silencieux plus en amont,
   potentiellement dans `setStatus`/`updateChallenge`). Aucune requête directe en base n'a pu
   être faite pour trancher — l'outillage Supabase CLI disponible en session ne permet qu'un
   export complet de table, pas une requête ciblée (et le connecteur MCP Supabase reste interdit
   sur ce projet, cf. Key Principle #8).

**État Git local (toujours en attente de reprise propre)** : le correctif du bug #2 ci-dessus
(bouton visible aussi à `todo`) est toujours dans le même `git stash` non commité mentionné le
2026-08-03 (`git stash list` → un seul stash, intact, non touché par le travail sur #51 qui s'est
fait sur sa propre branche dédiée `fix/naya-academic-secret-generation` créée depuis `main` à
jour). À récupérer sur une nouvelle branche dédiée du même type quand ce bug sera traité.

**Deux découvertes d'outillage à ne pas re-diagnostiquer** :
- **Identité de déploiement Vercel** : un déploiement échoue si le commit est signé avec l'email
  noreply GitHub (`mercurebeauty-eng@users.noreply.github.com`, celui utilisé par tous les
  commits de fonctionnalité sur cette machine) plutôt que `mercurebeauty@gmail.com` (compte
  Vercel confirmé membre de l'équipe). Les commits de fusion "Merge pull request" créés par le
  bouton GitHub utilisent toujours le bon email et déploient correctement — c'est spécifiquement
  la preview d'une PR **avant** fusion qui peut échouer sur ce point. Cause exacte du changement
  de comportement entre la PR #20 (preview OK) et la PR #21 (preview en échec) non élucidée avec
  certitude — probablement un changement côté tableau de bord Vercel, hors visibilité de l'agent.
- **Port du serveur de dev local** : `@lovable.dev/vite-tanstack-config` (résidu de l'outil
  d'origine du projet, cf. Key Principle sur le code mort Lovable) a sa propre détection de
  "sandbox" (variables d'env `LOVABLE_SANDBOX`/`DEV_SERVER__PROJECT_PATH`) qui ne reconnaît pas
  l'environnement Claude Code — force donc systématiquement le port 8080, sans respecter le port
  assigné par l'outil de preview. Si un autre chat occupe déjà le port 8080, Vite bascule tout
  seul sur 8081 en interne pendant que l'outil de preview pointe vers un port différent assigné
  par le harness — navigation impossible tant que ça arrive. Pas de correctif appliqué (hors
  scope, nécessiterait de modifier/contourner un package tiers).

---

**Chantier "Génizio v2" en cours** — plan complet dans `C:\Users\USER\.claude\plans\refactored-soaring-prism.md`
(7 phases : dashboard v2 + nav bar persistante, portfolio, détail de défi, capture de résultat en
chat avec Naya, vue Quest enfant, partage mentor, réglages/consentement). Voir [[genizio-decisions]] #11.

**Phase 0 terminée (2026-07-16)** : migration `supabase/migrations/20260716125913_add_mentor_sharing_and_consent_tables.sql`
appliquée en production — nouvelles tables `child_mentors` (RLS: owner `FOR ALL` uniquement, pas
de policy anon/token — l'accès public par lien passera par `supabaseAdmin` côté serveur) et
`consent_events` (RLS: owner `SELECT`+`INSERT` uniquement, aucune policy UPDATE/DELETE — ledger
réellement append-only). A aussi capturé la policy `"Anyone can view completed challenges"` sur
`challenges`, active en prod depuis le fix RLS du 16/07 mais absente de toute migration jusqu'ici.
`SUPABASE_SERVICE_ROLE_KEY` ajouté à `.env` (récupéré via l'API Management, jamais affiché dans le
transcript). `src/integrations/supabase/types.ts` régénéré et contient bien `child_mentors`/`consent_events`.
Vérifié : RLS activée avec policies sur les 4 tables (`pg_class.relrowsecurity`), `/profiles`
charge sans erreur nouvelle (seule l'erreur préexistante "Profil enfant introuvable" liée au
mismatch de compte Google reste, sans rapport).

**Phase 1 terminée (2026-07-16)** : `/profiles/` (`src/routes/profiles.index.tsx`) est maintenant
le dashboard v2 (child switcher, carte défi actif via `getActiveChallenge`, "Pouls du portfolio"
via `getPortfolioPulse` — que des phrases qualitatives, jamais de pourcentage). L'ancien CRUD
grid déplacé tel quel vers `/profiles/manage` (`src/routes/profiles.manage.tsx`), composants
extraits dans `src/components/profiles/` (`ProfileCard.tsx`, `ProfileDialog.tsx`, `shared.ts`).
Nav bar persistante `src/components/AppTabBar.tsx` (Accueil/Défi/Portfolio/Mentors/Réglages,
bottom bar mobile → rail desktop) montée sur le dashboard. Stubs créés pour
`/profiles/$profileId/portfolio` et `/profiles/$profileId/mentors` (routes réelles en Phase 1b et
5) pour que les liens typés TanStack Router compilent sans casser la nav. `TalentRadarChart.tsx`
extrait en composant partagé (utilisé par `ProfileCard`, à réutiliser en Phase 1b/5).
Vérifié en direct : création d'un profil "TestPhase1" → `consent_events` a bien reçu la ligne
`child_profile_created` avec le bon `user_id`/`child_id` ; dashboard, switcher, stubs Portfolio/
Mentors et `/profiles/manage` fonctionnent tous sans erreur nouvelle.

**Phase 1b terminée (2026-07-16)** : `/profiles/$profileId/portfolio` implémenté pour de vrai
(remplace le stub) — radar (`TalentRadarChart`), portrait/synthèse via `getChildAISynthesis`
réutilisé tel quel, timeline des défis complétés, galerie d'artefacts (`proof_image_url`),
bouton "Partager un aperçu" inerte jusqu'à la Phase 5. `profiles.$profileId.challenges.tsx` migré
vers `<TalentRadarChart>` aussi (dédup, imports recharts/`talentData` devenus inutiles retirés).
Vérifié en direct sur TestPhase1 : portfolio et page défis rendent tous deux sans erreur nouvelle,
états vides corrects partout (0 défi complété).

**Stack :** TanStack Start (React 19, Vite 8, TanStack Router), Tailwind CSS 4, Supabase,
Recharts, VitePWA. Gestionnaire de paquets prévu : bun (bun.lock présent) — **mais bun n'est
pas installé sur cette machine**, dépendances installées via `npm install` à la place
(package-lock.json généré en complément de bun.lock).

**Ce qui est en place et fonctionne (vérifié 2026-07-15, pas re-audité ligne à ligne le
2026-07-16 — seule la marque/typo a changé depuis) :**
- **Base de données :** Tables `child_profiles`, `challenges` avec champs JSONB (`talents`, `target_intelligences`, `proof_image_url`, `ai_observations`).
- **Dashboard (`/profiles`) :** Liste des enfants, Radar Chart (Recharts) dynamique à partir des données de talents.
- **Laboratoire (`/laboratory`) :** Catalogue de missions par catégorie (Architecture, Sciences, Artisanat...).
- **Feed (`/feed`) :** Mur de célébration public avec badges basiques.
- **Détails & Validation (`/profiles/$profileId/challenges`) :** UI complète pour générer des défis (IA), suivre la progression, uploader une preuve (photo) et déclencher la validation IA.
- **Backend (Server Functions) :** `validateChallengeProof` et les fonctions de génération de défis (`callClaude` dans `src/lib/challenges.functions.ts`) appellent **directement l'API Anthropic** (`https://api.anthropic.com/v1/messages`, `ANTHROPIC_API_KEY` dans `.env`) — `claude-sonnet-5` pour l'analyse d'image (vision), `claude-haiku-4-5-20251001` pour le texte. ⚠️ Ceci contredit [[genizio-decisions]] #3 qui documentait Gemini Flash via Lovable Gateway — corrigé le 2026-07-16, voir la note d'audit dans ce fichier de décisions.

**Changements du 2026-07-16 (session en cours, non commités) :**
- Renommage marque Geniusio → Génizio dans tout `src/**` et `vite.config.ts` (cf. [[genizio-decisions]] #4).
- Favicon complet installé (`public/favicon.svg`, `favicon-96x96.png`, `favicon.ico`, `apple-touch-icon.png`, `web-app-manifest-{192,512}x512.png`, `site.webmanifest`) + balises `head()` dans `src/routes/__root.tsx` (cf. [[genizio-decisions]] #5).
- Police d'affichage changée Outfit → Fredoka dans `src/styles.css` (`--font-display`) et le lien Google Fonts de `src/routes/__root.tsx` (cf. [[genizio-decisions]] #6).
- Icône `/favicon-96x96.png` ajoutée à côté du wordmark "GÉNIZIO" dans les 6 navs + footer (cf. [[genizio-decisions]] #7).
- Auth simplifiée : email/mot de passe retiré de `src/routes/auth.tsx`, seul "Continuer avec Google" (Supabase OAuth) reste (cf. [[genizio-decisions]] #8).
- Séparation marque/mentor : "Génizio" (marque) vs **"Naya"** (mentor IA qui parle/observe/analyse) — appliqué dans `src/lib/challenges.functions.ts` (tous les prompts), `feed.tsx`, `laboratory.tsx`, `index.tsx` (ligne "Naya documente..."), `profiles.$profileId.challenges.tsx` (labels, toasts, textes de chargement) (cf. [[genizio-decisions]] #9).
- Avatar animé Naya implémenté : `src/components/NayaAvatar.tsx` (`framer-motion`), asset `src/assets/naya-avatar.png` (recadré depuis `Naya fav.jpg` fourni par l'utilisateur, nettoyé d'un damier de transparence peint en pixels via flood-fill), intégré dans `laboratory.tsx` et `profiles.$profileId.challenges.tsx`.
- Mémoire projet migrée de `docs/memoire/geniusio_*.md` vers `docs/memoire/genizio_*.md`.
- **`.env` retiré du suivi git** (commit `561152e`) — était commité + poussé sur GitHub (repo privé) avec `ANTHROPIC_API_KEY` en clair. Fichier local intact, juste plus tracké.
- **Faille RLS corrigée en production** sur `public.child_profiles` — policy `"Anyone can view child profiles"` (`qual: true`) permettait à tout compte authentifié de lire tous les profils enfants. Remplacée par une policy scopée aux profils ayant un défi complété. Appliquée directement via l'API Management Supabase, reportée dans `supabase/migrations/20260716120000_fix_child_profiles_public_select_policy.sql`. Détail complet : [[genizio-decisions]] #10.

**Fichiers modifiés/non trackés en attente de commit (vu via `git status` le 2026-07-16) :**
modified: `.env`, `package.json`/`package-lock.json`, `public/favicon.ico`,
`src/integrations/supabase/types.ts`, `src/lib/challenges.functions.ts`, `src/routeTree.gen.ts`,
`src/routes/__root.tsx`, `src/routes/auth.tsx`, `src/routes/index.tsx`,
`src/routes/profiles.$profileId.challenges.tsx`, `src/routes/profiles.tsx`, `src/styles.css`,
`vite.config.ts` — untracked: `.claude/`, `docs/`, tous les nouveaux fichiers favicon dans
`public/`, `src/routes/feed.tsx`, `laboratory.tsx`, `profile.tsx`, `profiles.index.tsx`, et
plusieurs migrations SQL sous `supabase/migrations/`.
→ Rien de tout ça n'est encore commité. Ne pas supposer que l'historique git reflète l'état
réel du code sans vérifier `git status` d'abord.

**Attention / Points de vigilance :**
- Le bucket `proofs` de Supabase Storage doit être créé manuellement par l'utilisateur via le script SQL généré (`supabase/migrations/20260715181500_create_proofs_bucket.sql`), car la CLI locale n'avait pas les droits d'exécution distante (`db push` a échoué avec 403).
- La police "Fredoka" est une estimation visuelle du logo, pas une valeur confirmée par un guide de marque (cf. [[genizio-decisions]] #6, section "Non vérifié").
- Le repo a été copié depuis `C:\Users\USER\.gemini\antigravity\scratch\geniusio` vers `C:\Users\USER\Documents\GENIZIO` (2026-07-16), `node_modules` exclu et réinstallé.
