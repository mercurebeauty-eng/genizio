import { 
  TeamRole, 
  ImplicationLevel, 
  ParticipationStatus,
  EnvironmentalConditions,
  SupervisorObservableTag, 
  computeRolePlasticity 
} from "./collective-capability";
import { type DiagnosticHypothesis, getTriangulatedCompetencies } from "./diagnostic-hypotheses";
import { analyzeMobilizationConditions, type MobilizationConditionHypothesis } from "./mobilization-conditions";

export interface LongitudinalExperience {
  id: string;
  title: string;
  domain: string;
  sourceType: string; // "fablab_marathon", "projet_collectif", etc.
  role: TeamRole | "non_specifie";
  implication: ImplicationLevel | "non_specifie";
  participationStatus: ParticipationStatus;
  environmentalConditions?: EnvironmentalConditions;
  supervisorTags: SupervisorObservableTag[];
  proofImageUrl?: string | null;
  occurredAt: string;
  supervisorProvenance?: {
    supervisorId: string;
    contextName: string;
  };
}

export interface BehavioralEvidenceSummary {
  totalProjects: number;
  distinctDomains: number;
  tagsFrequency: Record<string, { count: number; dimension: string; impact: string }>;
}

export interface RoleDistributionSummary {
  rolesFrequency: Partial<Record<TeamRole, number>>;
  mostFrequentRole: TeamRole | "non_specifie" | null;
  plasticityScore: number; // 0 to 1
}

export interface LongitudinalGraph {
  experiences: LongitudinalExperience[];
  behavioralSummary: BehavioralEvidenceSummary;
  roleSummary: RoleDistributionSummary;
  triangulatedCompetencies: DiagnosticHypothesis[];
  mobilizationInsights: MobilizationConditionHypothesis[];
}

/**
 * Extrait les expériences longitudinales d'équipe (Fab Lab, projets collectifs)
 * depuis les traces de découverte brutes et les défis (si collaboratifs).
 */
export function extractLongitudinalExperiences(
  discoveryTraces: any[],
  challenges: any[] = [], // Réservé pour de futurs défis explicitement taggés 'groupe'
  hypotheses: DiagnosticHypothesis[] = []
): LongitudinalGraph {
  const experiences: LongitudinalExperience[] = [];

  // 1. Filtrage et Mapping des traces
  for (const trace of discoveryTraces || []) {
    if (trace.source_type === "fablab_marathon" || trace.source_type === "projet_collectif") {
      const collectivePayload = trace.ai_behavioral_analysis as any || {};
      
      experiences.push({
        id: trace.id,
        title: trace.title || "Projet d'équipe sans titre",
        domain: trace.domain,
        sourceType: trace.source_type,
        role: (collectivePayload.role as TeamRole) || "non_specifie",
        implication: (collectivePayload.implication as ImplicationLevel) || "non_specifie",
        participationStatus: (collectivePayload.participationStatus as ParticipationStatus) || "active_participant",
        environmentalConditions: collectivePayload.environmentalConditions || undefined,
        supervisorTags: Array.isArray(collectivePayload.supervisorTags) ? collectivePayload.supervisorTags : [],
        proofImageUrl: trace.proof_image_url || null,
        occurredAt: trace.created_at || new Date().toISOString(),
        supervisorProvenance: collectivePayload.supervisorProvenance || undefined
      });
    }
  }

  // Tri chronologique inversé (du plus récent au plus ancien)
  experiences.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  // 2. Agrégation Comportementale (Soft skills & Tags)
  const tagsFrequency: Record<string, { count: number; dimension: string; impact: string }> = {};
  const uniqueDomains = new Set<string>();

  for (const exp of experiences) {
    if (exp.domain) uniqueDomains.add(exp.domain);
    for (const tag of exp.supervisorTags) {
      if (!tagsFrequency[tag.tag]) {
        tagsFrequency[tag.tag] = { count: 0, dimension: tag.dimension, impact: tag.impact };
      }
      tagsFrequency[tag.tag].count++;
    }
  }

  const behavioralSummary: BehavioralEvidenceSummary = {
    totalProjects: experiences.length,
    distinctDomains: uniqueDomains.size,
    tagsFrequency,
  };

  // 3. Synthèse de la plasticité de Rôles
  const rolesFrequency: Partial<Record<TeamRole, number>> = {};
  const pastRolesForPlasticity: TeamRole[] = [];
  let mostFrequentRole: TeamRole | "non_specifie" | null = null;
  let maxCount = 0;

  for (const exp of experiences) {
    if (exp.role !== "non_specifie") {
      pastRolesForPlasticity.push(exp.role);
      rolesFrequency[exp.role] = (rolesFrequency[exp.role] || 0) + 1;
      
      if (rolesFrequency[exp.role]! > maxCount) {
        maxCount = rolesFrequency[exp.role]!;
        mostFrequentRole = exp.role;
      }
    }
  }

  const plasticityScore = computeRolePlasticity(pastRolesForPlasticity);

  const roleSummary: RoleDistributionSummary = {
    rolesFrequency,
    mostFrequentRole,
    plasticityScore,
  };

  // 4. Inférence des conditions écologiques de mobilisation
  const mobilizationInsights = analyzeMobilizationConditions(experiences);

  return {
    experiences,
    behavioralSummary,
    roleSummary,
    triangulatedCompetencies: getTriangulatedCompetencies(hypotheses),
    mobilizationInsights
  };
}
