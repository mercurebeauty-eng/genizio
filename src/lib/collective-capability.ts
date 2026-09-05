import type { ObservationEvidence } from "./dynamic-capability";

export type TeamRole =
  | "conception"
  | "programmation"
  | "fabrication"
  | "coordination"
  | "communication"
  | "mediation"
  | "recherche";

export type ImplicationLevel = "pilier" | "contributeur_actif" | "apprenti" | "observateur";

export type ParticipationStatus =
  | "invited"
  | "registered"
  | "present_passive"
  | "active_participant"
  | "absent"
  | "declined";

export interface EnvironmentalConditions {
  groupSize: number;
  roleClarity: "explicit_structured" | "open_autonomous";
  peerFamiliarity: "peers_familiar" | "peers_mixed" | "peers_new";
  timePressure: "relaxed" | "paced" | "hackathon_tight";
}

export interface SupervisorObservableTag {
  tag: string;
  impact: "positive" | "negative" | "neutral";
  dimension: "autonomie" | "perseverance" | "collaboration" | "technique";
}

export interface CollectiveProjectTrace {
  projectId: string;
  domain: string;
  targetLevelAge: number; // N(P)
  outcomeStatus: "completed" | "partial" | "failed";
  occurredAt: string;
  hasProofImage: boolean;
  environmentalConditions?: EnvironmentalConditions;
}

export interface CollectiveParticipantContribution {
  childId: string;
  role: TeamRole;
  implication: ImplicationLevel;
  participationStatus?: ParticipationStatus; // default: "active_participant"
  supervisorTags: SupervisorObservableTag[];
  environmentalConditions?: EnvironmentalConditions;
  supervisorProvenance?: {
    supervisorId: string;
    contextName: string;
  };
}

/**
 * Coefficient d'implication de rôle (alpha).
 * Détermine la part du niveau du projet qu'un enfant s'approprie selon son implication.
 */
export const IMPLICATION_COEFFICIENTS: Record<ImplicationLevel, number> = {
  pilier: 0.85,
  contributeur_actif: 0.6,
  apprenti: 0.35,
  observateur: 0.15,
};

/**
 * Calcule l'évidence d'observation INDIVIDUELLE générée par une participation à un projet COLLECTIF.
 * N_demontre = N_stable + alpha * (N_P - N_stable) [Si le projet est plus dur que le socle de l'enfant].
 * Si le projet est plus facile que le socle (N_P <= N_stable), l'enfant consolide simplement (N_demontre = N_P).
 * NOTE : Si l'enfant n'est pas un participant actif (ex: absent, refus, ou passif complet), alpha = 0.
 */
export function computeParticipantEvidence(
  project: CollectiveProjectTrace,
  contribution: CollectiveParticipantContribution,
  childStableLevelAge: number,
): ObservationEvidence {
  const status = contribution.participationStatus || "active_participant";
  const isActive = status === "active_participant";

  const alpha = isActive ? IMPLICATION_COEFFICIENTS[contribution.implication] : 0;

  // Calcul du niveau démontré
  let demonstratedLevelAge = childStableLevelAge;
  if (isActive) {
    if (project.targetLevelAge > childStableLevelAge) {
      demonstratedLevelAge =
        childStableLevelAge + alpha * (project.targetLevelAge - childStableLevelAge);
    } else {
      // S'il participe activement à un projet inférieur ou égal à son niveau, il démontre au moins le niveau du projet.
      demonstratedLevelAge = project.targetLevelAge;
    }
  }

  // Évaluation des micro-observables du superviseur
  let autonomyWeight = 0.5; // base
  let perseveranceWeight = 0.5;
  let collabScore = 0.5;

  for (const t of contribution.supervisorTags) {
    const shift = t.impact === "positive" ? 0.2 : t.impact === "negative" ? -0.2 : 0;
    if (t.dimension === "autonomie")
      autonomyWeight = Math.min(1.0, Math.max(0.0, autonomyWeight + shift));
    if (t.dimension === "perseverance")
      perseveranceWeight = Math.min(1.0, Math.max(0.0, perseveranceWeight + shift));
    if (t.dimension === "collaboration")
      collabScore = Math.min(1.0, Math.max(0.0, collabScore + shift));
  }

  // Le rôle de "pilier" booste l'autonomie s'il n'y a pas de tags contraires
  if (contribution.implication === "pilier" && autonomyWeight === 0.5) {
    autonomyWeight = 0.8;
  }

  return {
    source: "collective_project" as any,
    domain: project.domain,
    demonstratedLevelAge: Number(demonstratedLevelAge.toFixed(2)),
    autonomyWeight: Number(autonomyWeight.toFixed(2)),
    perseveranceWeight: Number(perseveranceWeight.toFixed(2)),
    // La qualité métacognitive & relationnelle est propulsée par le score de collaboration
    metacognitiveWeight: Number(collabScore.toFixed(2)),
    proofWeight: project.hasProofImage ? 1.0 : 0.7,
    outcomeStatus:
      project.outcomeStatus === "completed"
        ? "functional"
        : project.outcomeStatus === "failed"
          ? "failed"
          : "partial",
    occurredAt: project.occurredAt,
  };
}

/**
 * Évalue la synergie et la complémentarité d'une équipe.
 * Basé sur la diversité des rôles assumés par les participants.
 */
export function evaluateTeamSynergy(contributions: CollectiveParticipantContribution[]): number {
  if (contributions.length <= 1) return 1.0;

  const roleCounts = new Map<TeamRole, number>();
  for (const c of contributions) {
    roleCounts.set(c.role, (roleCounts.get(c.role) || 0) + 1);
  }

  // Index de Shannon pour la diversité des rôles
  let entropy = 0;
  const total = contributions.length;
  for (const count of roleCounts.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  // Entropie maximale pour 'total' participants = Math.log2(total) (si total <= nombre max de rôles)
  // Ou Math.log2(min(total, nombre max de rôles))
  const maxPossibleRoles = 7;
  const maxEntropy = Math.log2(Math.min(total, maxPossibleRoles));

  const synergyScore = maxEntropy === 0 ? 1.0 : entropy / maxEntropy;

  return Number(synergyScore.toFixed(2));
}

/**
 * Mesure la plasticité cognitive d'un enfant : sa capacité à endosser différents rôles au fil des projets.
 * Plus il s'enferme dans un seul rôle, plus l'indice approche 0. Plus il varie, plus il approche 1.
 */
export function computeRolePlasticity(pastRoles: TeamRole[]): number {
  if (pastRoles.length <= 1) return 0.5; // Pas assez de données, score neutre

  const roleCounts = new Map<TeamRole, number>();
  for (const r of pastRoles) {
    roleCounts.set(r, (roleCounts.get(r) || 0) + 1);
  }

  // Calcul basique d'entropie normalisée (Shannon)
  let entropy = 0;
  const total = pastRoles.length;
  const maxPossibleRoles = 7;

  for (const count of roleCounts.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  // Normalisation sur le maximum théorique
  const maxEntropy = Math.log2(Math.min(total, maxPossibleRoles));
  const plasticity = maxEntropy === 0 ? 0 : entropy / maxEntropy;

  return Number(plasticity.toFixed(2));
}

/**
 * Génère un insight formaté pour Naya lorsqu'un potentiel collectif (Pic ZPD) est détecté mais non confirmé en solo.
 */
export function formatCollectiveInsightForNaya(
  projectDomain: string,
  demonstratedLevelAge: number,
  childStableLevelAge: number,
): string {
  if (demonstratedLevelAge > childStableLevelAge + 0.5) {
    return `L'enfant a récemment démontré un potentiel latent en ${projectDomain} lors d'un projet collectif (niveau exploré : ~${Math.round(demonstratedLevelAge)} ans). Propose un défi individuel abordable mais stimulant pour vérifier s'il a internalisé ces concepts de manière autonome, afin de consolider son socle actuellement estimé à ${Math.round(childStableLevelAge)} ans.`;
  }
  return "";
}
