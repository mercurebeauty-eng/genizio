import { VALID_TALENT_KEYS, TALENT_KEY_LABELS } from "./talent-buckets";
import { GUILDS } from "./guilds";
import type { MobilizationConditionHypothesis, MobilizationFactor } from "./mobilization-conditions";

export interface TeamMemberProfile {
  id: string;
  name: string;
  talents: Record<string, number>;
  primaryTalentKey: string; // ex: 'logico_mathematique'
  diagnosticIntent?: string; // e.g., "Tester sa capacité à coordonner le groupe"
}

export interface MobilizationAwareTeamMember extends TeamMemberProfile {
  mobilizationInsights?: MobilizationConditionHypothesis[];
}

export type SquadCompositionStrategy = "synergique" | "mentorat_pairs" | "exploration";

export interface EscouadeWarning {
  memberId: string;
  memberName: string;
  factor: MobilizationFactor;
  message: string;
}

export interface EscouadeCompatibilityReport {
  compatibilityScore: number;
  warnings: EscouadeWarning[];
  recommendations: string[];
}

export interface GuildTeamAnalysis {
  guildKey: string;
  members: TeamMemberProfile[];
  missingTalents: string[];
  synergyScore: number; // 0 to 1, how diverse the team is
}

/**
 * Identifie le talent dominant d'un enfant
 */
export function getPrimaryTalent(talents: Record<string, number>): string {
  if (!talents || Object.keys(talents).length === 0) return "naturaliste"; // fallback
  return Object.entries(talents).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Analyse la complémentarité d'une équipe de Guilde
 */
export function analyzeGuildComplementarity(guildKey: string, members: Omit<TeamMemberProfile, "primaryTalentKey">[]): GuildTeamAnalysis {
  const fullMembers: TeamMemberProfile[] = members.map(m => ({
    ...m,
    primaryTalentKey: getPrimaryTalent(m.talents)
  }));

  const representedTalents = new Set(fullMembers.map(m => m.primaryTalentKey));
  const allTalents = VALID_TALENT_KEYS;
  
  const missingTalents = allTalents.filter(t => !representedTalents.has(t));
  
  // Synergy Score = ratio of unique primary talents over team size (max 1)
  // Une équipe de 4 avec 4 talents primaires différents = 1.0 (100% synergie)
  // Une équipe de 4 avec 1 seul talent = 0.25 (faible diversité)
  const uniqueTalentsCount = representedTalents.size;
  const synergyScore = members.length > 0 ? Math.min(1, uniqueTalentsCount / members.length) : 0;

  return {
    guildKey,
    members: fullMembers,
    missingTalents,
    synergyScore
  };
}

/**
 * Génère le prompt pour Naya afin de créer un défi collectif basé sur l'interdépendance positive et l'évaluation diagnostique.
 */
export function buildGuildCollectiveChallengePrompt(analysis: GuildTeamAnalysis): string {
  const guildName = GUILDS[analysis.guildKey as keyof typeof GUILDS]?.name || "Guilde Inconnue";
  
  const memberDescriptions = analysis.members.map(m => {
    const talentName = TALENT_KEY_LABELS[m.primaryTalentKey as keyof typeof TALENT_KEY_LABELS] || m.primaryTalentKey;
    const baseDesc = `- ${m.name} (Atout principal : ${talentName})`;
    if (m.diagnosticIntent) {
      return `${baseDesc}\n  => BUT DIAGNOSTIQUE SECRET (Ne pas le dire à l'enfant) : Le rôle qui lui est attribué doit naturellement provoquer cette situation : "${m.diagnosticIntent}"`;
    }
    return baseDesc;
  }).join("\n");

  return `Tu es Naya, l'intelligence pédagogique de Génizio.
Ton objectif est de concevoir un "Défi de Guilde" exclusif pour l'équipe suivante de la ${guildName} :

Membres de l'équipe :
${memberDescriptions}

CONTRAINTE D'ARCHITECTURE PÉDAGOGIQUE (Interdépendance Positive) :
Tu dois inventer une mission collective où la réussite est IMPOSSIBLE si l'un des membres ne participe pas. 
Le défi doit nécessiter l'application des talents principaux de CHAQUE membre.

Le défi doit être décomposé en rôles précis. Attribue à chaque enfant un rôle fondamental basé sur son "Atout principal".
Si un but diagnostique secret est mentionné pour un enfant, assure-toi que son rôle le force naturellement dans cette situation (sans qu'il ne s'en rende compte comme un test).

FORMAT ATTENDU :
Propose le défi avec un titre inspirant, l'objectif commun, et la mission spécifique de chaque enfant.
Ne fais aucune notation, concentre-toi sur l'action réelle.`;
}
/**
 * Analyse la compatibilité d'une escouade selon les conditions de mobilisation de chaque membre
 */
export function analyzeEscouadeCompatibility(
  members: MobilizationAwareTeamMember[],
  proposedGroupSize: number,
  proposedRoleClarity: "explicit_structured" | "open_autonomous"
): EscouadeCompatibilityReport {
  const warnings: EscouadeWarning[] = [];
  let membersWithConflicts = new Set<string>();

  for (const m of members) {
    if (!m.mobilizationInsights) continue;

    for (const insight of m.mobilizationInsights) {
      if (insight.factor === "group_size") {
        if (insight.optimalContext === "small_group" && proposedGroupSize > 4) {
          warnings.push({
            memberId: m.id,
            memberName: m.name,
            factor: "group_size",
            message: " s'épanouit en petit comité : un groupe de  risque de provoquer un retrait."
          });
          membersWithConflicts.add(m.id);
        }
      }
      
      if (insight.factor === "role_clarity") {
        if (insight.optimalContext === "explicit_structured" && proposedRoleClarity === "open_autonomous") {
          warnings.push({
            memberId: m.id,
            memberName: m.name,
            factor: "role_clarity",
            message: " a besoin d'un rôle explicite structuré pour s'engager pleinement. Un cadre ouvert risque de créer de l'anxiété."
          });
          membersWithConflicts.add(m.id);
        }
      }
    }
  }

  const membersWithData = members.filter(m => m.mobilizationInsights && m.mobilizationInsights.length > 0).length;
  const compatibilityScore = membersWithData === 0 
    ? 1.0 
    : (membersWithData - membersWithConflicts.size) / membersWithData;

  const recommendations: string[] = [];
  if (compatibilityScore < 1.0) {
    recommendations.push("Ajustez la taille du groupe ou le cadrage des rôles pour maximiser l'engagement de tous.");
  }

  return { compatibilityScore, warnings, recommendations };
}

/**
 * Sélectionne et classe les 3 meilleurs candidats pour former une escouade
 */
export function rankSquadCandidates(
  childMobilization: MobilizationConditionHypothesis[],
  candidates: MobilizationAwareTeamMember[],
  knownRelations: string[],
  strategy: SquadCompositionStrategy
): TeamMemberProfile[] {
  // Calcule un score pour chaque candidat
  const scoredCandidates = candidates.map(candidate => {
    let score = 0;
    
    // 1. Familiarité relationnelle
    const isKnown = knownRelations.includes(candidate.id);
    const requiresFamiliarity = childMobilization.some(m => m.factor === "peer_familiarity" && m.optimalContext === "peers_familiar");
    
    if (requiresFamiliarity) {
      score += isKnown ? 0.3 : -0.1;
    } else {
      score += isKnown ? 0.1 : 0;
    }

    // 2. Stratégie spécifique (mock heuristique)
    if (strategy === "synergique") {
      // Priorise la diversité des talents
      score += 0.5;
    } else if (strategy === "mentorat_pairs") {
      // Pourrait prioriser les écarts d'âge ou de niveau (non dispo ici)
      score += 0.2;
    } else if (strategy === "exploration") {
      score += !isKnown ? 0.4 : 0;
    }

    return { candidate, score };
  });

  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(sc => sc.candidate);
}
