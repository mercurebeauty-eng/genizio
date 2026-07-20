---
name: genizio-naya-systeme-comprehension
description: NAYA 2.0 — Jumeau Pédagogique, moteur de diagnostic développemental, plan d'implémentation par phases
metadata:
  type: project
  status: approved
  last_updated: 2026-07-20
---

# NAYA 2.0 — Système de Compréhension Développementale

> ⚠️ **STATUT (vérifié le 2026-07-20, branche `security-fixes-and-ux-improvements`)** :
> conçu et approuvé le 2026-07-20. **Phase 0 livrée et vérifiée en production le jour même**
> (migration `20260720100000_add_observation_events.sql` appliquée via `supabase db push`,
> triggers + backfill + RLS testés de bout en bout — détail en fin de §6). **Phases 1-5 PAS
> commencées** — aucune table `pedagogical_twins`/`trait_series`/`hypothesis_cycles` en base.
> Prochain pas = Phase 1. Mettre ce bandeau à jour à chaque phase livrée.

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

### Phase 1 — Jumeau Pédagogique v1 (0 IA)
- Tables `pedagogical_twins` (état courant) + `trait_series` (historique versionné).
- Updaters déterministes : lissage exponentiel par niveau (α par niveau), alimentés par les
  événements Phase 0 (complétion par domaine/difficulté → compétences ; abandons/délais →
  persévérance ; choix répétés → centres d'intérêt).
- Classification périodique Force/Faiblesse/Fragilité/Risque/Émergence (valeur × pente × variance).
- Interne uniquement (rien de visible parent). Vérifiable : snapshot JP requêtable et cohérent
  pour un enfant réel avec historique.

### Phase 2 — Signaux scolaires + détection d'anomalies (0 IA)
- UI parent de saisie de notes (matière, note/max, type d'évaluation, contexte optionnel).
- Trigger Postgres Z-score (par enfant × matière, garde cold-start) → table `anomaly_triggers`.
- Vérifiable : note aberrante insérée → anomalie détectée ; note normale → rien.

### Phase 3 — Cycle de diagnostic (premier point IA)
- `hypothesis_cycles` + `generateHypotheses` (rôle *raisonnement*, JSON strict, evidence_log,
  somme des probabilités = 1, température basse).
- Défis discriminants via le générateur existant contraint (cf. adaptation #2).
- Mise à jour bayésienne à la complétion du défi discriminant ; convergence → diagnostic
  provisoire + frein appris le cas échéant.
- Vérifiable : reproduire le cas "Lola" du document source sur données réelles de test.

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
- **Phase 1** : fréquence de la classification (hebdo via pg_cron vs recalcul à l'événement).
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
