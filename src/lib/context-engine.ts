// Context Engine — Moteur de contextualisation dynamique et de synthèse d'état
//
// Principe architectural fondamental :
// « Le prompt ne doit jamais être le cerveau du système. L'IA génère et interprète
// des expériences concrètes ; Genizio conserve, synthétise et gouverne la mémoire,
// les hypothèses, les niveaux de maîtrise et les objectifs de développement de l'enfant. »
//
// Ce module transforme l'ensemble des données multi-sources de Genizio (profil,
// talents Gardner, historique de défis, découvertes, traces d'équipe, aspirations)
// en un état opérationnel épuré : le `ChildDevelopmentState`.

import { localMaterialsForCountry } from "./contextualization";
import { getLeastExploredTalentLabels } from "./talent-buckets";
import type { TimePressure } from "./time-limit";
import type { LearningProfile, AbilityValue, Aspiration } from "./profile-context";
import type { ProgressionTarget } from "./challenges.functions";
import type { InterestHypotheses } from "./interest-confidence";
import type { AspirationHypotheses } from "./aspiration-confidence";

export interface ChildDevelopmentState {
  identity: {
    childId: string;
    name: string;
    age: number;
    location: string;
    schoolLevel?: string | null;
    schoolRelation?: string | null;
    lifeContext: string[];
  };
  capabilities: {
    /** Scores Gardner actuels normalisés */
    gardnerTalents: Record<string, number>;
    /** Domaines où l'enfant a déjà validé des acquis */
    stableDomains: string[];
    /** Nombre de défis complétés par domaine */
    domainCompletedCounts?: Record<string, number>;
    /** Cibles de progression ZPD calculées par domaine */
    progressionTargets: Array<{
      domain: string;
      lastLevelAge: number;
      targetLevelAge: number;
      hasUnconsolidatedCollectivePeak?: boolean;
      cause?: string | null;
    }>;
    /** Talents les moins explorés nécessitant une passerelle transversale */
    leastExploredTalents: string[];
    /** Domaines délaissés ou en rejet à ne pas forcer */
    ignoredOrFatiguedDomains: string[];
  };
  activeHypotheses: Array<{
    id: string;
    type: "aspiration_job" | "learning_mode" | "collective_posture" | "progression" | "interest";
    statement: string;
    confidence: number; // 0.0 à 1.0
    status: "untested" | "exploring" | "confirmed" | "refuted";
    targetDomain?: string;
    targetTalents?: string[];
  }>;
  operationalContext: {
    localMaterials: string[];
    timePressure?: string | null;
    recentCompletedSummary: string;
    latestChildQuestion?: string | null;
    existingTitles: string[];
  };
}

export interface BuildChildDevelopmentStateInput {
  child: {
    id: string;
    name: string;
    age: number;
    city?: string | null;
    country?: string | null;
    talents?: Record<string, number> | null;
    interests?: string[] | null;
    school_level?: string | null;
    school_relation?: string | null;
    life_context?: string[] | null;
    learning_profile?: LearningProfile | null;
    ability_profile?: Record<string, AbilityValue> | null;
    aspirations?: Aspiration[] | null;
    time_pressure?: TimePressure | string | null;
  };
  completedChallenges?: Array<{
    id: string;
    title: string;
    domain: string;
    academic_domain?: string | null;
    academic_level_age?: number | null;
    ai_observations?: string | null;
    completed_at?: string | null;
  }>;
  staleChallenges?: Array<{ domain: string }>;
  progressionTargets?: Array<
    Partial<ProgressionTarget> & {
      domain: string;
      lastLevelAge: number;
      targetLevelAge: number;
      hasUnconsolidatedCollectivePeak?: boolean;
      cause?: string | null;
    }
  >;
  interestHypotheses?: InterestHypotheses | null;
  aspirationHypotheses?: AspirationHypotheses | null;
  activeHypotheses?: any;
  latestChildQuestion?: string | null;
  existingTitles?: string[];
}

/**
 * Synthétise l'ensemble des données d'un enfant en un ChildDevelopmentState opérationnel.
 * 0 appel IA ici : tout est calculé de manière prévisible, déterministe et mesurable.
 */
export function buildChildDevelopmentState(
  input: BuildChildDevelopmentStateInput,
): ChildDevelopmentState {
  const {
    child,
    completedChallenges = [],
    staleChallenges = [],
    progressionTargets = [],
    interestHypotheses,
    aspirationHypotheses,
    latestChildQuestion,
    existingTitles = [],
  } = input;

  // 1. Identité & Géographie
  const location = [child.city, child.country].filter(Boolean).join(", ") || "non précisé";
  const lifeContext = Array.isArray(child.life_context) ? child.life_context : [];

  // 2. Capacités et acquis
  const gardnerTalents = (child.talents || {}) as Record<string, number>;
  const domainCompletedCounts: Record<string, number> = {};
  for (const c of completedChallenges) {
    if (c.domain) {
      domainCompletedCounts[c.domain] = (domainCompletedCounts[c.domain] ?? 0) + 1;
    }
  }

  const stableDomains = Object.entries(domainCompletedCounts)
    .filter(([, count]) => count >= 2)
    .map(([domain]) => domain);

  const staleDomainCounts: Record<string, number> = {};
  for (const s of staleChallenges) {
    if (s.domain) {
      staleDomainCounts[s.domain] = (staleDomainCounts[s.domain] ?? 0) + 1;
    }
  }
  const ignoredOrFatiguedDomains = Object.entries(staleDomainCounts)
    .filter(([, count]) => count >= 2)
    .map(([domain]) => domain);

  const leastExploredTalents = getLeastExploredTalentLabels(gardnerTalents);

  const mappedProgressionTargets = progressionTargets.map((t) => ({
    domain: t.domain,
    lastLevelAge: t.lastLevelAge,
    targetLevelAge: t.targetLevelAge,
    hasUnconsolidatedCollectivePeak: t.hasUnconsolidatedCollectivePeak,
    cause: t.cause,
  }));

  // 3. Hypothèses actives (synthèse unifiée des pistes d'apprentissage)
  const activeHypotheses: ChildDevelopmentState["activeHypotheses"] = [];

  // A. Hypothèses d'aspirations métiers (avec ponts cognitifs)
  if (aspirationHypotheses?.byLabel) {
    for (const [label, h] of Object.entries(aspirationHypotheses.byLabel)) {
      activeHypotheses.push({
        id: `asp_${label.toLowerCase().replace(/\s+/g, "_")}`,
        type: "aspiration_job",
        statement: `Aspiration « ${h.label} » : vérifier l'affinité avec ses compétences fondamentales`,
        confidence: h.engagement ?? 0.5,
        status: h.status,
        targetDomain: h.bridge?.domains?.[0],
        targetTalents: h.bridge?.talentKeys,
      });
    }
  }

  // B. Hypothèses de centres d'intérêt / leviers d'action
  if (interestHypotheses?.byTag) {
    for (const [tag, h] of Object.entries(interestHypotheses.byTag)) {
      if (h.status === "confirmed" || h.status === "untested") {
        activeHypotheses.push({
          id: `int_${tag.toLowerCase().replace(/\s+/g, "_")}`,
          type: "interest",
          statement: `Levier d'action « ${h.tag} » (${h.talentLabel})`,
          confidence: h.confidence,
          status: h.status,
          targetTalents: [h.talentKey],
        });
      }
    }
  }

  // C. Hypothèses issues du profil d'apprentissage déclaré
  if (child.learning_profile) {
    const lp = child.learning_profile;
    if (lp.learning_mode) {
      const modes = Array.isArray(lp.learning_mode) ? lp.learning_mode : [lp.learning_mode];
      for (const m of modes) {
        activeHypotheses.push({
          id: `mode_${m}`,
          type: "learning_mode",
          statement: `Apprend préférentiellement en modalité : ${m}`,
          confidence: 0.5, // Prior initial à éprouver
          status: "untested",
        });
      }
    }
    if (lp.collab_preference) {
      activeHypotheses.push({
        id: `collab_${lp.collab_preference}`,
        type: "collective_posture",
        statement: `Posture relationnelle préférée : ${lp.collab_preference}`,
        confidence: 0.5,
        status: "untested",
      });
    }
  }

  // D. Hypothèses de pic collectif non consolidé
  for (const t of progressionTargets) {
    if (t.hasUnconsolidatedCollectivePeak) {
      activeHypotheses.push({
        id: `peak_${t.domain}`,
        type: "progression",
        statement: `Pic de performance en groupe observé en ${t.domain} (âge ${t.targetLevelAge}) : vérifier l'autonomie solo`,
        confidence: 0.4, // Pic non consolidé = confiance modérée nécessitant épreuve
        status: "exploring",
        targetDomain: t.domain,
      });
    }
  }

  // 4. Contexte Opérationnel
  const localMaterials = localMaterialsForCountry(child.country || "");
  const recentCompletedSummary = completedChallenges
    .slice(0, 6)
    .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? "Validé"}"`)
    .join("\n");

  return {
    identity: {
      childId: child.id,
      name: child.name,
      age: child.age,
      location,
      schoolLevel: child.school_level,
      schoolRelation: child.school_relation,
      lifeContext,
    },
    capabilities: {
      gardnerTalents,
      stableDomains,
      domainCompletedCounts,
      progressionTargets: mappedProgressionTargets,
      leastExploredTalents,
      ignoredOrFatiguedDomains,
    },
    activeHypotheses,
    operationalContext: {
      localMaterials,
      timePressure: child.time_pressure ? String(child.time_pressure) : null,
      recentCompletedSummary,
      latestChildQuestion: latestChildQuestion?.trim() || null,
      existingTitles,
    },
  };
}
