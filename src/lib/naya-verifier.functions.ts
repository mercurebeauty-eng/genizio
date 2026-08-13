// ============================================================================
// Naya 3.0 « Le Loup de Naya » — Chantier 2 (C2.1/C2.3/C2.4/C2.5)
// ----------------------------------------------------------------------------
// Le Loup est la boucle de vérification sémantique anti-hallucination de Naya :
// chaque sortie IA est contrôlée contre des rubriques par type de génération,
// et chaque verdict est journalisé en arrière-plan dans `generation_audits`
// (mode shadow : zéro impact sur la latence et le comportement de l'utilisateur).
//
// Architecture en 3 couches, délibérément découplées :
//   1. `verifyGeneration` (PUR, synchrone, gratuit) — contrôles déterministes
//      structurés, exécutés sur les 16 sites d'appel à chaque génération.
//   2. `verifyGenerationSemantic` (async, échantillonné via NAYA_VERIFY_SEMANTIC_RATE)
//      — le Loup IA (modèle léger) vérifie les critères qualitatifs (observabilité,
//      ton, cohérence âge/contenu…) via une rubrique par type. Importé en lazy pour
//      éviter tout cycle ES : ce module ne référence JAMAIS challenges.functions
//      au niveau du module, seulement dans les corps de fonctions.
//   3. `verifyAndLog` — fusionne les deux couches, journalise l'audit (insert en
//      arrière-plan, échec silencieux) et retourne le verdict pour l'enforce.
//
// Mode enforce (`NAYA_VERIFY_ENFORCE=true`) : les violations majeures déclenchent
// un recadrage puis une régénération ciblée (max 1) via `buildRecadrageSuffix`.
//
// Les tables locales VALID_TALENT_KEYS/VALID_SUBFORMS sont des copies de
// talent-buckets/challenges.functions, gardées en phase par un test dédié, afin
// que ce module reste exempt de dépendance serveur au chargement.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// ── Types ───────────────────────────────────────────────────────────────────

export type GenerationKind =
  | "challenge_bulk"
  | "challenge_single"
  | "homework"
  | "recommendation"
  | "discriminant"
  | "support_retest"
  | "reformulation"
  | "failure_sequence"
  | "hypothesis"
  | "proof_validation"
  | "not_completed_classification"
  | "synthesis"
  | "letter"
  | "narrative"
  | "proof_tampon";

export type ViolationSeverity = "mineur" | "majeur";

export interface Violation {
  /** Nom canonique de la règle violée (stable, exploitable par le chantier 3). */
  rule: string;
  severity: ViolationSeverity;
  /** Contexte factuel précis de la violation. */
  detail: string;
  /** Recadrage court et actionnable. */
  suggestion?: string;
}

export type Conformity = "conforme" | "mineur" | "majeur";

export interface VerifyVerdict {
  conformity: Conformity;
  violations: Violation[];
}

export interface VerifyContext {
  childAge?: number;
  childName?: string;
  direction?: "AHEAD" | "BEHIND";
  domain?: string;
  subject?: string;
  requiresStabilisation?: boolean;
  anxietyDamped?: boolean;
  existingTitles?: string[];
  /** Défi-pont (chantier Naya V4) : libellé de l'aspiration explorée. */
  aspirationLabel?: string;
  /** Reformulation (chantier 3, modalités) : titre du défi original à reformuler —
   * le Loup vérifie que l'objectif pédagogique reste identique. */
  originalTitle?: string;
}

// ── Constantes de référence (copies locales, verrouillées par test) ─────────

const VALID_TALENT_KEYS = [
  "logico_mathematique",
  "creative",
  "corporelle",
  "linguistique",
  "spatial",
  "sociale",
  "emotionnelle",
  "artisanale",
  "entrepreneuriale",
] as const;

// Miroir de TALENT_SUBFORMS (challenges.functions.ts) — le test naya-verifier.test.ts
// vérifie l'égalité stricte avec la source, pour que ce module n'importe pas le
// serveur au chargement et reste pur/testable en isolation.
const VALID_SUBFORMS: Record<string, readonly string[]> = {
  corporelle: ["endurance", "explosivite", "coordination_fine", "coordination_collective", "precision"],
  spatial: ["orientation", "visualisation_3d", "representation_graphique", "organisation_espace"],
  sociale: ["leadership", "mediation", "collaboration", "ecoute_empathique"],
  entrepreneuriale: ["negociation", "prise_de_risque", "sens_du_client", "gestion_ressources"],
  creative: ["invention_visuelle", "narration", "improvisation", "detournement"],
  artisanale: ["dexterite_fine", "assemblage", "reparation", "finition_esthetique"],
  emotionnelle: ["autoregulation", "expression", "empathie", "resilience"],
  logico_mathematique: ["raisonnement_abstrait", "calcul", "resolution_problemes", "reconnaissance_motifs"],
  linguistique: ["expression_ecrite", "expression_orale", "argumentation", "memorisation_lexicale"],
};

// Exports de verrouillage : le test naya-verifier.test.ts compare ces copies locales
// aux sources autoritaires (talent-buckets / challenges.functions) pour empêcher toute
// dérive silencieuse entre ce module (délibérément sans dépendance serveur au
// chargement) et les listes de référence du moteur.
export const NAYA_LOCAL_TALENT_KEYS = VALID_TALENT_KEYS;
export const NAYA_LOCAL_SUBFORMS = VALID_SUBFORMS;

const VALID_DIFFICULTIES = ["facile", "moyen", "difficile"] as const;
const VALID_PROOF_MODES = ["photo", "declarative"] as const;
const VALID_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
  "READY_FOR_MORE",
  "OTHER",
] as const;
const VALID_NOT_COMPLETED_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
  "OTHER",
] as const;

// Mots à connotation clinique/diagnostique proscrits des textes destinés au parent.
const CLINICAL_WORDS = [
  "trouble",
  "déficit",
  "diagnostic",
  "tdah",
  "dyslexie",
  "dyscalculie",
  "anomalie",
  "pathologie",
  "handicap",
  "retard",
];

// Coût estimé par génération (USD, ordre de grandeur) — alimente le tableau de
// bord admin tant que naya-telemetry n'est pas branché sur les tokens réels (C4.1).
const KIND_ESTIMATED_COST: Partial<Record<GenerationKind, number>> = {
  challenge_bulk: 0.02,
  challenge_single: 0.005,
  homework: 0.005,
  recommendation: 0.003,
  discriminant: 0.003,
  support_retest: 0.003,
  hypothesis: 0.01, // deepseek-reasoner (premium)
  proof_validation: 0.01, // vision Sonnet, maxTokens borné
  not_completed_classification: 0.001,
  synthesis: 0.002,
  letter: 0.001,
  narrative: 0.002,
  proof_tampon: 0.002,
};

// ── Helpers purs ────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function conformityFrom(violations: Violation[]): Conformity {
  if (violations.some((v) => v.severity === "majeur")) return "majeur";
  return violations.length > 0 ? "mineur" : "conforme";
}

/** Fusionne deux listes de violations, dédupliquées par règle (majeur prime). */
export function mergeViolations(a: Violation[], b: Violation[]): Violation[] {
  const out = [...a];
  const seen = new Map(out.map((v) => [v.rule, v]));
  for (const v of b) {
    const existing = seen.get(v.rule);
    if (!existing) {
      seen.set(v.rule, v);
      out.push(v);
    } else if (v.severity === "majeur" && existing.severity === "mineur") {
      const idx = out.indexOf(existing);
      out[idx] = v;
      seen.set(v.rule, v);
    }
  }
  return out;
}

/** Extrait les objets défi d'une sortie, quel que soit le type de génération. */
function extractChallengeObjects(kind: GenerationKind, output: unknown): Record<string, unknown>[] {
  if (kind === "challenge_bulk") {
    const arr = isRecord(output) ? output.challenges : undefined;
    return Array.isArray(arr) ? arr.filter(isRecord) : [];
  }
  return isRecord(output) ? [output] : [];
}

// ── Validateurs déterministes (couche 1 — toujours active) ──────────────────

function validateChallengeRecord(c: Record<string, unknown>, ctx: VerifyContext, kind: GenerationKind): Violation[] {
  const v: Violation[] = [];
  const title = str(c.title);
  const description = str(c.description);

  if (!title.trim()) {
    v.push({ rule: "challenge.title_present", severity: "majeur", detail: "Titre manquant ou vide.", suggestion: "Fournis un titre accrocheur, compréhensible par l'enfant." });
  }
  if (!description.trim()) {
    v.push({ rule: "challenge.description_present", severity: "majeur", detail: "Description manquante ou vide.", suggestion: "Rédige un pitch pour l'enfant, compréhensible sans adulte." });
  }

  const intelligences = c.intelligences;
  if (Array.isArray(intelligences)) {
    if (intelligences.length < 1 || intelligences.length > 2) {
      v.push({ rule: "challenge.intelligences_count", severity: "mineur", detail: `${intelligences.length} intelligence(s) ciblée(s) (1 à 2 attendues).`, suggestion: "Cible 1 à 2 intelligences réellement sollicitées." });
    }
    const bad = intelligences.filter((k) => typeof k !== "string" || !(VALID_TALENT_KEYS as readonly string[]).includes(k));
    if (bad.length) {
      v.push({ rule: "challenge.intelligences_valid", severity: "majeur", detail: `Clés d'intelligence invalides : ${bad.join(", ")}.`, suggestion: "Utilise uniquement les clés techniques exactes des 9 intelligences." });
    }
  } else if (intelligences !== undefined && intelligences !== null) {
    v.push({ rule: "challenge.intelligences_valid", severity: "majeur", detail: "intelligences n'est pas un tableau.", suggestion: "intelligences doit être un tableau de 1 à 2 clés." });
  }

  const difficulty = str(c.difficulty);
  if (difficulty && !(VALID_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    v.push({ rule: "challenge.difficulty_valid", severity: "majeur", detail: `difficulty invalide : ${difficulty}.`, suggestion: "facile | moyen | difficile." });
  }

  const proofMode = str(c.proof_mode);
  if (proofMode && !(VALID_PROOF_MODES as readonly string[]).includes(proofMode)) {
    v.push({ rule: "challenge.proof_mode_valid", severity: "majeur", detail: `proof_mode invalide : ${proofMode}.`, suggestion: "photo | declarative." });
  }
  if (proofMode === "declarative") {
    const pt = isRecord(c.proof_target) ? c.proof_target : undefined;
    const award = isRecord(c.declarative_award) ? c.declarative_award : undefined;
    if (!pt || typeof pt.metric !== "string" || !pt.metric.trim() || pt.value === undefined || pt.value === null) {
      v.push({ rule: "challenge.proof_declarative_complete", severity: "mineur", detail: "proof_mode=declarative sans proof_target complet.", suggestion: "Ajoute proof_target {metric, value} pour toute cible déclarative." });
    }
    if (!award || Object.keys(award).length === 0) {
      v.push({ rule: "challenge.proof_declarative_complete", severity: "mineur", detail: "proof_mode=declarative sans declarative_award.", suggestion: "Ajoute declarative_award {clé:points}, clés parmi les 9 intelligences." });
    } else {
      const badAward = Object.keys(award).filter((k) => !(VALID_TALENT_KEYS as readonly string[]).includes(k));
      if (badAward.length) {
        v.push({ rule: "challenge.declarative_award_valid", severity: "mineur", detail: `Clés declarative_award invalides : ${badAward.join(", ")}.`, suggestion: "Clés exclusivement parmi les 9 intelligences." });
      }
    }
  } else if (proofMode === "photo" && (c.proof_target !== undefined || c.declarative_award !== undefined)) {
    v.push({ rule: "challenge.proof_declarative_complete", severity: "mineur", detail: "proof_mode=photo avec des champs déclaratifs résiduels.", suggestion: "N'inclus ni proof_target ni declarative_award en mode photo." });
  }

  const trait = str(c.trait_subform);
  if (trait) {
    const chosen = Array.isArray(intelligences) ? intelligences.filter((k): k is string => typeof k === "string") : [];
    const allowed = chosen.flatMap((k) => VALID_SUBFORMS[k] ?? []);
    if (allowed.length > 0 && !allowed.includes(trait)) {
      v.push({ rule: "challenge.trait_subform_valid", severity: "mineur", detail: `trait_subform "${trait}" hors des sous-formes de l'intelligence choisie (${chosen.join(", ") || "aucune"}).`, suggestion: "Choisis une sous-forme listée pour l'intelligence choisie, ou omets le champ." });
    } else if (allowed.length === 0) {
      v.push({ rule: "challenge.trait_subform_valid", severity: "mineur", detail: `trait_subform "${trait}" fourni sans intelligence parente choisie.`, suggestion: "Ajoute l'intelligence parente dans intelligences, ou omets trait_subform." });
    }
  }

  const steps = c.steps;
  if (Array.isArray(steps)) {
    if (steps.length < 3 || steps.length > 6) {
      v.push({ rule: "challenge.steps_count", severity: "mineur", detail: `${steps.length} étapes (3 à 6 attendues).`, suggestion: "Décompose en 3 à 6 gestes concrets et complets." });
    }
  }

  const tags = c.material_tags;
  if (Array.isArray(tags)) {
    const upper = tags.filter((t) => typeof t === "string" && /[A-ZÀ-Ü]/.test(t));
    if (upper.length) {
      v.push({ rule: "challenge.material_tags_format", severity: "mineur", detail: `tags avec majuscules : ${upper.join(", ")}.`, suggestion: "Tags courts, minuscules, sans accent, par matériau achetable." });
    }
  }

  const acadDomain = str(c.academic_domain);
  if (acadDomain === "creative") {
    v.push({ rule: "challenge.academic_domain_creative_forbidden", severity: "mineur", detail: "academic_domain=creative est interdit (développement non linéaire par âge).", suggestion: "Omet les champs académiques pour la créativité pure." });
  } else if (acadDomain) {
    const lvl = c.academic_level_age;
    if (typeof lvl !== "number" || !Number.isInteger(lvl) || lvl < 3 || lvl > 18) {
      v.push({ rule: "challenge.academic_level_coherent", severity: "mineur", detail: `academic_level_age invalide : ${String(lvl)}.`, suggestion: "academic_level_age doit être un entier 3-18." });
    }
    if (!str(c.academic_reference_note).trim()) {
      v.push({ rule: "challenge.academic_level_coherent", severity: "mineur", detail: "academic_reference_note manquante.", suggestion: "Cite la ligne du référentiel utilisée." });
    }
    if (typeof lvl === "number" && ctx.childAge !== undefined) {
      const gap = Math.abs(lvl - ctx.childAge);
      if (gap > 5) {
        v.push({ rule: "challenge.academic_level_vs_age", severity: "mineur", detail: `academic_level_age ${lvl} ans pour un enfant de ${ctx.childAge} ans (écart ${gap} ans).`, suggestion: "Vérifie que le contenu correspond vraiment au niveau étiqueté, ou ajuste academic_level_age." });
      }
    }
  }

  const reqSup = c.requires_supervision;
  const warn = str(c.supervision_warning);
  if (reqSup === true && !warn.trim()) {
    v.push({ rule: "challenge.supervision_coherent", severity: "mineur", detail: "requires_supervision=true sans supervision_warning.", suggestion: "Ajoute une mise en garde concrète adaptée à l'âge." });
  }
  if (reqSup === false && warn.trim()) {
    v.push({ rule: "challenge.supervision_coherent", severity: "mineur", detail: "requires_supervision=false avec une supervision_warning renseignée.", suggestion: "Nullifie supervision_warning si aucun risque réel." });
  }

  if (title.trim() && ctx.existingTitles?.includes(title)) {
    v.push({ rule: "challenge.title_unique", severity: "mineur", detail: `Titre déjà proposé : "${title}".`, suggestion: "Propose un titre inédit." });
  }

  const textFields = [title, description, ...(Array.isArray(steps) ? steps.map(str) : [])];
  if (textFields.some((t) => t.includes("**") || /(^|\n)#/.test(t))) {
    v.push({ rule: "challenge.no_markdown", severity: "mineur", detail: "Syntaxe Markdown détectée dans un champ texte.", suggestion: "Phrases en texte brut uniquement." });
  }

  return v;
}

function validateHomeworkRecord(c: Record<string, unknown>, ctx: VerifyContext): Violation[] {
  const v = validateChallengeRecord(c, ctx, "homework");
  if (!str(c.behavioral_driver).trim()) {
    v.push({ rule: "homework.behavioral_driver_present", severity: "mineur", detail: "behavioral_driver manquant.", suggestion: "Indique le levier comportemental utilisé pour ce devoir fusionné." });
  }
  const zpa = c.zpa_level;
  if (typeof zpa === "number" && (zpa < 1 || zpa > 5)) {
    v.push({ rule: "homework.zpa_level_valid", severity: "mineur", detail: `zpa_level ${zpa} hors de 1-5.`, suggestion: "Niveau ZPA entre 1 (très guidé) et 5 (autonome)." });
  }
  if (ctx.anxietyDamped && str(c.difficulty) === "difficile") {
    v.push({ rule: "homework.anti_anxiety", severity: "majeur", detail: "Contexte d'anxiété détecté mais difficulty=difficile.", suggestion: "Mode très guidé et rassurant : baisse la difficulté et la pression." });
  }
  return v;
}

function validateRecommendationRecord(c: Record<string, unknown>, ctx: VerifyContext): Violation[] {
  const v = validateChallengeRecord(c, ctx, "recommendation");
  if (ctx.requiresStabilisation) {
    if (str(c.difficulty) === "difficile") {
      v.push({ rule: "recommendation.difficulte_douce", severity: "majeur", detail: "Défi de stabilisation en difficulty=difficile (doit rassurer, pas challenger).", suggestion: "difficulty=facile, étapes ultra-simples, réussite quasi certaine." });
    }
    if (Array.isArray(c.steps) && c.steps.length > 4) {
      v.push({ rule: "recommendation.difficulte_douce", severity: "mineur", detail: "Défi de stabilisation avec trop d'étapes.", suggestion: "Peu d'étapes, très simples, sans surprise." });
    }
  }
  return v;
}

function validateHypothesis(output: Record<string, unknown>, ctx: VerifyContext): Violation[] {
  const v: Violation[] = [];
  const hypotheses = Array.isArray(output.hypotheses) ? output.hypotheses.filter(isRecord) : [];
  if (hypotheses.length < 1 || hypotheses.length > 3) {
    v.push({ rule: "hypothesis.count", severity: "mineur", detail: `${hypotheses.length} hypothèse(s) (1 à 3 attendues).`, suggestion: "1 à 3 hypothèses classées de la plus à la moins probable." });
  }
  const sum = hypotheses.reduce((acc, h) => acc + (typeof h.prior_probability === "number" ? h.prior_probability : 0), 0);
  if (Math.abs(sum - 1) > 0.001) {
    v.push({ rule: "hypothesis.probabilities_sum", severity: "majeur", detail: `Somme des prior_probability = ${sum.toFixed(3)} (attendue 1.0).`, suggestion: "La somme des probabilités doit valoir exactement 1.0." });
  }
  for (const h of hypotheses) {
    if (!(VALID_CAUSES as readonly string[]).includes(str(h.cause))) {
      v.push({ rule: "hypothesis.cause_valid", severity: "majeur", detail: `Cause invalide : ${String(h.cause)}.`, suggestion: `Une des causes exactes : ${VALID_CAUSES.join(", ")}.` });
    }
    if (!Array.isArray(h.evidence_log) || h.evidence_log.length === 0) {
      v.push({ rule: "hypothesis.evidence_snapshot", severity: "mineur", detail: "Hypothèse sans evidence_log.", suggestion: "Cite les nœuds réels du snapshot qui justifient l'hypothèse." });
    }
  }
  if (ctx.direction === "BEHIND") {
    const bad = hypotheses.filter((h) => h.cause === "READY_FOR_MORE");
    if (bad.length) {
      v.push({ rule: "hypothesis.direction_coherent", severity: "mineur", detail: "READY_FOR_MORE proposée pour un écart « en retard ».", suggestion: "READY_FOR_MORE ne s'applique qu'à un écart « en avance »." });
    }
  }
  if (ctx.direction === "AHEAD") {
    const bad = hypotheses.filter((h) => h.cause === "METHOD_MISMATCH" || h.cause === "CONCEPTUAL_GAP");
    if (bad.length) {
      v.push({ rule: "hypothesis.direction_coherent", severity: "mineur", detail: "Cause « en retard » proposée pour un écart « en avance ».", suggestion: "READY_FOR_MORE est presque toujours l'hypothèse dominante « en avance »." });
    }
  }
  return v;
}

function validateProseText(text: string, kind: GenerationKind, _ctx: VerifyContext): Violation[] {
  const v: Violation[] = [];
  if (!text.trim()) {
    v.push({ rule: `${kind}.text_present`, severity: "majeur", detail: "Texte vide.", suggestion: "Produis un texte non vide." });
    return v;
  }
  if (/\d/.test(text)) {
    v.push({ rule: "prose.zero_chiffre", severity: "mineur", detail: "Chiffre(s) détecté(s) dans un texte destiné au parent.", suggestion: "Traduis toute donnée chiffrée en tendance qualitative." });
  }
  const lowered = text.toLowerCase();
  const clinical = CLINICAL_WORDS.filter((w) => lowered.includes(w));
  if (clinical.length) {
    v.push({ rule: "prose.ton_non_pathologisant", severity: "majeur", detail: `Vocabulaire clinique détecté : ${clinical.join(", ")}.`, suggestion: "Description comportementale factuelle, observation provisoire, jamais de diagnostic." });
  }
  if (text.includes("**") || /(^|\n)#/.test(text)) {
    v.push({ rule: "prose.no_markdown", severity: "mineur", detail: "Syntaxe Markdown détectée.", suggestion: "Texte brut sans Markdown." });
  }
  return v;
}

function validateProofValidation(output: Record<string, unknown>, _ctx: VerifyContext): Violation[] {
  const v: Violation[] = [];
  if (!str(output.observations).trim()) {
    v.push({ rule: "proof_validation.observations_present", severity: "majeur", detail: "observations manquantes.", suggestion: "Rédige une courte observation (ou un refus poli si la preuve est hors-sujet)." });
  }
  const award = isRecord(output.talents_awarded) ? output.talents_awarded : undefined;
  if (award) {
    for (const [k, val] of Object.entries(award)) {
      if (!(VALID_TALENT_KEYS as readonly string[]).includes(k)) {
        v.push({ rule: "proof_validation.talents_valid", severity: "majeur", detail: `Clé d'intelligence invalide : ${k}.`, suggestion: "Clés parmi les 9 intelligences." });
      }
      if (typeof val === "number" && (val < 0 || val > 3)) {
        v.push({ rule: "proof_validation.talents_valid", severity: "mineur", detail: `Points hors 0-3 : ${k}=${val}.`, suggestion: "Points de 1 à 3 (0 autorisé pour hors-sujet)." });
      }
    }
  }
  return v;
}

function validateClassification(output: Record<string, unknown>, _ctx: VerifyContext): Violation[] {
  const v: Violation[] = [];
  const cat = str(output.cause ?? output.category);
  if (cat && !(VALID_NOT_COMPLETED_CAUSES as readonly string[]).includes(cat)) {
    v.push({ rule: "classification.cause_valid", severity: "majeur", detail: `Cause invalide : ${cat}.`, suggestion: `Une des causes exactes : ${VALID_NOT_COMPLETED_CAUSES.join(", ")}.` });
  }
  return v;
}

// ── verifyGeneration (couche 1 — pur, synchrone) ─────────────────────────────

export function verifyGeneration(kind: GenerationKind, output: unknown, context: VerifyContext = {}): VerifyVerdict {
  const violations: Violation[] = [];
  try {
    switch (kind) {
      case "challenge_bulk":
        for (const c of extractChallengeObjects(kind, output)) violations.push(...validateChallengeRecord(c, context, kind));
        break;
      case "homework":
        for (const c of extractChallengeObjects(kind, output)) violations.push(...validateHomeworkRecord(c, context));
        break;
      case "recommendation":
        for (const c of extractChallengeObjects(kind, output)) violations.push(...validateRecommendationRecord(c, context));
        break;
      case "challenge_single":
      case "discriminant":
      case "support_retest":
        for (const c of extractChallengeObjects(kind, output)) violations.push(...validateChallengeRecord(c, context, kind));
        break;
      case "hypothesis":
        if (isRecord(output)) violations.push(...validateHypothesis(output, context));
        break;
      case "synthesis":
      case "letter":
      case "narrative":
        violations.push(...validateProseText(typeof output === "string" ? output : str(isRecord(output) ? output.text : output), kind, context));
        break;
      case "proof_validation":
        if (isRecord(output)) violations.push(...validateProofValidation(output, context));
        break;
      case "not_completed_classification":
        if (isRecord(output)) violations.push(...validateClassification(output, context));
        break;
      case "proof_tampon":
        if (isRecord(output)) violations.push(...validateProseText(str(output.tampon ?? output.text), kind, context));
        break;
    }
  } catch (err) {
    // Le Loup ne doit jamais casser la génération : toute anomalie de forme est
    // journalisée comme violation mineure, jamais propagée.
    violations.push({
      rule: "verifier.unexpected_error",
      severity: "mineur",
      detail: `Erreur interne du vérificateur : ${err instanceof Error ? err.message : String(err)}`,
    });
  }
  return { violations, conformity: conformityFrom(violations) };
}

// ── Couche 2 — vérification sémantique IA (échantillonnée) ───────────────────

// ── Garde-fous coût (C4.3) ───────────────────────────────────────────────────
// Le Loup sémantique est un poste de coût volontairement borné : modèle
// économique par défaut (deepseek-v4-flash), sortie plafonnée à ~800 tokens et
// entrée tronquée — un défi bulk entier passe en UNE vérification (vérification
// par lot naturelle, pas un appel par défi), et l'échantillonnage
// (NAYA_VERIFY_SEMANTIC_RATE) borne le volume. `NAYA_VERIFY_ENABLED=false`
// coupe tout le Loup (déterministe + sémantique + journalisation) en un flag.

/** Borne pure du maxTokens sémantique : toujours entre 300 et 800. */
export function boundSemanticMaxTokens(raw: string): number {
  const n = Number.parseInt(raw, 10);
  const parsed = Number.isFinite(n) ? n : 800;
  return Math.max(300, Math.min(800, parsed));
}

function semanticMaxTokens(): number {
  return boundSemanticMaxTokens(process.env.NAYA_VERIFY_MAX_TOKENS ?? "800");
}

/**
 * Sérialise l'output pour l'envoi au Loup et le tronque au-delà de maxChars :
 * une génération bulk (6 défis complets) peut faire plusieurs dizaines de Ko —
 * on borne la taille de l'entrée sémantique plutôt que de payer des tokens de
 * contexte pour une sortie déjà vérifiée structurellement par la couche 1.
 */
export function truncateJsonForLoup(output: unknown, maxChars: number = 40_000): string {
  const serialized = JSON.stringify(output);
  if (serialized.length <= maxChars) return serialized;
  return `${serialized.slice(0, maxChars)}…[tronqué par le Louveteau — limite ${maxChars} caractères]`;
}

/** Kill-switch global du Loup (déterministe + sémantique + journalisation). */
export function verifierEnabled(): boolean {
  return process.env.NAYA_VERIFY_ENABLED !== "false";
}

export function semanticRubricFor(kind: GenerationKind): string {
  switch (kind) {
    case "challenge_bulk":
    case "challenge_single":
    case "discriminant":
    case "support_retest":
      return `1. observable : le défi doit produire un résultat vérifiable (expérience, mécanisme, anomalie, calcul, argumentation) — pas un bricolage passif ou un coloriage sans analyse.
2. anti-bricolage-passif : un simple assemblage de carton/bouteille ne doit jamais être le cœur du défi ; les objets du quotidien sont des instruments de mesure, pas de la décoration.
3. age-coherent : la forme et la complexité doivent correspondre à l'âge indiqué.
4. materiaux-realistes-africains : le matériel doit être accessible dans un foyer africain francophone (marché, quartier, maison) — pas d'équipement coûteux ou introuvable.
5. non-generique : le défi ne doit pas être une formulation vague vue mille fois ("dessine ce que tu veux").
6. coherence-academic-level : si academic_level_age est renseigné, le contenu doit réellement correspondre à ce niveau (ni sous-calibré ni sur-calibré).
7. proof-mode-coherent : le mode de preuve doit correspondre à la nature du défi (photo pour un résultat visible, declarative pour une action comptable).
8. supervision-coherent : requires_supervision doit être true si le défi comporte un risque réel (feu, chaleur, coupant, produit chimique, électricité).`;
    case "reformulation":
      return `1. reformulation-meme-objectif : le défi doit viser le MÊME objectif pédagogique que le défi original (même compétence, niveau équivalent — jamais plus difficile).
2. reformulation-modalite : la modalité imposée (presentation_mode) doit réellement imprégner le défi — le format correspond à ce que la modalité promet (manipulation → gestes concrets, histoire → récit, etc.).
3. reformulation-fraiche : le défi ne doit ni mentionner l'échec précédent ni révéler qu'il s'agit d'une reformulation — présenté comme un défi neuf et stimulant.`;
    case "failure_sequence":
      // Chantier 5 (§36) : la narration de séquence est aujourd'hui 100 % déterministe
      // (evaluateFailureSequence, 0 IA) — la rubrique est le garde-fou de référence
      // pour toute évolution future vers un facteur explicatif assisté par IA :
      // jamais de verdict, jamais de conclusion avant ≥ 2 modalités testées (§35).
      return `1. sequence-zero-verdict : la conclusion ne doit JAMAIS dire que l'enfant « ne peut pas » ou est « nul » — la compétence reste « encore à explorer » ou la modalité gagnante est nommée.
2. sequence-garde-fou-35 : aucune conclusion de séquence avant au moins 2 modalités testées (ou une réussite) — sinon la boucle reste ouverte.
3. sequence-zero-chiffre : aucune donnée quantitative (nombre d'essais, scores) dans la narration parent.`;
    case "homework":
      return `1. fusion-consigne : le défi doit réellement faire réviser/apprendre la consigne scolaire fournie, pas la contourner.
2. zpa-coherent : la difficulté doit correspondre au niveau ZPA indiqué (soutien renforcé → très guidé).
3. anti-anxiete : si un contexte d'anxiété est signalé, le ton doit être rassurant, très guidé, sans pression ni compétition.`;
    case "recommendation":
      return `1. levier-vs-intention : la mécanique du défi doit correspondre à l'intention pédagogique (stabilisation → rassurer/réussite quasi garantie ; essaimage → s'appuyer sur une force pour aborder une faiblesse ; exploration → révéler un talent peu exploré).
2. difficulte-douce : un défi de stabilisation doit être facile et sans surprise.`;
    case "hypothesis":
      return `1. evidence-snapshot : chaque evidence_log doit citer des nœuds réels du snapshot fourni, pas des données inventées.
2. direction-coherente : les hypothèses doivent être cohérentes avec la direction de l'écart (en avance → READY_FOR_MORE dominant ; en retard → causes d'apprentissage).
3. anti-etiquette : la rationale ne doit jamais nommer un trouble clinique à la légère.`;
    case "synthesis":
    case "letter":
    case "narrative":
      return `1. factualite-douce : ne rien inventer (pas de chiffre, de score ou de fait absent des données fournies).
2. ton-non-pathologisant : jamais de vocabulaire clinique ou de verdict ; observation provisoire et bienveillante.
3. zero-chiffre : aucun chiffre, pourcentage ou âge précis ; traduire en tendances qualitatives.`;
    case "proof_validation":
      return `1. correspondance-preuve : la preuve décrite doit réellement correspondre au défi (hors-sujet → talents_awarded vide).
2. distribution-juste : les points attribués (1-3) doivent refléter la qualité réelle de la réalisation, pas une distribution par défaut.`;
    case "not_completed_classification":
      return `1. coherence-cause : la cause classée doit correspondre au texte de l'explication du parent.`;
    case "proof_tampon":
      return `1. chaleur-concision : une phrase courte et chaleureuse mentionnant l'intelligence utilisée, sans invention.`;
  }
}

export interface SemanticViolation {
  rule: string;
  severity: ViolationSeverity;
  detail: string;
  suggestion?: string;
}

const SEMANTIC_SCHEMA = z.object({
  violations: z
    .array(
      z.object({
        rule: z.string(),
        severity: z.enum(["mineur", "majeur"]),
        detail: z.string(),
        suggestion: z.string().optional(),
      })
    )
    .default([]),
});

/**
 * Couche 2 : le Loup IA vérifie la sémantique qualitative (échantillonné).
 * Ne lance JAMAIS d'erreur — en cas de panne IA il retourne [] (défaut : pas
 * de signal supplémentaire, la couche 1 déterministe reste la source de vérité).
 */
export async function verifyGenerationSemantic(kind: GenerationKind, output: unknown, context: VerifyContext = {}): Promise<Violation[]> {
  try {
    const { callClaude, extractJsonFromLLMResponse } = await import("@/lib/challenges.functions");
    const rubric = semanticRubricFor(kind);
    const extra =
      context.childAge !== undefined
        ? `Âge de l'enfant : ${context.childAge} ans.\n`
        : "" +
          (context.direction ? `Direction de l'écart : ${context.direction}.\n` : "") +
          (context.subject ? `Matière : ${context.subject}.\n` : "") +
          (context.requiresStabilisation ? "Type de recommandation : STABILISATION (doit rassurer, réussite quasi garantie).\n" : "");
    const prompt = `Tu es « Le Loup de Naya », le vérificateur sémantique de Génizio. Tu contrôles si une génération IA respecte des règles pédagogiques, pour lutter contre les hallucinations et les sorties génériques. Ne sois pas tatillon : ne signale que ce qui est réellement problématique.

GÉNÉRATION À VÉRIFIER (type ${kind}) :
${truncateJsonForLoup(output)}

RÈGLES À CONTRÔLER :
${rubric}

${extra}Réponds UNIQUEMENT en JSON brut, sans bloc Markdown ni préambule : {"violations":[{"rule":"nom_canonique_de_la_regle","severity":"mineur|majeur","detail":"contexte factuel précis","suggestion":"recadrage court"}]} — tableau vide si tout est conforme. Ne signale jamais une violation hors des règles listées.`;
    const raw = await callClaude(prompt, true, undefined, semanticMaxTokens(), 1);
    const parsed = SEMANTIC_SCHEMA.parse(JSON.parse(extractJsonFromLLMResponse(raw)));
    return parsed.violations;
  } catch (err) {
    console.error("Naya semantic verification failed (non-fatal):", err);
    return [];
  }
}

// ── Couche 3 — shadow + journalisation (arrière-plan, jamais bloquante) ──────

function semanticSampleEnabled(): boolean {
  const raw = process.env.NAYA_VERIFY_SEMANTIC_RATE ?? "0.1";
  const rate = Math.max(0, Math.min(1, Number.parseFloat(raw) || 0));
  return Math.random() < rate;
}

export interface VerifyAndLogOptions {
  kind: GenerationKind;
  output: unknown;
  context?: VerifyContext;
  sourceFunction: string;
  childId?: string;
  model?: string;
  /** Forcer la vérification sémantique, même hors échantillon (mode enforce). */
  forceSemantic?: boolean;
}

/**
 * Shadow helper : vérifie (déterministe toujours + sémantique échantillonnée),
 * journalise en arrière-plan, retourne le verdict. Ne peut jamais faire échouer
 * ni ralentir l'appelant.
 */
export async function verifyAndLog(options: VerifyAndLogOptions): Promise<VerifyVerdict> {
  // Kill-switch opérationnel (C4.3) : `NAYA_VERIFY_ENABLED=false` neutralise le
  // Loup en un flag, sans code à retirer — retour conforme sans aucune écriture.
  if (!verifierEnabled()) {
    return { conformity: "conforme", violations: [] };
  }
  let verdict: VerifyVerdict;
  try {
    const deterministic = verifyGeneration(options.kind, options.output, options.context ?? {});
    let violations = deterministic.violations;
    let semanticChecked = false;
    if (options.forceSemantic || semanticSampleEnabled()) {
      const semantic = await verifyGenerationSemantic(options.kind, options.output, options.context ?? {});
      violations = mergeViolations(violations, semantic);
      semanticChecked = true;
    }
    verdict = { violations, conformity: conformityFrom(violations) };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("generation_audits").insert({
        child_id: options.childId ?? null,
        kind: options.kind,
        source_function: options.sourceFunction,
        verdict: verdict.conformity,
        violations: verdict.violations as never,
        model: options.model ?? null,
        estimated_cost: KIND_ESTIMATED_COST[options.kind] ?? null,
        regenerated: false,
        semantic_checked: semanticChecked,
        context: (options.context ?? {}) as never,
      });
    } catch (err) {
      // Journalisation non bloquante : un échec d'écriture ne doit pas impacter
      // le flux parent. C'est le mode shadow par définition.
      console.error("Naya shadow audit insert failed (non-fatal):", err);
    }
  } catch (err) {
    verdict = {
      conformity: "mineur",
      violations: [
        {
          rule: "verifier.shadow_failed",
          severity: "mineur",
          detail: `Échec interne du Loup : ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }
  return verdict;
}

// ── Mode enforce (C2.4 — flag NAYA_VERIFY_ENFORCE, défaut false) ─────────────

export function shouldEnforce(): boolean {
  return process.env.NAYA_VERIFY_ENFORCE === "true";
}

/**
 * Construit le suffixe de recadrage à concaténer au prompt d'origine avant une
 * régénération ciblée. Vide si aucune violation majeure — un appelant doit
 * alors garder sa sortie et simplement marquer regenerated=false.
 */
export function buildRecadrageSuffix(verdict: VerifyVerdict): string {
  const majors = verdict.violations.filter((v) => v.severity === "majeur");
  if (majors.length === 0) return "";
  const lines = majors.map((v, i) => {
    const suggestion = v.suggestion ? ` — Correction : ${v.suggestion}` : "";
    return `${i + 1}. Règle "${v.rule}" : ${v.detail}${suggestion}`;
  });
  return `\n\nRECADRAGE — « Le Loup de Naya » a détecté des manquements majeurs à corriger AVANT de répondre :\n${lines.join("\n")}\nGénère une réponse corrigée qui respecte impérativement ces points (tu peux garder le reste de ta proposition).`;
}

// ── Endpoint admin (C2.5 — lecture seule, requireAdmin) ──────────────────────

export interface TopViolation {
  rule: string;
  severity: ViolationSeverity;
  count: number;
}

export interface GenerationAuditDashboard {
  total: number;
  byVerdict: Record<string, number>;
  byKind: Record<string, number>;
  semanticChecked: number;
  regenerated: number;
  totalEstimatedCost: number;
  lastAuditAt: string | null;
  topViolations: TopViolation[];
  recent: Array<{
    id: string;
    kind: GenerationKind;
    source_function: string;
    verdict: Conformity;
    created_at: string;
  }>;
}

/**
 * Tableau de bord du Loup : taux de conformité par type, top violations récurrentes
 * (alimentera le chantier 3), coût estimé. Lecture seule, réservé admin.
 */
export const getGenerationAuditsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<GenerationAuditDashboard> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [rowsRes, recentRes] = await Promise.all([
      supabaseAdmin
        .from("generation_audits")
        .select("kind, verdict, violations, semantic_checked, regenerated, estimated_cost, created_at"),
      supabaseAdmin
        .from("generation_audits")
        .select("id, kind, source_function, verdict, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const rows = rowsRes.data ?? [];
    const byVerdict: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let semanticChecked = 0;
    let regenerated = 0;
    let totalEstimatedCost = 0;
    const violationCounts = new Map<string, TopViolation>();

    for (const row of rows) {
      byVerdict[row.verdict] = (byVerdict[row.verdict] ?? 0) + 1;
      byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
      if (row.semantic_checked) semanticChecked += 1;
      if (row.regenerated) regenerated += 1;
      totalEstimatedCost += typeof row.estimated_cost === "number" ? row.estimated_cost : 0;
      const violations = Array.isArray(row.violations) ? row.violations : [];
      for (const v of violations) {
        if (!v || typeof v !== "object") continue;
        const rule = String((v as { rule?: unknown }).rule ?? "inconnu");
        const severity = (v as { severity?: unknown }).severity === "majeur" ? "majeur" : "mineur";
        const key = `${rule}|${severity}`;
        const current = violationCounts.get(key);
        if (current) current.count += 1;
        else violationCounts.set(key, { rule, severity, count: 1 });
      }
    }

    const topViolations = [...violationCounts.values()].sort((a, b) => b.count - a.count).slice(0, 20);

    return {
      total: rows.length,
      byVerdict,
      byKind,
      semanticChecked,
      regenerated,
      totalEstimatedCost: Math.round(totalEstimatedCost * 1000) / 1000,
      lastAuditAt: recentRes.data?.[0]?.created_at ?? null,
      topViolations,
      recent: (recentRes.data ?? []).map((r) => ({
        id: r.id,
        kind: r.kind as GenerationKind,
        source_function: r.source_function,
        verdict: r.verdict as Conformity,
        created_at: r.created_at,
      })),
    };
  });
