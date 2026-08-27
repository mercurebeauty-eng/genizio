import { VALID_TALENT_KEYS, TALENT_KEY_LABELS } from "./talent-buckets";
import { GUILDS } from "./guilds";

export interface TeamMemberProfile {
  id: string;
  name: string;
  talents: Record<string, number>;
  primaryTalentKey: string; // ex: 'logico_mathematique'
  diagnosticIntent?: string; // e.g., "Tester sa capacité à coordonner le groupe"
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
