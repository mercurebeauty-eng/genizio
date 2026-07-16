---
name: genizio-etat-code
description: État actuel de l'implémentation — snapshot vérifié contre le code réel
metadata:
  type: reference
  status: living-document
  last_updated: 2026-07-16
---

# État du Code

> Vérifié le 2026-07-16, branche `main` @ `561152e` ("Stop tracking .env and ignore secrets
> going forward") + modifications non commitées ce jour (voir liste ci-dessous). Si `git log -1`
> montre un commit plus récent que `561152e` au moment de la lecture, re-vérifier avant de
> croire cette section.

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
