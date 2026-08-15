---
name: genizio-plan-multicouche
description: Plan de mise à niveau transversale — architecture multicouche (Parent/Mentor/Admin) pensée pour l'échelle 3000+ enfants
metadata:
  type: project
  status: planifie-non-implmente
  last_updated: 2026-08-15
---

# Plan de mise à niveau transversale — Architecture multicouche Genizio

> **Source** : document « Architecture fonctionnelle et modèle de rôles — Genizio » (2026-08-15) — principe fondateur : *concevoir chaque fonctionnalité directement pour l'échelle réelle (1 000–3 000 enfants et plus), jamais pour 50 utilisateurs puis « scaler après »*.
>
> **Méthode** : chaque point de la spec a été croisé avec le code réel (schéma + RLS lus dans les 86 migrations, Admin OS, mode Mentor, dashboards, requêtes client/serveur). Les constats sont **[observés]** (relus dans le code, fichier:ligne) ou **[hypothèse]** (à valider sur le terrain).
>
> **⚠️ Statut : PLANIFIÉ, rien de ce document n'est implémenté.** Respecte les conventions du repo : migrations revues avant d'être poussées en prod, types régénérés (`supabase gen types typescript --linked`, jamais le MCP), 675 tests verts, `tsc --noEmit` propre, build OK.

---

## 1. Verdict global

**Ce qui est solide (à conserver tel quel) :**
- **[observé]** Le modèle `mentors` distingue déjà **ownership** (parent, `child_profiles.user_id` / `challenges.user_id`) et **assignment** (mentor, table `mentors` + `created_by_user_id`) — la fondation de la spec §14-15 est posée.
- **[observé]** Toutes les écritures mentor passent par un **choke-point unique** (`assertMentorOperator` dans `src/lib/mentor-operator.ts:63-97` : statut actif + assignation active + accompagnement pack/campagne) + journal d'audit `mentor_actions` — pattern « l'UI n'est jamais la sécurité » déjà respecté.
- **[observé]** Quotas garantis en base par trigger (`check_mentor_quota`, plafond 5), index partiel UNIQUE « un mentor actif par enfant », soft-retire `removed_at`.
- **[observé]** Exactly-une-fois pour l'argent (CAS), fonctions pures testées, RLS activée sur toutes les tables, REVOKE systématique des fonctions SECURITY DEFINER (une exception, voir A2).

**Ce qui ne passe pas l'échelle 3000+ (le cœur du plan) :**
1. **Aucun parcours d'assignation « Parent → Enfant → Mentor »** : l'admin choisit l'enfant dans un `<select>` de **tous** les enfants (charge la table entière, `mentors.functions.ts:22-32`) — exactement l'anti-pattern dénoncé par la spec §2-3.
2. **Aucune recherche parent par email/téléphone** nulle part (spec §23).
3. **`listAllUsers`** (scan complet de l'annuaire auth, 200 comptes/page) appelé dans **~8 fonctions**, dont `getMentorDashboard` (à chaque visite du mentor) et `getChildMentorInfo` (à chaque visite du hub parent) — O(nombre de comptes) par chargement.
4. **5 fonctions admin chargent des tables entières** (KPIs Exécutif, Commerce, Talents, Naya, Progression) et agrègent **en mémoire** + rendent tout en DOM sans pagination.
5. **Index RLS manquants** (`challenges.status`, `orders.user_id`, et surtout `season_enrollments` qui n'a **aucun index**) — les policies publiques forcent des seq scans.
6. **Policies publiques trop larges** : photos de preuve d'enfants lisibles par `anon` (bucket `proofs`), `notes` (journal du parent) exposées à tout compte connecté via « Anyone can view completed challenges ».
7. **Pas de code d'activation Mentor** (spec §7) et **route `/mentor` non gardée** par `checkIsActiveMentor`.

---

## 2. Matrice de conformité spec ↔ code

| § spec | Exigence | État réel | Écart |
|---|---|---|---|
| §2-3 | Assignation relationnelle Parent → Enfant → Mentor | ❌ | `<select>` de tous les enfants ; aucune recherche parent |
| §5-6 | Une seule app, plusieurs modes | ✅ | Deux routes (`/profiles`, `/mentor`) pour le même compte |
| §7 | Activation du mode Mentor par code | ❌ | Aucun mécanisme ; seule l'assignation admin existe |
| §8 | Changement de contexte perceptible | ⚠️ | Aucun marqueur visuel « Mode Mentor » ; pas de garde de route |
| §9 | Le mentor n'ajoute pas d'enfants | ✅ | Aucun chemin de création côté mentor |
| §10-11 | Parent = autorité ; Mentor = permissions limitées | ✅ | Parent garde `user_id` ; mentor via service role + assert |
| §13 | Bascule libre entre les deux périmètres, jamais mélangés | ✅ | Routes séparées = périmètres séparés ; aucun mélange |
| §14 | RLS = périmètre réel (ownership vs assignment) | ⚠️ | Distinction en base ✅ ; lectures mentor par service role + assert, pas de policy RLS de lecture sur `child_profiles`/`challenges` |
| §15 | Deux relations modélisées séparément | ✅ | `child_profiles.user_id` (parent) + `mentors` (assignation) |
| §17 | Section « Mentor » côté parent | ✅ | Hub `/profiles/$profileId/mentors` (décision #76) |
| §19-21 | Dashboard adaptatif, penser en contexte | ⚠️ | Vrai en pratique ; à formaliser comme règle (E4) |
| §22-23 | Admin OS pour milliers d'enfants : recherche progressive, filtres, pagination | ❌ | Listes non bornées, recherche limitée au nom, pagination en mémoire, pas de téléphone |

---

## 3. Principes transverses (règles permanentes du projet)

Avant chaque future implémentation, la question obligatoire : **« Que se passe-t-il à 3 000 enfants ? »**. Les règles dérivées :

1. **L'UI n'est jamais la sécurité** — toute restriction existe en base (RLS) ou au choke-point serveur (`assert*`), jamais par masquage d'interface.
2. **Ownership ≠ assignment** — parent = relation principale ; mentor = relation d'assignation. Deux chemins d'accès distincts, jamais fusionnés.
3. **Recherche par relation, jamais par défilement** — « quelle information l'utilisateur connaît-il vraiment ? » (email parent > nom d'enfant pour l'admin).
4. **Toute liste = pagination + borne + index** — `.select()` sans `.limit()` ni `.range()` est une régression ; la pagination s'applique en SQL (pattern `listSponsorshipsAdmin`, `seasons.functions.ts:504+`), jamais en mémoire après fetch complet.
5. **Pas de scan complet** — `listAllUsers` est banni des chemins chauds ; résolution ciblée par `getUserById` en parallèle (pattern `listMentorsAdmin`, `mentors.functions.ts:152-165`).
6. **Aggrégations en SQL** (COUNT/GROUP BY/FILTER), jamais en mémoire côté client.
7. **Tout tiers qui écrit → journal d'audit** (pattern `mentor_actions`, `generation_audits`).
8. **L'argent est exactly-once** — CAS + idempotence (déjà acquis, à ne pas régresser).
9. **Règle pure testée avant câblage** — toute décision (quota, accompagnement, score) vit dans une fonction pure testée (pattern du repo).
10. **Jamais de « vérifié en prod » sans probe** (décision #34) — chaque vague du plan inclut ses probes.

---

## 4. Pilier A — Base de données : index, sécurité, hygiène

### A1. Index manquants (une migration idempotente)

**[observé]** Colonnes filtrées par des policies RLS / triggers / requêtes chaudes et **non indexées** :

| Table | Colonnes | Pourquoi | Priorité |
|---|---|---|---|
| `season_enrollments` | `(campaign_id)`, `(user_id)`, `(child_id)` | **Aucun index du tout** ; table B2B à plus forte croissance (1 ligne/enfant/campagne) ; utilisée par policy RLS, trigger `check_campaign_capacity`, `resolveChildAccompaniment` | P0 |
| `challenges` | `(status)` + partiel `(child_id, status) WHERE deleted_at IS NULL` | Policy publique « Anyone can view completed challenges » → seq scan sinon | P0 |
| `orders` | `(user_id)` | Policy RLS `auth.uid() = user_id` | P1 |
| `observation_events` | `(user_id)` | Policy RLS ; table append-only la plus volumineuse | P1 |
| `trait_series` | `(user_id)` | Policy RLS ; grossit à chaque événement | P1 |
| `hypothesis_cycles` | `(user_id)` | Policy RLS | P1 |
| `posts` | `(created_at)`, `(child_profile_id)` | Tri du feed + jointures | P2 |
| `comments` | `(post_id)` | Jointure feed | P2 |

### A2. Corrections sécurité (P1)

- **[observé]** `activate_season(target_id)` (`20260726110000:26-41`) : `SECURITY DEFINER` **sans REVOKE EXECUTE** → RPC publique d'écriture appelable par `anon`. Ajouter `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` (le repo le fait partout ailleurs — c'est un oubli).
- **[observé]** Bucket `proofs` : `public = true` + policy SELECT **anon** (`20260715181500:8-10`) → les photos de preuve de tous les enfants sont publiques sans authentification. **⚠️ Correctif différé (2026-08-15)** : le code stocke des **URLs publiques** de preuves (`challenges.functions.ts:2092` → `getPublicUrl`, affichées partout via `challenges.proof_image_url`) — rendre le bucket privé casserait l'affichage de toutes les preuves. La privatisation exige le passage aux **URLs signées** sur toutes les surfaces d'affichage → **vague dédiée** (item A2 de ce pilier, à ajouter à la Vague 6 ou vague intermédiaire).
- **[observé]** Policy « Anyone can view completed challenges » expose **toutes les colonnes** (dont `notes` — le journal du parent — et `proof_image_url`) à tout compte connecté. **Correctif** : vue dédiée ne projetant que ce qui doit rester public (titre, domaine, badge) et migration des consommateurs, ou restriction de la policy. *Décision porteur (D2).*
- **[observé]** `supabase/full_migration_for_new_db.sql` = snapshot périmé (125 lignes, 2 tables, vs 86 migrations) — piège pour toute remise à zéro d'une base. Le régénérer depuis l'historique de migrations ou le supprimer.

### A3. Vérification à faire en prod

- **[hypothèse]** Seules 4 tables ont des `GRANT` explicites ; les autres reposent sur les default privileges Supabase. Vérifier en prod que `authenticated` a bien les GRANT par défaut, sinon les policies sont inertes côté client.

---

## 5. Pilier B — RLS : matérialiser ownership vs assignment (spec §14)

### B1. Lectures mentor via RLS (défense en profondeur)

**État actuel** : les lectures du mentor passent par le service role + `assertMentorOperator` (sûr côté serveur), mais un compte mentor n'a **aucune policy RLS** lui permettant de lire `child_profiles`/`challenges` directement — la spec §14 exige que le périmètre existe au niveau des données, pas seulement des fonctions.

**Correctif** (lecture seule, jamais d'écriture) :

```sql
-- child_profiles : le mentor actif assigné lit le profil de l'enfant
CREATE POLICY "Mentors read profiles of assigned children"
  ON public.child_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mentors m
    WHERE m.child_profile_id = child_profiles.id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL));

-- challenges : même périmètre, lecture seule
CREATE POLICY "Mentors read challenges of assigned children"
  ON public.challenges FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.child_profile_id = challenges.child_id
      AND m.mentor_user_id = auth.uid()
      AND m.removed_at IS NULL));
```

- Couvertes par l'index `mentors_mentor_user_id_idx` (déjà en place).
- Les écritures restent **exclusivement** service role + `assertMentorOperator` (choke-point unique conservé) — la policy ne sert qu'à cloisonner les lectures directes.
- Probes : requête en tant que rôle mentor (SELECT autorisé sur l'enfant assigné, refusé sur un autre), en tant que parent (inchangé), en tant que mentor retiré (`removed_at` → refus).

### B2. Table `parent_profiles` — le contact parent requêtable (P0)

**[observé]** Email et téléphone du parent vivent dans `auth.users` (non requêtable en SQL, non indexable, non soumis à RLS) — d'où les scans `listAllUsers` pour résoudre 1-5 contacts. Le téléphone est même dans `user_metadata`, pas dans une colonne native.

**Correctif** — table miroir applicative :

```sql
CREATE TABLE public.parent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone text,
  display_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parent_profiles_phone_idx ON public.parent_profiles(phone);
CREATE INDEX parent_profiles_email_idx ON public.parent_profiles(email);
-- trigger : sync depuis auth.users (insert/update) — email + user_metadata.phone
-- RLS : SELECT pour soi ; lecture mentor via service role + assert ; admin service role
```

Bénéfices en chaîne :
- `searchParentsAdmin` par email/téléphone/nom devient du SQL indexé (spec §23) ;
- fin de `listAllUsers` dans `getMentorDashboard` (`mentors.functions.ts:825`) et `getChildMentorInfo` (`:745`) → 1 requête SQL ciblée ;
- les lectures mentor du téléphone parent passent par service role + `assertMentorOperator` (pas de policy directe sur le téléphone).

### B3. Vérification GRANT + audit `pg_policies` (Key Principle #7)

Chaque vague inclut un probe réel en base : `pg_policies` comparé aux migrations, et une requête par rôle (parent, mentor, admin, anon) sur les tables critiques.

---

## 6. Pilier C — Workflow d'assignation Admin : Parent → Enfant → Mentor (spec §2-3, §22-23)

### C1. Nouvelles fonctions serveur (admin uniquement)

| Fonction | Comportement |
|---|---|
| `searchParentsAdmin(query)` | Recherche indexée SQL sur `parent_profiles` (email exact ilike, téléphone, nom) → max 20 résultats, paginée |
| `getChildrenOfParentAdmin(parentId)` | Enfants du parent, paginés (20/page), avec âge, statut d'activité, mentor actuel éventuel |
| `searchMentorsAdmin(query)` | Mentors par email/nom, paginés, avec statut (`mentor_profiles`) et quota restant |
| `assignMentorToChildAdmin(parentId, childId, mentorId)` | **Réutilise `insertMentorAssignments`** (`mentors.functions.ts:341-381`) — le choke-point unique (statut, contrainte UNIQUE partielle, trigger quota) reste l'autorité finale |

### C2. Refonte de la modale d'assignation (`AssignMentorModal`)

Le workflow spec §3, en 4 étapes :

1. **Rechercher le parent** (email / téléphone / nom — jamais une liste) ;
2. **Choisir l'enfant** parmi les enfants de CE parent (carte : nom, âge, mentor actuel s'il y en a un) ;
3. **Choisir le mentor** (email/nom + statut + quota) ;
4. **Confirmer** avec récapitulatif de la relation (Parent → Enfant → Mentor).

Suppression de `listChildProfilesAdmin` (`mentors.functions.ts:22-32`, select non borné) et du `<select>` de milliers d'enfants. Les modes « enfant précis » et « campagne » (cohorte) coexistent ; le mode campagne conserve sa logique actuelle (pioche dans `season_enrollments`, bornée).

### C3. Filtres avancés (spec §23) — à la vague 4

Une fois la recherche relationnelle en place : filtres par statut, par campagne, par mentor actuel, par âge, par groupe — en params SQL (`searchChildProfilesAdmin` étendu), jamais en mémoire.

### C4. Bannir `listAllUsers` des chemins chauds

Remplacement systématique par `getUserById` parallèle (pattern existant) + `parent_profiles` (B2). Audit de ses ~8 appelants (KPIs, Commerce, searchChildProfiles, assignMentor, getChildMentorInfo, getMentorDashboard, assignMentorToCampaignAdmin, assignCampaignMentor, getSubscriptionsDataAdmin).

---

## 7. Pilier D — Pagination & bornes : toutes les listes

### D1. Admin OS (9 onglets)

**[observé]** Synthèse des fonctions à corriger (détail fichier:ligne dans l'audit) :

| Fonction | Problème | Correctif |
|---|---|---|
| `getExecutiveKPIsAdmin` (`admin-os.functions.ts:624`) | users + child_profiles + challenges complets, agrégés en mémoire, rendus en DOM intégral | KPIs en SQL (COUNT/GROUP BY/FILTER) + annuaire paginé 50 |
| `getCommercePassportsDataAdmin` (`:912`) | toute la table `orders` + tous les enfants + tous les comptes | Pagination SQL + filtre de statut en SQL |
| `getNayaTelemetryAdmin` (`:845`) | 4 tables complètes | Pagination + agrégats SQL |
| `getProgressionHealthAdmin` (`:789`) | tous les défis | Agrégats SQL bornés (fenêtre glissante) |
| `getTalentCityStatsAdmin` (`:707`) | child_profiles + orders complets | Agrégats SQL |
| `getSubscriptionsDataAdmin` (`subscriptions:744`) | subscriptions + credits + users complets | Pagination SQL |
| `listPaymentsAdmin` (`payments-admin:39`) | `limit(100)` = troncature silencieuse | Pagination offset explicite (count + range) |
| `listCampaignTokensAdmin` (`campaigns:677`) | tous les tokens d'une campagne | Pagination SQL |
| `listMentorsAdmin` (`mentors:83`) | fetch complet des assignations, pagination en mémoire | `count exact` + `.range()` en SQL (pattern `listSponsorshipsAdmin`) |
| `listCampaignsAdmin` (`campaigns:189`) | pagination en mémoire | Acceptable (volume dizaines, contrat B2B) — documenter la borne |
| `listSponsorshipsAdmin` | ✅ | **Référence à généraliser** |

Chaque liste de l'Admin OS doit afficher la pagination réelle (le composant `AdminPagination` existe déjà — il est aujourd'hui masqué tant que `totalPages <= 1`, ce qui rend la dégradation invisible).

### D2. Côté parent

- **[observé]** `profiles.index.tsx:266-271`, `quest.tsx:110` (`.select("*")` sans filtre `deleted_at`), `portfolio.tsx:313-319`, `challenges.tsx:567,573` : historiques de défis chargés intégralement par enfant → **pagination (20) ou chargement progressif**, avec filtre `deleted_at` systématique.
- `exportUserData` (`account.functions.ts:10-13`) : `.select("*")` sans borne ni filtre `deleted_at` → bornes + projection (RGPD).

### D3. Dashboard mentor (`getMentorDashboard`, `mentors.functions.ts:756`)

- Tous les défis de tous les enfants assignés, sans limite, avec les colonnes lourdes (`description`, `steps`, `materials`, `pedagogical_context`) → **limit + projection restreinte à l'UI + pagination par enfant**.
- Boucle séquentielle `resolveChildAccompaniment` (2 requêtes/enfant) → `Promise.all` en parallèle (bornée par le quota ≤ 5, mais la paralléliser coûte rien).
- `listAllUsers` → `parent_profiles` (B2).

---

## 8. Pilier E — Mode Mentor : garde, activation, contexte (spec §7-9, §13, §19-21)

### E1. Garde de la route `/mentor`

**[observé]** La route n'exige que la session (`mentor.tsx:171-173`) ; tout compte connecté y accède et voit « Aucun enfant assigné ». **Correctif** : middleware `checkIsActiveMentor` (existe déjà, `mentors.functions.ts:886`) sur la route — les données restent protégées serveur, mais l'UI ne doit pas être offerte aux non-mentors.

### E2. Activation du mode Mentor — deux options, décision porteur (D1)

- **Option A — self-service par code (alignée spec §7)** : table `mentor_activation_codes` (code unique généré par l'admin, `valid_until`, `used_by`, `used_at`) + section « Paramètres → Mentor » où l'utilisateur saisit son code → activation (`mentor_profiles` créé, statut `active`). Sécurité : code à usage unique, expiration, journal dans `mentor_actions`. Coût faible (1 migration + 2 fonctions + 1 section UI). *Recommandée* : c'est le seul chemin qui fait évoluer le bassin de mentors sans friction admin, et la spec la décrit explicitement.
- **Option B — assignation admin seule** (état actuel) : zéro changement, mais chaque mentor nécessite une action admin.

### E3. Contexte visuel Mentor (spec §8)

Badge « Mode Mentor » persistant + repère visuel (variable CSS de thème) sur `/mentor`. Règle formelle : **les deux périmètres ne partagent aucun composant de liste d'enfants** (aujourd'hui garanti par la séparation des routes — à verrouiller par revue).

### E4. Formaliser « penser en contexte, pas en page » (spec §21)

Documenter la règle : un même moteur fonctionnel, un contexte actif (parent/mentor) qui détermine périmètre de données, actions, permissions et filtres. État actuel conforme (dashboard parent vs `getMentorDashboard`) — à écrire dans la mémoire comme contrainte de conception (spec §26).

---

## 9. Pilier F — Performances : agrégations SQL & surveillance

- Les KPIs admin passent en SQL : `COUNT(*) FILTER (WHERE ...)`, `GROUP BY`, fenêtres temporelles — jamais de boucle TS sur des tables entières.
- **[hypothèse]** À 3 000 enfants, index + SQL suffisent ; les vues matérialisées (journal quotidien d'exécutif, activité mentor) ne sont à envisager que si les probes montrent des requêtes > 300 ms après la vague 4.
- Instrumentation : vérifier que `pg_stat_statements` est actif et établir une liste des 10 requêtes les plus lentes après chaque vague (probe réel).
- Garde-fou coût IA : déjà en place (`generation_audits`, garde-fous du Loup) — inchangé.

## 10. Pilier G — Robustesse & surveillabilité

- **Nouveaux chemins d'écriture** (activation code si Option A) → journal `mentor_actions` étendu (type `activation`).
- **Anti-abuse** : quotas en trigger (déjà), CAS sur l'argent (déjà), codes à usage unique (E2), RPC publiques auditées (A2).
- **Tests** : chaque règle pure testée (pattern du repo) ; tests d'intégration RLS par rôle (probes) ; la suite doit rester ≥ 675 tests verts + `tsc` + build à chaque PR.
- **Garde-fou mémoire** : toute vague livrée → mémoire mise à jour avec probes réels, jamais d'affirmation sans vérification (décision #34).

---

## 11. Ordre d'exécution (vagues)

| Vague | Contenu | Sortie vérifiable |
|---|---|---|
| **V1 — Fondations DB** | A1 (index) + A2 (sécurité) + A3 + B2 (`parent_profiles` + trigger) en une migration idempotente | Migration revue, types régénérés, probes RLS par rôle, 675+ tests verts |
| **V2 — RLS mentor** | B1 (policies lecture mentor) + B3 | Probes : mentor lit son enfant assigné, refusé partout ailleurs ; mentor retiré refusé |
| **V3 — Recherche admin** | C1 + C2 (workflow Parent → Enfant → Mentor) + C4 (fin de `listAllUsers` dans les chemins mentor) | **✅ Livrée (2026-08-15, code seul)** : `searchParentsAdmin`/`getChildrenOfParentAdmin`/`searchMentorsAdmin`/`assignMentorToChildAdmin` via `parent_profiles` ; modale refondue en 4 étapes ; `assignMentor`/`listChildProfilesAdmin` supprimés ; fin de `listAllUsers` dans `getMentorDashboard`/`getChildMentorInfo`/`assignMentorToCampaignAdmin` |
| **V4 — Pagination** | D1 (9 onglets) + D2 (parent) + D3 (mentor) + C3 (filtres avancés) | **✅ Batch 1 (2026-08-15)** : Exécutif (KPIs en SQL via RPC `compute_executive_kpis` + annuaire paginé 20, fin de `listAllUsers`) ; Mentors (`listMentorsAdmin` paginé par mentor — UUID léger + slice + recherche email SQL) ; Paiements (`listPaymentsAdmin` page/status/count, fin de la troncature à 100 + `parent_profiles`). **✅ Batch 2 (2026-08-15)** : fin de `listAllUsers` dans Commerce/Abonnements/Codes de campagne ; côté parent : filtre `deleted_at` manquant corrigé + bornes ; dashboard mentor : borne 200 + `resolveChildAccompaniment` parallélisé. **✅ Batch 3 (2026-08-15)** : Naya telemetry en comptages SQL exacts (fini les chargements complets challenges/hypothesis_cycles/child_profiles — seul le journal `generation_audits` du Loup reste chargé) ; commandes du Commerce paginées (page/statut/count + comptages par statut globaux, `AdminPagination`). **Reste (batch 4)** : agrégats SQL Progression/Talents + `generation_audits` (vues matérialisées si probes > 300 ms) |
| **V5 — Mode Mentor** | E1 + E2 (décision D1) + E3 | **✅ Livrée (2026-08-15)** : migration `20260815180000_multicouche_v5_mentor_activation.sql` poussée en prod (table `mentor_activation_codes` + RPC `activate_mentor_code` atomique, auth.uid() vérifié dans la fonction) ; `generateMentorActivationCodesAdmin`/`listMentorActivationCodesAdmin`/`activateMentorCode` ; carte « Paramètres → Mentor » dans profile.tsx ; garde de route `/mentor` (`checkIsActiveMentor`, écran réservé) ; badge « Mode Mentor » ; panneau admin « Codes d'activation » dans l'onglet Mentors |
| **V6 — Supervision** | F + G | **✅ Livrée (2026-08-15)** : artefact `supabase/monitoring/multicouche-checkup.sql` (10 requêtes lentes pg_stat_statements, scans séquentiels, tailles de tables, probes RLS mentor, activité mentor/bilans) ; **probes prod réels** : `compute_executive_kpis` (8 enfants / 75 défis / 22 complétés / actifs 7j=6, 30j=8) et `compute_progression_health` (stale + durée moyenne par domaine) OK via service role ; backfill `parent_profiles` vérifié (3 comptes, email/téléphone/created_at peuplés) ; table `mentor_activation_codes` en place (vide, normal). `pg_stat_statements` [hypothèse] à confirmer dans Studio (section 1 du checkup) |

Contraintes par vague : branche dédiée → PR → migration **non poussée avant revue** → types régénérés → tests verts → `tsc` → build → probes en prod → mémoire.

## 12. Décisions à trancher par le porteur

- **D1 — Activation mentor** : Option A self-service par code (recommandée, spec §7) ou Option B assignation admin seule ?
- **D2 — Policies publiques** : le Mur public est retiré du produit — faut-il (a) restreindre `proofs` à `authenticated` + supprimer la policy « Anyone can view completed challenges », ou (b) les conserver pour un retour futur du mur ?
- **D3 — `parent_profiles`** : OK pour la table miroir de contact (email/téléphone requêtable) ? C'est le prérequis de la recherche §23 et de la fin des scans d'annuaire.

> **Décisions retenues le 2026-08-15** : **D1 confirmée par le porteur = Option A (self-service par code d'activation, spec §7 — Vague 5)** ; D2 = restreindre les policies publiques « Mur public » (appliqué en V1) — **volet bucket `proofs` reporté** : les preuves sont servies par URLs publiques stockées en base, la privatisation exige des URLs signées (vague dédiée) ; D3 = oui, `parent_profiles` créée (migration `20260815130000_multicouche_v1_foundations.sql`).

## 13. Risques résiduels

- **Modèle de données futur** : si École/Fondation/ONG deviennent des rôles à part entière (backlog), le pattern « relation supplémentaire » (comme `mentors`) doit être réutilisé, jamais un champ de plus sur `child_profiles` — la spec §15 l'exige déjà.
- **Vues publiques** : toute nouvelle surface publique doit passer par une vue dédiée (jamais la table), pattern déjà recommandé par le backlog (vue Postgres du Mur public).
- **Cascade de suppression** : `child_profiles` ON DELETE CASCADE efface défis/preuves/historique — les suppressions admin passent par soft states (`is_active`, `access_locked_at`, soft-delete) ; ne jamais introduire de suppression physique de profil sans revue d'impact sur `mentor_reports`/`payments`/`challenge_outcomes`.
