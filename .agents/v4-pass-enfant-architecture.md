# Génizio V4 — « Pass Enfant » : architecture produit & carte d'impact systémique

> **Statut** : design en cours (2026-08-14) — aucune implémentation commencée.
> **V0 livrée (2026-08-14)** : bug `childrenCount` corrigé, cutover grand-péré centralisé
> (`isGrandfatheredAccount`), décisions 1-2 tranchées (pack PAR ENFANT, campagne 2 COMPTEURS).
> **Porteur** : fondateur. **Références** : discussion pricing (80-100k F/séance marché),
> clarifications : campagne = portefeuille (app ET/OU accompagnement), séance 5 000 F,
> bilan 25 000 F, partage 70/30 (65-75 selon score), prix app inchangé.
> **Principe de travail** : chaque section modifiée implique des changements en cascade —
> ce document trace TOUS les touchpoints pour ne rien perdre en route.

---

## 1. Vision — l'unité commerciale change

**Aujourd'hui** : le produit vend des *créations de profils* (quotas) et de l'*accès app*,
avec 5 mécanismes de couverture en parallèle (plancher, quota_override, abonnement,
crédit parrainage, campagne). Chaque nouvelle demande = une exception de plus dans le
trigger et le résolveur.

**V4 — Le Pass Enfant** : l'unité devient **enfant × mois (ou enfant × séance)**.
Tout le reste (abonnement, pack d'accompagnement, campagne, octroi admin) est une
**source de couverture** qui alimente cette unité.

Trois couches de valeur, trois prix (ne plus confondre) :
| Couche | Produit | Prix | Volume |
|---|---|---|---|
| Outil IA | Génizio Accès | 1 gratuit, forfait 5k→15k F/mois, **inchangé** | Masse |
| Accompagnement humain | Génizio Accompagné | Séance 5 000 F, bilan 25 000 F | Nouveau |
| Coordination/réseau | Formation + commission | Certif payante + 30% (25-35%) | Marge |

**Principe unique** : *« un enfant est couvert si une couverture active existe »* —
deux règles, pas trente.

---

## 2. Modèle de données cible

### 2.1 Nouvelle table : `family_coverages` (le cœur de la V4)

```
family_coverages(
  id            uuid PK,
  user_id       uuid FK auth.users,           -- famille couverte
  child_id      uuid NULL FK child_profiles,  -- DÉCISION 2026-08-14 : non-null pour
                                              -- source='accompaniment_pack' (le pack est PAR
                                              -- ENFANT) ; null pour les couvertures famille/app
  source        text CHECK (subscription|accompaniment_pack|campaign|admin),
  source_ref    uuid,                          -- abonnement_id / pack_id / campagne_id / NULL
  starts_at     timestamptz,
  ends_at       timestamptz,
  max_children  int,                           -- plafond app (0 = illimité app ?)
  sessions      int,                           -- budget séances accompagnement (par mois)
  sessions_used int DEFAULT 0,
  price_xof     numeric,                       -- trace de ce qui a été payé
  status        text CHECK (active|used|expired|revoked) DEFAULT 'active',
  created_at    timestamptz
)
```

**Ce que ça remplace** (aucune donnée perdue, migration de données) :
- `quota_override` (app_metadata) → ligne `source='admin', max_children=N`
- Couverture campagne (trigger `20260814160000`) → ligne `source='campaign'`
- Crédit parrainage (`sponsorship_credits`) → ligne `source='subscription'`-adjacent
  ou `source='campaign'` selon l'origine (à trancher, cf. §7)
- `child_access_periods` reste pour la granularité mensuelle (sous-couche)

### 2.2 Nouvelle table : `supervisor_metrics` (système de confiance)

```
supervisor_metrics(
  id                 uuid PK,
  supervisor_user_id uuid FK auth.users,
  period_start       timestamptz,              -- semaine ou mois
  period_end         timestamptz,
  sessions_planned   int,
  sessions_done      int,
  sessions_on_time   int,
  avg_family_rating  numeric,                  -- feedback familles (1-5)
  child_progress_avg numeric,                  -- progression moyenne des enfants
  score              numeric,                  -- score composite /100
  status             text CHECK (ok|warning|suspended|banned),
  created_at         timestamptz
)
```

### 2.3 Colonnes nouvelles sur tables existantes
- `supervisors` : `removed_at timestamptz NULL` (soft-retire, pattern `campaign_educators`),
  `rating_avg`, `status` (active|warning|suspended|banned)
- `payments.metadata` : nouveaux intents `accompaniment_pack`, `supervisor_payout`
- `campaigns` : **DÉCISION 2026-08-14 — 2 compteurs distincts** : `target_count` = compartiment
  APP (existant) + nouvelle colonne `sessions_target int NOT NULL DEFAULT 0` = compartiment
  SÉANCES. L'ONG choisit le mix à la création ; le rapport d'impact affiche
  « N enfants + M séances financés ». (Pas un solde FCFA unique : reporting bailleur impossible.)

---

## 3. Carte d'impact systémique — QUI TOUCHE QUOI

> **Règle** : toute modification d'une section ci-dessous doit vérifier les sections
> listées dans sa ligne « ⚠ cascade ». C'est la checklist de non-régression.

### 3.1 DOMAINE ACCÈS / QUOTA (le résolveur — cœur de tout)

| Fichier | Rôle aujourd'hui | Impact V4 |
|---|---|---|
| `src/lib/child-access.ts` | `computeChildCreationLimit`, `resolveChildAccessStatus`, `getFamilyCoverage`, `getChildAccessStatus` | **Réécriture majeure** : lecture de `family_coverages` au lieu des 4 mécanismes. `getFamilyCoverage` devient « couverture effective = max des ends_at des family_coverages actives ». |
| `src/lib/child-profile-quota.ts` | constantes plancher/MAX | Simplifié : garder `MAX_CHILDREN_PER_ACCOUNT` (borne sécurité), supprimer `MAX_QUOTA_OVERRIDE` (absorbé). |
| `src/hooks/use-family-coverage.ts` | `covered`, `campaignCovered`, `coveredUntil` | Devient « couverture effective » (une seule source). |
| `src/lib/subscriptions.functions.ts` | statut abonnement + crédits + campaignCovered | `getFamilySubscriptionStatus` lit aussi `family_coverages`. ⚠ **Bug latent à corriger** : `childrenCount` déclaré (l.296) jamais retourné (l.350-360) → `SubscriptionCard` affiche « undefined profil(s) ». |
| `src/lib/products.functions.ts` | `updateProfileQuotaAdmin` (clé quota_override) | Devient « octroyer une couverture admin » (insert family_coverages). |
| `src/lib/payment-fulfillment.server.ts` | case `extra_slots` (+1 quota_override) | Devient « acheter un pack / une couverture ». |
| Migrations `20260717160000`→`20260814160000` | trigger `check_child_profile_quota` (8 versions) | **Consolidation** : un seul trigger final lisant `family_coverages` (garde-fou DB conservé, logique simplifiée). ⚠ Grand-père « 5 gratuits » préservé en migration de données. |
| Tests `child-access.test.ts`, `payments.test.ts`, `child-profile-quota.test.ts`, `subscriptions.test.ts`, `pricing.test.ts`, `payments-admin.test.ts` | couverture sémantique | ⚠ Tout changement de `ChildAccessStatus`, du trigger ou des barèmes casse ces suites — les mettre à jour en même temps. |

**UI parent** :
| Fichier | Impact |
|---|---|
| `src/routes/profiles.index.tsx` | Modale upgrade (l.950-1079) : « Quota gratuit atteint » → « Accès & Accompagnement », jauge unique. `computeChildCreationLimit` simplifié. |
| `src/routes/profiles.manage.tsx` | Idem + copy « soutenus par votre programme partenaire ». |
| `src/components/profiles/ProfileDialog.tsx` | Pré-check de création = « une couverture active existe ». |
| `src/components/settings/SubscriptionCard.tsx` | Affiche la couverture effective + **corriger le bug childrenCount**. |
| `src/components/settings/RenewChildAccessButton.tsx`, `FamilySubscribeButton.tsx` | Lien vers les nouveaux produits. |
| `src/routes/profiles.$profileId.portfolio.tsx`, `profiles.$profileId.challenges.tsx` | Bannières d'accès inchangées (dépendent de `getChildAccessStatusFn`), mais le résolveur change dessous. |
| `src/routes/index.tsx` (FAQ « Combien coûte Génizio ? », l.92-99) + `a-propos.tsx` + `parrainage.tsx` + `GuideLayout.tsx` | ⚠ Copy pricing publique — doit annoncer les nouveaux produits. |

### 3.2 DOMAINE CAMPAGNES B2B

| Fichier | Rôle | Impact V4 |
|---|---|---|
| `src/lib/campaigns.functions.ts` (19 fns) | tout le domaine | `getCampaignPublicInfo`, `enrollChildViaCampaignLink`, `getNgoDashboardData`, `assignCampaignSupervisor`, `updateCampaignExtraQuotaAdmin`… : la « couverture campagne » devient une ligne `family_coverages source='campaign'`. ⚠ `generateCampaignTokensAdmin`/`enrollChildViaCampaignLink`/`redeemSponsorshipToken` appellent encore `getActiveSeason()` alors que les saisons sont label-only — nettoyer. |
| `src/lib/seasons.functions.ts` | `redeemSponsorshipToken` (double mécanisme parrainage !) | ⚠ **Deux flux de parrainage coexistent** : `redeemSponsorshipToken` (par-enfant, child_access_periods, seasons.functions.ts:293-436) ET `redeemSponsorshipCode` (crédit famille, subscriptions.functions.ts:489-563). La V4 doit **fusionner** — sinon un même code agit différemment selon le chemin. |
| `src/lib/supervisors.functions.ts` | `listSupervisorsAdmin` (filtre campagne), `assignSupervisorToCampaignAdmin` | L'assignation par campagne reste, mais le quota « 5 par 5 » devient un plafond par-palier (V2) puis un budget séances (V3+). |
| `src/lib/supervisor-quota.ts` + trigger `check_supervisor_quota` | plafond superviseur | Évolue vers le score/statut (cf. §3.3). |
| `src/components/admin/AdminCampaignsTab.tsx` | cartes, `CampaignQuotaEditor` (extra_supervisors_quota + max_educators), modales | Le « Mode & tarification » (test/paid) s'enrichit du **compartiment accompagnement** du portefeuille. `CampaignQuotaEditor` → `CampaignCoverageEditor`. |
| `src/routes/organisation.index.tsx` (dashboard ONG) | KPIs, Superviseurs, Éducateurs, Rapport d'impact | Nouveau KPI « séances achetées / consommées ». L'ONG choisit le mix app/acc. |
| `src/routes/rejoindre.$campaignId.tsx` | page publique | Inchangée (le parent ne voit pas la complexité) — mais la couverture posée à l'inscription devient `family_coverages`. |
| `src/components/campaigns/CampaignLinkCard.tsx` | QR/lien | Inchangé. |
| `src/routes/profile.tsx` | détection manager/superviseur/admin | Inchangé + éventuel lien « Mes séances » superviseur. |
| Migration `20260813100000` (mode test/paid) | paiement campagne | `campaign_b2b` intent reste, mais peut créer des séances au lieu de codes selon le compartiment. |

**Paiement campagne** : `generateCampaignPaymentLinkAdmin` (campaigns.functions.ts:339-419)
→ `payments` row intent `campaign_b2b` → fulfillment `payment-fulfillment.server.ts:195-273`
crée des codes. V4 : ajoute une branche « séances » (ligne family_coverages à la place des tokens).

### 3.3 DOMAINE SUPERVISEURS (le nouveau système de confiance)

**État actuel confirmé** : AUCUN score, note, feedback, ban, suspension, soft-delete,
ni paiement superviseur n'existe. Tout se résume à : assignation + quota + dashboard lecture.
`insertSupervisorAssignments` (supervisors.functions.ts:214) est l'unique point d'insertion
— le goulot d'étranglement idéal pour y poser les invariants de confiance.

| Fichier | Rôle | Impact V4 |
|---|---|---|
| `src/lib/supervisors.functions.ts` | 9 fns | `insertSupervisorAssignments` vérifie le statut (pas d'assignation à un superviseur suspendu/banni). `removeSupervisor` (hard DELETE) → soft-retire (`removed_at`). Nouvelles fns : `declareSessionSupervisor` (le superviseur déclare ses séances en app) + `computeSupervisorScore` (calcul auto du score). |
| `src/components/admin/AdminSupervisorsTab.tsx` | liste groupée, quota badge, assign modal | Colonnes **Score /100, statut (badge vert/ambre/rouge), bouton Suspension/Ban**, récompense « Superviseur d'or » (75/25). ⚠ Cette section, récemment refaite, change : le quota « 5 par 5 » devient le score + le statut. |
| `src/routes/supervisor.tsx` | dashboard superviseur | **⚠ V1 : nouvelle UI « Déclarer une séance »** (décision 4 : score AUTO dès la V1) — le superviseur déclare ses séances en app (date, enfant, CR), le score se calcule tout seul. Affiche SON score, ses séances du mois, l'argent à venir. |
| `src/routes/organisation.index.tsx` (section Superviseurs) | assignation ONG | L'ONG voit le score/statut des superviseurs avant de choisir (argument de marque B2B). |
| `src/routes/profiles.$profileId.portfolio.tsx` | « Suivi par un superviseur » | Affiche le score du superviseur (confiance parent). |
| `src/routes/profile.tsx` | détection statut superviseur | ⚠ Le statut « superviseur » (count > 0) doit devenir « superviseur **actif** » (removed_at NULL + status != banned). |
| `src/lib/payment-fulfillment.server.ts` | intents | Nouveau intent `supervisor_payout` (la plateforme paie 70% sur preuve de séance). |
| `src/lib/payments.functions.ts` | init paiements | Nouvelle fn `initializeSupervisorPayout`. |
| `src/lib/pricing.ts` | barème | Ajouter `SESSION_PRICE_XOF = 5000`, `BILAN_PRICE_XOF = 25000`, `SUPERVISOR_SHARE = 0.70` (et `0.75` top). ⚠ Le plancher grand-péré `"2026-08-04"` est hardcodé 4× (trigger, child-profile-quota.ts:10, payment-fulfillment.server.ts:141, commentaires) — centraliser. |
| Migration | `supervisors` table | Ajouter `removed_at`, `status`, `rating_avg` + table `supervisor_metrics` + table `supervisor_sessions` (déclarations de séance : supervisor_user_id, child_profile_id, occurred_at, notes, status pending|done). |

**Règle de ban/récompense (systémique)** :
1. Paiement détenu par la plateforme → reverse 70% sur **preuve de séance** (CR en app + point Naya).
2. Score /100 calculé chaque semaine (`sessions_done/planned`, ponctualité, feedback, progression enfant).
3. `< 60%` sur 2 semaines → avertissement → suspension d'attribution → **ban** (2 avertissements).
4. Top 20% → **75/25**, priorité d'attribution, badge « Superviseur d'or ».

### 3.4 PAIEMENTS (couche transverse)

| Fichier | Impact |
|---|---|
| `src/lib/payments.functions.ts` | 6 intents existants (`order`, `child_access`, `passport`, `extra_slots`, `sponsorship`, `campaign_b2b`). V4 : `extra_slots` → « achat de couverture », nouveaux `accompaniment_pack`, `supervisor_payout`. |
| `src/lib/payment-fulfillment.server.ts` | Switch `applyPaystackEntitlement` (58-278) — ajouter les 2 cas, adapter `extra_slots`. |
| `src/lib/payments-admin.functions.ts` | Secours admin — labels d'intents (22-29) à étendre. |
| `src/components/admin/AdminPaymentsTab.tsx` | Table des paiements + retry — nouveaux intents. |
| `src/routes/paiement-retour.tsx` | Copy de confirmation — nouveaux produits. |
| `src/lib/payment-email.functions.ts` | Emails (child_access 445, extra_slots 460, sponsorship 466, abonnement 509) — ajouter pack/bilan/payout. |
| `src/routes/api/paystack/webhook.ts` | Webhook — rien de nouveau (le fulfillment fait foi), juste les nouveaux intents. |

### 3.5 ADMIN OS (pouvoir admin)

| Fichier | Impact |
|---|---|
| `src/components/admin/AdminExecutiveTab.tsx` | Colonne « Quota profils (0 = auto) » (l.212-214, input 342-374) → « Couverture (0 = auto) » + jauge. |
| `src/routes/admin.index.tsx` | `handleUpdateQuota` (186-201) → « octroyer une couverture ». |
| `src/lib/admin-os.functions.ts` | `ParentBIRC.quotaOverride` (l.686) → `ParentBIRC.coverage` (lecture family_coverages). ⚠ `listAllUsers` sur tout l'annuaire déjà identifié comme coûteux. |
| `src/components/admin/AdminNavTabBar.tsx` | Onglets — pas de changement structurel, sous-libellés à jour. |

### 3.6 MIGRATIONS (ordre chronologique V4)

| # | Migration | Contenu |
|---|---|---|
| 1 | `create_family_coverages.sql` | Table + index (user_id, status, ends_at). |
| 2 | `create_supervisor_trust.sql` | `supervisors.removed_at/status/rating_avg` + `supervisor_metrics`. |
| 3 | `migrate_data_coverages.sql` | `quota_override`→ligne admin ; `sponsorship_credits`→ligne ; campagnes actives→ligne campaign ; grand-père 5 préservé. |
| 4 | `consolidate_check_child_profile_quota.sql` | Trigger final lisant `family_coverages` (remplace les 8 versions). |
| 5 | `add_campaigns_coverage_bucket.sql` | Optionnel : colonne de mix app/acc sur campaigns (ou pur calcul). |

**⚠ Contrainte Lovable/AGENTS.md** : jamais de force-push/rebase/squash de l'historique publié.

---

## 4. Kit pilote (8 semaines)

### 4.1 Objectifs mesurables
1. Des familles paient pour l'accompagnement (conversion bilan→pack ≥ 60%).
2. 3 superviseurs tiennent 12 séances/mois avec sérieux (tenue ≥ 90%).
3. L'économie 70/30 fait vivre un superviseur (~210 000 F/mois pour 5 enfants).

### 4.2 Périmètre
- 3 superviseurs formés × 4-5 enfants = 12-15 enfants.
- **Pack PAR ENFANT** (décision 2026-08-14) : chaque enfant accompagné a son pack de
  12 séances × 5 000 F = 60 000 F/mois. Un superviseur suit 4-5 enfants = 4-5 packs.
- 1 campagne pilote en mode « mixte » (compartiments APP + SÉANCES distincts).
- 1 ville/quartier.

### 4.3 Contrat superviseur (à faire signer)
- Engagement : 12 séances/mois/**ENFANT**, CR après chaque séance, respect du scoring.
- Rémunération : 70% × séance sur preuve ; 75% si score top 20%.
- Sanctions : avertissement < 60% sur 2 semaines ; ban à 2 avertissements.
- Confidentialité (données enfants).

### 4.4 Template de bilan (25 000 F — fait par le fondateur)
- Observation de l'enfant (30-45 min) + échange parent.
- Remplissage du profil multidimensionnel dans l'app (talents, contexte, aptitudes — les
  champs existent déjà dans `ProfileDialog`/`child_profiles`).
- Remise du plan d'accompagnement (3 séances/semaine × 4 semaines).
- (Délégué : 17 500 F superviseur / 7 500 F plateforme si bon élément recruté.)

### 4.5 Grille de score superviseur (semaine)
| Critère | Pondération |
|---|---|
| Séances tenues / planifiées | 40% |
| Ponctualité (sessions_on_time) | 20% |
| Feedback famille (1-5) | 25% |
| Progression moyenne des enfants | 15% |

### 4.6 Métriques hebdo du pilote
Taux de conversion bilan→pack · tenue des séances · rétention famille à 30/60/90 j ·
**coût API réel par enfant** · feedback familles · score des 3 superviseurs · paiements
réellement reversés.

---

## 5. Séquencement (V1 → V4) sans casser le grand-père

| Vague | Contenu | Effort | Risque |
|---|---|---|---|
| **V0 (fait, 2026-08-14)** | Bug `childrenCount` corrigé. Cutover grand-péré centralisé (`isGrandfatheredAccount`). 5 décisions tranchées. | Faible | Faible |
| **V1 (semaines)** | **Écran « Accès & Accompagnement »** (jauge unique parent) + renommer « Quota »→« Couverture » partout. **Score superviseur AUTO dès la V1** (décision 4) : table `supervisor_sessions` + UI « Déclarer une séance » dans `/supervisor` + calcul auto du score + soft-retire (`removed_at`) + badges statut. | Moyen | Faible |
| **V2 (trimestres)** | Table `family_coverages` en parallèle + migration des données (`quota_override`→admin, crédits→source `sponsorship`, campagnes→lignes). Trigger consolidé. Paiement `accompaniment_pack` + `supervisor_payout`. **Plafond 5 par palier, cap 50** (décision 5 : fin du « créez un nouveau compte », UI + trigger). | Fort | Moyen |
| **V3 (12-18 mois)** | Campagne = portefeuille 2 compartiments (mix app/acc — décision 3). Fusion des 2 flux de parrainage vers source `sponsorship` (décision 1). `extra_slots`/`extra_profile_slots` définitivement retirés. | Fort | Fort |
| **V4** | Pass Enfant complet : l'unité enfant×mois/séance est LA monnaie ; tout est une source de couverture ; la campagne est un compte prépayé institutionnel. | Très fort | Très fort |

**Fondamental** : chaque vague laisse le système utilisable et laisse le grand-père intact.
Les vagues sont indépendantes — on peut s'arrêter après V1 si le pilote dit non.

---

## 6. Pièges & bugs déjà repérés (à traiter dans la V4)

1. **Bug `childrenCount`** : `getFamilySubscriptionStatus` déclarait le champ (subscriptions.functions.ts:296) sans le retourner → `SubscriptionCard.tsx:166` affichait « undefined profil(s) ». ✅ **CORRIGÉ (V0, 2026-08-14)** — `childrenCount` ajouté au retour.
2. **Double flux de parrainage** : `redeemSponsorshipToken` (par-enfant) et `redeemSponsorshipCode` (crédit famille) coexistent avec des effets différents — à fusionner.
3. **`getActiveSeason()`** appelée à tort pour `season_id` (saisons label-only depuis `20260812130000`).
4. **`types.ts` stale** : `campaigns` Row manque `status` (types.ts:77-121).
5. **Asymétrie résolveur/trigger** : `getChildAccessStatus` rend permanent au-delà du plancher, le trigger accorde jusqu'à 5 ; `getChildAccessStatus` ne borne pas `quotaOverride` par 50 (le trigger oui).
6. **Cutover grand-péré hardcodé** : ✅ **CORRIGÉ (V0, 2026-08-14)** dans `payment-fulfillment.server.ts` (utilisation de `isGrandfatheredAccount`, source unique TS). Reste hardcodé dans le SQL des migrations (par nature) et les commentaires.
7. **`removeSupervisor` en hard DELETE** (pas d'historique) vs `campaign_educators.removed_at`.
8. **Aucune infra notification** (pas d'email/SMS hors reçus de paiement) — le score/ban devra se voir passivement (dashboard, portfolio) comme le reste.
9. **`sponsorship_tokens` dual-purpose** (diaspora vs B2B) — `listSponsorshipsAdmin` filtre `campaign_id IS NULL`.

---

## 7. Décisions (état : 5 TRANCHÉES — aucune bloquante)

1. **Crédit parrainage → quelle source ?** → **TRANCHÉ (2026-08-14) : SOURCE DÉDIÉE `'sponsorship'`**. Le parrainage individuel (parrain diaspora, proche) est une couverture comme les autres : `source='sponsorship'`, `max_children=5` pendant la durée. 5 sources homogènes (subscription | accompaniment_pack | campaign | sponsorship | admin), reporting qui distingue « parrain proche » vs « institution ».
2. **Le pack accompagnement** : s'applique-t-il à UN enfant précis (child_id) ou à la famille ? → **TRANCHÉ (2026-08-14) : PAR ENFANT** (modèle du psychologue : un suivi = un patient). `family_coverages.child_id` est non-null pour `source='accompaniment_pack'`, null pour les couvertures famille/app. Conséquence : 3 enfants = 3 packs (60 000 F/mois chacun), progression d'un enfant mesurable.
3. **La campagne mixte** : le portefeuille est-il un solde FCFA à répartir, ou deux quotas distincts ? → **TRANCHÉ (2026-08-14) : 2 COMPTEURS DISTINCTS** — `campaigns.target_count` (APP, existant) + `campaigns.sessions_target` (SÉANCES, nouveau). L'ONG choisit le mix à la création ; le rapport d'impact affiche « N enfants + M séances financés » (exigence bailleur).
4. **Le score superviseur : qui le calcule ?** → **TRANCHÉ (2026-08-14) : AUTO DÈS LA V1**. Pas d'admin manuel hebdo : le superviseur **déclare ses séances en app** (avant/après) et le score se calcule automatiquement (séances tenues/planifiées, ponctualité, feedback famille, progression enfant). ⚠ Conséquence V1 : il faut construire l'UI « Déclarer une séance » dans l'espace superviseur dès la V1.
5. **Le plafond de 5** : → **TRANCHÉ (2026-08-14) : 5 PAR PALIER, CAP ABSOLU 50**. Un forfait/pack couvre 5 enfants ; au-delà on achète un autre palier (même tarif) ; cap absolu 50 (l'ex-override admin). Le parent avec 6+ enfants ne crée plus un 2e compte — il achète un palier. ⚠ La règle « créez un nouveau compte » disparaît (UI + trigger).

---

## 8. Ce qui ne change PAS (pour ne pas toucher à tort)

- Prix de l'app (5k→15k, 1 gratuit) — décision explicite du porteur.
- `/rejoindre/[campagne]` page publique (le parent ne voit pas la mécanique).
- `CampaignLinkCard`, `admin.supervisors.tsx` route, `supervisor.tsx` navigation.
- La politique « l'ONG ne voit jamais l'identité d'un enfant » (fondation produit, cf. getNgoDashboardData).
- Le Passeport d'Excellence et la boutique (domaines séparés).
- Les guides SEO et le reste du produit (hors périmètre).
