---
name: genizio-naya-systeme-comprehension
description: NAYA 2.0 — Jumeau Pédagogique, moteur de diagnostic développemental, plan d'implémentation par phases
metadata:
  type: project
  status: approved
  last_updated: 2026-07-20
---

# NAYA 2.0 — Système de Compréhension Développementale

> ⚠️ **STATUT (vérifié le 2026-07-20, branche `security-fixes-and-ux-improvements`, PR #8)** :
> conçu et approuvé le 2026-07-20. **Phases 0, 1, 2, 3a et 4 livrées et vérifiées en production
> le jour même** (Phase 0 : `observation_events` ; Phase 1 : `pedagogical_twin` ; Phase 2 :
> `school_grades`/`anomaly_triggers` ; Phase 3a : `hypothesis_cycles` + `generateHypotheses`
> (Sonnet) ; **Phase 4 : `parent_narrative` + rôle narration (Haiku) — premier écran NAYA
> visible par le parent, carte "Ce que Naya a remarqué" dans le Portfolio**, détail en fin de
> §6). **Phase 3b** (boucle bayésienne : défis discriminants + convergence) et **Phase 5**
> (boucle de recommandation complète) PAS commencées. Mettre ce bandeau à jour à chaque phase
> livrée.

> **Document source** : `C:\Users\USER\Documents\Mise en place Projet\#Génizion - Système de Compréhensio.txt`
> (fichier personnel de l'utilisateur, hors repo). Structure : sections 1-12 = la formalisation
> conceptuelle (source de vérité produit) ; le reste = un brainstorm avec Gemini sur l'orchestration
> multi-modèles. ⚠️ Les benchmarks, prix et noms de modèles cités dans ce brainstorm (DeepSeek V4,
> "claude-3-5-sonnet-20260620", scores GPQA/MMMU…) sont des sorties Gemini **non vérifiées, en
> partie manifestement inventées** — ne jamais les citer comme des faits. Les idées d'architecture
> du brainstorm (pipeline déterministe + IA aux seuls points de raisonnement, event-driven sur
> Postgres natif) ont en revanche été retenues après examen.

## 1. Le changement de paradigme (le POURQUOI de tout le reste)

L'école opère en **paradigme de verdict** : une note basse = un jugement ("mauvais en maths").
NAYA 2.0 opère en **paradigme d'investigation développementale** : toute performance observée
(résultat de défi, note scolaire, abandon, temps passé) est un **signal** dont la cause profonde
doit être recherchée par génération et test d'hypothèses — jamais conclue d'office.

C'est l'extension logique directe du non-négociable fondateur "Naya observe, ne note jamais"
([[genizio-vision]]) : jusqu'ici Naya observait et cartographiait ; désormais elle **enquête** —
elle formule des hypothèses causales et conçoit des défis pour les départager.

**Conséquence UI non-négociable** (prolonge la règle "aucun score/percentile" de
[[genizio-decisions]] #11) : l'app n'affiche **jamais** un verdict définitif, une probabilité
brute ni un label clinique. Toujours un état provisoire de compréhension, en langage bienveillant :
"Naya a remarqué que… elle propose d'essayer… pour mieux comprendre". Les probabilités, catégories
et hypothèses sont de la mécanique **interne**.

## 2. Le Jumeau Pédagogique (JP) — architecture à 4 niveaux

Une entité logicielle par enfant, mise à jour en continu par le flux d'observations. Quatre
strates, par stabilité décroissante — chaque niveau a sa propre **vitesse de mise à jour**
(lissage exponentiel, coefficient α distinct) :

| Niveau | Nom | Contenu | α (réactivité) |
|---|---|---|---|
| 1 | **Fondations** | tempérament, personnalité naissante, préférences cognitives, facteurs neurodéveloppementaux | ~0.01 (quasi-figé, changement brusque = événement rare à signaler) |
| 2 | **Moteurs** | curiosité, autonomie, persévérance, tolérance à la frustration, compétition/coopération, orientation intrinsèque/extrinsèque | ~0.05–0.1 (ventilable par domaine quand les données existent) |
| 3 | **Compétences** | créativité, communication, logique, organisation, métacognition, travail d'équipe | ~0.2–0.3 (progrès rapides possibles) |
| 4 | **Performances** | résultats bruts observables (défis, notes) — la couche la plus visible, la moins interprétable seule | brut, volatile |

**Principe de débruitage** : une performance (N4) n'est jamais un indicateur pur de compétence
(N3) — elle est filtrée par les moteurs (N2) et fondations (N1). Le rôle du JP est d'estimer la
compétence sous-jacente derrière la performance bruitée.

Nœuds transversaux du **Graphe d'Évolution** (la mémoire de Naya n'est pas une suite de
conversations, c'est cette structure) : centres d'intérêt pondérés (renforcement + oubli
progressif), modes d'apprentissage préférés (vecteur de probabilités : expérimentation, visuel,
lecture, écoute…), **freins** (règles conditionnelles apprises, ex. "consigne > 150 mots →
probabilité d'abandon élevée"), historique des cycles d'hypothèses résolus. Chaque valeur est
versionnée dans une série temporelle → tendances, ruptures, requêtes "quelle était la
persévérance en janvier ?".

## 3. Le moteur de diagnostic (la boucle cœur)

```
Observation (événement) → mise à jour incrémentale du JP
  → détection d'anomalie (Z-score vs l'historique DE CET ENFANT, code pur, 0 IA)
    → génération d'hypothèses causales pondérées (IA, JSON strict + evidence_log explicable)
      → défis discriminants (conçus pour que le résultat attendu DIFFÈRE selon la cause réelle)
        → résultat réinjecté → mise à jour bayésienne des probabilités
          → convergence → diagnostic provisoire + plan d'action + nouveau frein appris
```

Taxonomie de causes v1 (extensible) : `METHOD_MISMATCH` (forme de la tâche inadaptée au mode
d'apprentissage), `PERFORMANCE_ANXIETY` (contexte chronométré/évalué), `LACK_OF_ENGAGEMENT`
(déconnecté des centres d'intérêt), `CONCEPTUAL_GAP` (prérequis réellement manquant). Chaque
hypothèse doit citer les nœuds du JP qui la justifient (evidence_log) → diagnostic auditable.

**Deux familles de défis** émergent de cette boucle : défis de **révélation** (réduire
l'incertitude sur le JP — c'est ainsi que Naya "questionne" l'enfant sans langage explicite) et
défis de **développement** (travailler une faiblesse en s'appuyant sur une force).

## 4. Classification dynamique des traits → stratégies

Croisement valeur actuelle × tendance (pente) × variance, réévalué périodiquement :

| Catégorie | Signature | Stratégie |
|---|---|---|
| **Force** | haut, stable/en hausse | amplifier, servir de levier, essaimage (défis où la force est nécessaire mais insuffisante → mobilise une faiblesse sans résistance) |
| **Faiblesse** | bas mais en progression | développer : micro-défis, feedback sur le processus pas le résultat, ancrage sur les centres d'intérêt |
| **Fragilité** | modéré mais instable (variance haute) | protéger/stabiliser : structure, rituels, pas de saut de difficulté tant que la variance ne baisse pas, défis "doudou" à succès garanti |
| **Risque** | en dégradation (bas qui baisse, ou haut en chute) | surveiller + alerter le parent, investigation dialoguée, défi surprise pour briser la spirale |
| **Émergence** | zone médiane, en transition | catégorie d'attente, continuer d'observer |

Cette classification pilote `recommendChallenges` (pondération exploitation / exploration /
stabilisation). Les seuils sont des **paramètres de configuration**, pas des constantes en dur.

## 5. Adaptations à l'existant (écarts assumés vs document source)

Le document source décrit une cible idéale ; voici les écarts délibérés pour l'ancrer dans le
code réel — **ce sont des décisions, pas des oublis** :

1. **Modèles IA : Anthropic seul, architecture swappable** ([[genizio-decisions]] #27). Le
   pipeline définit des *rôles* (vision / raisonnement / narration), pas des fournisseurs.
2. **Pas de bibliothèque de défis étiquetés** : elle n'existe pas et n'est pas nécessaire — les
   défis sont générés à la volée (`challenges.functions.ts`). `designDiscriminationChallenges`
   devient : **contraindre le générateur existant** (tags d'hypothèse à tester, format imposé,
   frein à contourner, centre d'intérêt à utiliser) au lieu de chercher dans une bibliothèque.
3. **Pas de nouveau runtime tant que pas nécessaire** : Phases 0-2 = triggers/fonctions Postgres
   + server functions TanStack existantes. Edge Functions Supabase / traitement asynchrone :
   décision reportée à la Phase 3 (premier vrai besoin de travail en arrière-plan).
4. **Séries temporelles = table Postgres simple** indexée `(child_id, trait_id, recorded_at)` —
   pas d'InfluxDB/TimescaleDB au volume actuel.
5. **Cold start explicite** : le Z-score exige un historique. En dessous d'un seuil minimal
   d'observations comparables (~6, paramètre de config), pas de détection d'anomalie — le
   système accumule silencieusement. Le document source suppose un enfant riche en données ;
   la réalité du lancement est l'inverse.
6. **Tenseur Moteur×Domaine différé** : v1 = moteurs globaux ; ventilation par domaine seulement
   quand un enfant a assez de données par domaine.
7. **Notes scolaires = nouvelle surface produit** (aucune saisie n'existe) : formulaire parent
   simple en Phase 2 — c'est le déclencheur du cas d'usage phare "pourquoi cette note en maths ?".
8. **Confidentialité niveau maximal** : le JP est la donnée la plus sensible du produit
   (psychométrie d'enfants). RLS stricte owner-only dès la première migration, **aucune** surface
   publique, pattern append-only pour les événements (comme `consent_events`). Leçons des
   décisions #10/#13/#20/#22 appliquées à la conception, pas après coup.

## 6. Plan d'implémentation par phases

Chaque phase est livrable, vérifiable de bout en bout, et committable seule. Dépendances :
0 → 1 → (2 et 3, ordre libre) → 4 → 5.

### Phase 0 — Socle événementiel (0 IA, pur DB + code) — ✅ LIVRÉE le 2026-07-20
- Table `observation_events` append-only : `type` (`CHALLENGE_ASSIGNED` | `CHALLENGE_STARTED` |
  `CHALLENGE_COMPLETED` | `PROOF_REJECTED` | `CHALLENGE_ABANDONED` | `INTEREST_EXPRESSED` |
  réservés : `SCHOOL_GRADE_ENTERED`, `BEHAVIOR_FLAG`), `child_id`, `user_id`, `payload` JSONB,
  `source` (`db_trigger`/`app`/`backfill`), `occurred_at` vs `recorded_at`, `processed`.
- **Choix d'implémentation clé : capture par triggers Postgres** (`log_challenge_observation`
  sur `challenges` INSERT/UPDATE/DELETE, `log_interest_observation` sur `child_profiles`) plutôt
  que des émissions éparpillées dans le code applicatif — aucun chemin de mutation présent ou
  futur ne peut oublier d'émettre (la classe de bug "payload perdu" de la décision #23 devient
  structurellement impossible ici). Seul `PROOF_REJECTED` est émis applicativement
  (`validateChallengeProof`, best-effort) car un rejet ne modifie rien en base.
- Piège traité à la conception : suppression d'un profil entier → la cascade supprime ses défis
  → le trigger DELETE aurait inséré un événement violant la FK vers le profil en cours de
  suppression. Garde `EXISTS` dans le trigger ; testé en réel (suppression OK, zéro erreur).
- Backfill : 18 événements historiques reconstitués (17 ASSIGNED + 1 COMPLETED, dates réelles).
- **Vérifié en production le 2026-07-20** : cycle de vie complet testé (ASSIGNED→STARTED→
  COMPLETED→ABANDONED, transition completed→todo muette comme conçu) ; `INTEREST_EXPRESSED`
  à la création ET à l'édition (avec `previous_interests`) ; RLS anon = 0 ligne ; INSERT
  authentifié réel prouvé via 2 `PROOF_REJECTED` émis par une vraie soumission hors-sujet en
  navigateur ; premier événement organique capté pendant les tests (profil "Khadidja" créé par
  l'utilisateur réel → `INTEREST_EXPRESSED` automatique). Données de test nettoyées.

### Phase 1 — Jumeau Pédagogique v1 (0 IA) — ✅ LIVRÉE le 2026-07-20
- Tables `pedagogical_twins` (état courant, JSONB `drivers`/`competencies`/`interests`) +
  `trait_series` (historique append-only, `level` 2 ou 3, `trait_key`, `value`, `recorded_at`,
  `source_event_id`). RLS owner-only SELECT, aucune policy d'écriture — tout passe par des
  fonctions `SECURITY DEFINER` (`EXECUTE` révoqué au public), même pattern que la Phase 0.
- **Décision #28 (détail dans decisions.md) : N3 "Compétences" réutilise les 9 clés Gardner**
  déjà en place (`VALID_TALENT_KEYS`) plutôt qu'un nouveau vocabulaire créativité/communication/
  logique/organisation/métacognition/travail-d'équipe du document source — signal **dérivé**
  différent (moyenne mobile [0,1] + tendance) du score cumulatif déjà affiché au parent, pas un
  doublon. N2 "Moteurs" : **seule la persévérance est calculée en v1** — curiosité, autonomie,
  compétition, tolérance à la frustration n'ont aucun signal fiable dans la forme actuelle des
  événements ; champs absents du JSONB plutôt que valeurs inventées.
- Updaters (fonction `apply_observation_to_twin`, appelée par un trigger `AFTER INSERT` sur
  `observation_events` — **résout la question ouverte "pg_cron vs événementiel" en faveur de
  l'événementiel**, cohérent avec Phase 0) :
  - `CHALLENGE_COMPLETED` + `ai_validated=true` → EMA (α=0.25) sur chaque clé Gardner de
    `target_intelligences` (signal=1.0) ; EMA (α=0.08) sur `perseverance` (signal=0.65,
    inconditionnel — signal comportemental distinct de la validation IA du contenu) ; renfort du
    domaine engagé (`interests.domains_engaged`, +0.2 plafonné à 1.0).
  - `CHALLENGE_ABANDONED` → EMA sur `perseverance` (signal=0.15).
  - `INTEREST_EXPRESSED` → renfort de `interests.declared` (+0.1 si déjà présent, base 0.6 si
    nouveau) — jamais de suppression sur retrait d'un tag (signal doux, pas d'oubli implémenté
    en v1, cf. adaptation §5).
- Classification (`classify_trait`, seuils §4 : FORCE si valeur>0.7 et tendance≥0 ; RISQUE si
  tendance<-0.02 ; FAIBLESSE si valeur<0.3 et tendance>0 ; FRAGILITE sinon en zone basse ou si
  variance>0.02 en zone médiane ; EMERGENCE sinon) calculée via les agrégats natifs Postgres
  `regr_slope`/`variance` sur les 10 derniers points, **seulement si n≥4** pour ce trait (sinon
  `category=NULL` — pas de classification prématurée sur 1-2 points).
- Backfill : rejoue chronologiquement les `observation_events` déjà backfillés par la Phase 0.
- **Vérifié en production** : backfill cohérent (n=1, `category=NULL` partout, comme attendu) ;
  5 complétions validées ciblant la même compétence → EMA converge à 1.0, tendance=0,
  variance=0, **catégorie=FORCE** ; séquence 5 complétions + 6 abandons → persévérance descend
  à 0.45 avec tendance négative détectée, catégorie EMERGENCE (zone médiane, variance sous le
  seuil — comportement exact des règles §4, pas une erreur) ; renfort de domaine plafonné à 1.0
  après 5 défis dans "Arts" ; intérêt déclaré deux fois → 0.6→0.7 (bump, pas de reset) ; RLS
  anon = 0 ligne sur les deux tables ; suppression du profil de test → cascade complète, 0
  résidu. Un bug de résolution de type Postgres trouvé et corrigé avant tout dégât en prod :
  `smallint` pour `level`/`p_level` empêchait la résolution de fonction (littéral `integer` non
  castable implicitement vers `smallint`) — la transaction complète a échoué et roulé en arrière
  proprement (aucune table laissée en état partiel), corrigé en `integer`, ré-appliqué avec
  succès. Interne uniquement (rien de visible parent) — conforme au plan.

### Phase 2 — Signaux scolaires + détection d'anomalies (0 IA) — ✅ LIVRÉE le 2026-07-20
- Table `school_grades` (matière, note, note max, type d'évaluation optionnel, contexte libre
  optionnel, date) + `anomaly_triggers` (FK directe vers `school_grades`, `z_score`, `resolved`
  pour la Phase 3 à venir). RLS owner-only (write via `FOR ALL` avec vérification d'ownership
  sur `school_grades` — écriture directement possible par le parent, contrairement à
  `observation_events`/`pedagogical_twins` qui sont trigger-only ; `anomaly_triggers` reste
  lecture seule côté client, écrit uniquement par le trigger `SECURITY DEFINER`).
- UI : section "Notes scolaires" intégrée à la page Portfolio existante (pas de nouvelle route —
  c'est déjà l'écran "compréhension de l'enfant"), liste factuelle + dialogue d'ajout
  (`AddGradeDialog`). **Aucun indicateur d'anomalie affiché** — volontaire, c'est la Phase 4
  ("Compréhension de Naya") qui aura ce rôle, pas celle-ci.
- Matière = liste fermée (+ "Autre" libre) plutôt que texte libre pur : sert de clé de
  regroupement au calcul du Z-score, une orthographe qui varie casserait le regroupement.
- Trigger `detect_grade_anomaly` (`AFTER INSERT` sur `school_grades`) : émet toujours un
  `SCHOOL_GRADE_ENTERED` dans `observation_events` (ratio `grade/max_grade` normalisé, pas la
  note brute — deux évaluations sur des barèmes différents doivent être comparables) ; calcule
  ensuite mean/stddev des ratios PRIOR (même enfant × même matière, la ligne courante exclue) ;
  **garde cold-start : n≥3 notes antérieures** avant d'activer le calcul (sous ce seuil un
  écart-type est trop bruité) ; seuil `z ≤ -2.5` (identique à l'exemple SQL du document source).
- Vérifié en production : séquence 14/15/13/20 puis 3/20 dans une matière de test → seule la 4e
  note déclenche une anomalie, **z = -11.000 vérifié au calcul manuel exact**
  (`(0.15-0.70)/0.05`) ; une 5e note normale (14/20) ajoutée ensuite → aucune nouvelle anomalie
  (toujours 1 au total) ; RLS anon = 0 ligne sur les deux tables ; formulaire testé en direct
  dans le navigateur (note réelle saisie, affichée immédiatement dans la liste) ; suppression en
  cascade sans résidu. Interne uniquement pour `anomaly_triggers` (rien de visible parent),
  conforme au plan — seule la liste brute des notes est visible, pas leur analyse.

### Phase 3a — Moteur de génération d'hypothèses (premier point IA) — ✅ LIVRÉE le 2026-07-20
- Table `hypothesis_cycles` (FK unique vers `anomaly_trigger_id` = idempotence DB) + server
  function `ensureHypothesesForChild` (`hypotheses.functions.ts`). Décision #32.
- **Question ouverte sync/async tranchée : synchrone.** Server function TanStack réutilisant
  `callClaude` (pattern déjà éprouvé), aucune Edge Function, aucune nouvelle infra. Déclenchée
  en **fire-and-forget au chargement du Portfolio** (idempotent : ne coûte un appel IA que s'il
  existe une anomalie sans cycle) — latence hors du chemin critique.
- **Rôle *raisonnement* = Sonnet** (`callClaude` a gagné un `modelOverride`) : décision #27 réserve
  le premium au moment "où le système doit réfléchir", ici volume faible (sur anomalie seule).
- **Prompt adapté au Jumeau RÉEL** : le document source suppose des Fondations N1 (anxiété innée,
  learning_modes) qu'on n'a pas (décision #28) — le prompt raisonne donc sur les compétences
  Gardner (issues de défis validés), les moteurs (persévérance, time_awareness), les intérêts, et
  le contexte/type de la note. Signal-clé de débruitage fourni explicitement : la compétence
  Gardner liée à la matière (map `SUBJECT_TO_TALENT`) — compétence forte + note effondrée = fort
  METHOD_MISMATCH, pas CONCEPTUAL_GAP. Priors renormalisés à 1.0 côté serveur.
- **Vérifié en production (cas Lola)** : enfant à `logico_mathematique=0.85 FORCE` + note maths
  effondrée (4/20, z=-10) → hypothèses **METHOD_MISMATCH 0.45 (tête), PERFORMANCE_ANXIETY 0.25,
  LACK_OF_ENGAGEMENT 0.20, CONCEPTUAL_GAP 0.10 (queue)**, somme=1.0, evidence_log pointant les
  vrais nœuds, chaque rationale citant la FORCE qui contredit une lacune. Anxiété correctement
  sous-pondérée (contexte de stress absent, pesé NEGATIVE). Idempotence (1 cycle malgré 2 appels
  concurrents), RLS anon=0, UTF-8 correct en base, cascade propre. **Deux bugs trouvés et corrigés
  en vérifiant** (cf. décision #32) : `callClaude` lisait `content[0]` au lieu du bloc `text` (le
  bloc `thinking` de Sonnet cassait TOUT appel Sonnet texte) ; budget tokens trop bas (le thinking
  consomme le budget, 1500 tronquait le JSON — vérifié `stop_reason=max_tokens` en direct).

### Phase 3b — Boucle bayésienne (défis discriminants) — PAS commencée
- Défis discriminants via le générateur existant contraint (cf. adaptation #2).
- Mise à jour bayésienne des `current_probability` à la complétion du défi discriminant ;
  convergence → `status=resolved` + `final_diagnosis` + frein appris le cas échéant.

### Phase 4 — Restitution parent — ✅ LIVRÉE le 2026-07-20
- Colonne `hypothesis_cycles.parent_narrative` (nullable) + rôle **narration séparé du
  raisonnement** (décision #27 : rôles swappables indépendamment) : `narrateForParent`
  (`hypotheses.functions.ts`), sur **Haiku** (pas Sonnet — traduire une structure déjà
  raisonnée en prose est le même type de tâche que `getChildAISynthesis`, déjà éprouvé sur
  Haiku dans ce fichier, pas un problème de jugement causal). Appelée juste avant l'insert du
  cycle (jamais de fenêtre "raisonné mais pas raconté" visible).
- **Découverte concrète en construisant cette phase** : `rationale`/`evidence_log` (Phase 3a)
  contiennent des chiffres bruts ("0.85", "z=-10") — sûrs en interne, mais leur exposition
  directe violerait "jamais de probabilité brute" (§1). La narration n'est donc pas un simple
  confort, elle est structurellement nécessaire.
- **Garde-fou déterministe derrière la consigne du modèle** (même logique que
  `applySafetyNet` dans `challenges.functions.ts`) : toute narration contenant un chiffre est
  rejetée (`parent_narrative` reste `null`) plutôt que risquer une fuite — jamais de confiance
  aveugle en l'auto-discipline du modèle pour une règle non-négociable.
- **Résilience** : un cycle déjà raisonné (Sonnet, coûteux) dont la narration (Haiku, moins
  coûteuse) a échoué n'est jamais re-raisonné — seule la narration est retentée au prochain
  déclenchement lazy, en réutilisant `hypotheses` déjà stocké.
- UI : carte "Ce que Naya a remarqué" dans le Portfolio (pas une nouvelle route), badge ambre
  "Naya enquête encore" — **visuellement distincte** du Portrait de synthèse (sky, réglé/stable)
  pour ne jamais donner un air de conclusion à quelque chose de provisoire. N'apparaît dans le
  DOM QUE si un cycle ouvert avec narration existe (jamais d'état "rien détecté" qui sonnerait
  comme un jugement en soi). Seule `parent_narrative` est lue côté client — `hypotheses` (JSON
  brut, causes, probabilités, evidence_log) reste strictement interne à cette couche de l'app.
- **Vérifié en production** : cas type Lola resemé (compétence linguistique FORCE 0.82 +
  chute à 3/20) → raisonnement Sonnet impeccable (METHOD_MISMATCH 0.5 en tête) → narration
  Haiku **rejetée une première fois par le garde-fou** (faux positif : le nom de test
  "Phase4Test" contenait un chiffre, pas une fuite de diagnostic) → renommage → **résilience
  vérifiée en direct** : la retentative n'a réutilisé QUE le raisonnement déjà stocké, narration
  obtenue en ~3s (vs ~20s pour un cycle complet), zéro second appel Sonnet. Narration finale
  100% conforme : zéro chiffre, zéro étiquette technique (`METHOD_MISMATCH` etc.), ton
  d'enquête provisoire ("Naya se demande si…", "elle va continuer à observer…"), chaleureux.
  Carte confirmée dans le DOM rendu (badge + texte exact). RLS anon = 0. Cascade de
  suppression propre. `tsc --noEmit` propre.

### Phase 4 — Restitution parent
- Vue "Compréhension de Naya" : hypothèses en cours et diagnostics en langage bienveillant
  (jamais de probabilité/verdict — cf. §1), alertes Risque, plan d'action suggéré.
- Rapport narratif périodique (rôle *narration*).
- Vérifiable : écran réel + contenu conforme à la règle UI.

### Phase 5 — Boucle de recommandation complète
- `recommendChallenges` hybride (exploitation force/faiblesse en zone proximale, exploration
  d'hypothèses non résolues, stabilisation des fragilités) branché sur le Labo et le dashboard.
- Vérifiable : les défis proposés changent selon la catégorie des traits d'un profil de test.

## 7. Décisions ouvertes (à trancher au moment de la phase concernée)

- **Phase 3** : traitement synchrone (server function au moment de l'événement) vs asynchrone
  (Database Webhook → Edge Function). Critère : latence réelle mesurée de `generateHypotheses`.
- **Phase 2** : photo du bulletin analysée par vision (rôle *vision*) en plus de la saisie
  manuelle ? Reporté — la saisie manuelle valide d'abord l'usage.
- ~~**Phase 1** : fréquence de la classification (hebdo via pg_cron vs recalcul à l'événement).~~
  **Tranché en Phase 1** : recalcul à l'événement (trigger), pas de pg_cron (cf. décision #28).
- **Niveau 1 (Fondations)** : source d'évaluation initiale — questionnaire parental validé à
  concevoir (surface produit non scopée), ou inférence lente depuis les patterns seuls au début.

## 8. Risques identifiés

- **Moteur sans carburant** : implémenter le diagnostic avant d'avoir du volume d'événements =
  système qui tourne à vide. Mitigation : ordre des phases + backfill + cold-start explicite.
- **Sur-interprétation psychométrique** : les α, seuils et catégories sont des heuristiques
  produit, pas de la psychométrie validée scientifiquement. Ne jamais présenter les sorties
  comme un diagnostic clinique (le mot "diagnostic" reste interne ; jamais dans l'UI).
- **Coût IA** : frugal par design (IA uniquement sur anomalie + rapports), mais à instrumenter
  dès la Phase 3 (compteur de coût par cycle — rejoint le module "IA Naya" de l'Admin OS,
  cf. [[genizio-vision]]).
- **RLS** : chaque nouvelle table = re-audit (cf. [[genizio-backlog]] — l'audit RLS n'est pas
  "une fois pour toutes").

## 9. Chantier lié — l'Atelier du Temps (repositionnement du Labo)

> ⚠️ **STATUT (2026-07-20)** : nom **confirmé « L'Atelier du Temps »**. **V1 livrée** (commit
> `9eb9b22`). **V3 mécanique "Estimation" livrée et vérifiée en production** (décision #30) —
> première mécanique réelle de gestion du temps, alimente enfin le driver N2 `time_awareness`
> laissé vide en Phase 1. Régularité (2e mécanique V3) et V4 **PAS commencées**. Détail +
> alternatives dans [[genizio-decisions]] #29/#30.

Le `/laboratory` actuel ne se différencie pas des Défis : même backend
(`generateSingleChallenge` + `assignTemplateChallenge`), même objet produit, noms qui se
chevauchent (une section « Le Laboratoire de Génizio » existe *dans* la page Défis en plus de la
route). Repositionnement décidé : le Labo devient un espace dédié à **la gestion du temps comme
compétence** (école, vie pro) — pas un générateur de défis bis.

**Pourquoi ça appartient à NAYA 2.0, pas juste à l'UX** : un défi *chronométré* produit une
classe d'observation que les défis auto-rythmés ne peuvent pas générer — précisément les Moteurs
N2 laissés vides en Phase 1 (décision #28 : tolérance à la frustration, gestion du stress,
persévérance étalée). C'est le **défi de révélation** du §3, matérialisé. Chaque « façon » de
gérer le temps = un nouveau type d'`observation_event` alimentant un driver distinct.

**Les 4 façons (chacune = une mécanique + un signal Jumeau)** :
| Façon | Mécanique | Signal N2/N3 |
|---|---|---|
| Temps imparti | compte à rebours dur | tolérance à la frustration, stress |
| Estimation | « combien de temps ? » puis révèle le réel | métacognition temporelle |
| Régularité | « un peu chaque jour, N jours » (temps qui coule app fermée = sain ici) | persévérance étalée, habitude |
| Priorisation | temps limité < tâches possibles | jugement, autonomie |

**Ancre choisie (décision #29)** : cœur = **Estimation + Régularité** (sans anxiété,
différenciants, alimentent le Jumeau) ; **Temps imparti = mode avancé âge-gaté (10 ans+)** — les
« retranchements » voulus par l'utilisateur, mais au bon âge et jamais comme identité par défaut
(sinon le mécanisme-verdict combat le non-négociable « Naya ne juge pas »). L'expiration n'est
jamais un échec affiché : c'est de la donnée de coaching bienveillante.

**Séquence** : V1 (renommage + suppression de la section Labo doublon dans la page Défis, sans
nouveau mécanisme) → V3 (mécaniques Estimation + Régularité, `observation_event` dédiés,
persistance server-authoritative pour que « le temps coule app fermée » ne soit pas trichable) →
V4 (Naya déclenche elle-même un défi chronométré quand le Jumeau doit départager une hypothèse —
Phase 3 : le chrono devient le protocole expérimental de Naya). Cf. paliers V1→V4 de l'analyse
`product-intelligence-architect`.

**V3 — Estimation, livrée le 2026-07-20 (décision #30)** : l'enfant estime la durée au moment de
l'assignation depuis l'Atelier (réutilise le sélecteur de temps déjà existant, aucune nouvelle UI
d'entrée) ; `started_at` capturé par trigger au premier passage en cours (jamais oublié, jamais
écrasé par une reprise) ; à la complétion, comparaison estimé/réel affichée dans `OutcomeChat` en
langage de processus (jamais de score/pourcentage). Alimente un **nouveau driver N2**
`time_awareness` (pas N3 — décision #28 ferme le N3 aux 9 clés Gardner, et la métacognition
temporelle n'en est pas une). Régularité reste à construire.
