import { VALID_TALENT_KEYS, TALENT_KEY_LABELS } from "./talent-buckets";
import { GUILDS } from "./guilds";
import type {
  MobilizationConditionHypothesis,
  MobilizationFactor,
} from "./mobilization-conditions";

export interface TeamMemberProfile {
  id: string;
  name: string;
  talents: Record<string, number>;
  primaryTalentKey: string; // ex: 'logico_mathematique'
  diagnosticIntent?: string; // e.g., "Tester sa capacité à coordonner le groupe"
  naturalDiscoveryRole?: string; // e.g. "Idéateur", "Capitaine", "Bâtisseur", "Médiateur"
}

export interface MobilizationAwareTeamMember extends TeamMemberProfile {
  mobilizationInsights?: MobilizationConditionHypothesis[];
}

export type SquadCompositionStrategy =
  | "synergique"
  | "mentorat_pairs"
  | "exploration"
  | "roles_equilibres";

export interface SquadRoleBalanceReport {
  isBalanced: boolean;
  roleCoverage: {
    hasIdeateur: boolean;
    hasBatisseur: boolean;
    hasCapitaine: boolean;
    hasMediateur: boolean;
  };
  recommendations: string[];
}

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
export function analyzeGuildComplementarity(
  guildKey: string,
  members: Omit<TeamMemberProfile, "primaryTalentKey">[],
): GuildTeamAnalysis {
  const fullMembers: TeamMemberProfile[] = members.map((m) => ({
    ...m,
    primaryTalentKey: getPrimaryTalent(m.talents),
  }));

  const representedTalents = new Set(fullMembers.map((m) => m.primaryTalentKey));
  const allTalents = VALID_TALENT_KEYS;

  const missingTalents = allTalents.filter((t) => !representedTalents.has(t));

  // Synergy Score = ratio of unique primary talents over team size (max 1)
  // Une équipe de 4 avec 4 talents primaires différents = 1.0 (100% synergie)
  // Une équipe de 4 avec 1 seul talent = 0.25 (faible diversité)
  const uniqueTalentsCount = representedTalents.size;
  const synergyScore = members.length > 0 ? Math.min(1, uniqueTalentsCount / members.length) : 0;

  return {
    guildKey,
    members: fullMembers,
    missingTalents,
    synergyScore,
  };
}

/**
 * Génère le prompt pour Naya afin de créer un défi collectif basé sur l'interdépendance positive et l'évaluation diagnostique.
 */
export function buildGuildCollectiveChallengePrompt(analysis: GuildTeamAnalysis): string {
  const guildName = GUILDS[analysis.guildKey as keyof typeof GUILDS]?.name || "Guilde Inconnue";

  const memberDescriptions = analysis.members
    .map((m) => {
      const talentName =
        TALENT_KEY_LABELS[m.primaryTalentKey as keyof typeof TALENT_KEY_LABELS] ||
        m.primaryTalentKey;
      const baseDesc = `- ${m.name} (Atout principal : ${talentName})`;
      if (m.diagnosticIntent) {
        return `${baseDesc}\n  => BUT DIAGNOSTIQUE SECRET (Ne pas le dire à l'enfant) : Le rôle qui lui est attribué doit naturellement provoquer cette situation : "${m.diagnosticIntent}"`;
      }
      return baseDesc;
    })
    .join("\n");

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
  proposedRoleClarity: "explicit_structured" | "open_autonomous",
): EscouadeCompatibilityReport {
  const warnings: EscouadeWarning[] = [];
  const membersWithConflicts = new Set<string>();

  for (const m of members) {
    if (!m.mobilizationInsights) continue;

    for (const insight of m.mobilizationInsights) {
      if (insight.factor === "group_size") {
        if (insight.optimalContext === "small_group" && proposedGroupSize > 4) {
          warnings.push({
            memberId: m.id,
            memberName: m.name,
            factor: "group_size",
            message: " s'épanouit en petit comité : un groupe de  risque de provoquer un retrait.",
          });
          membersWithConflicts.add(m.id);
        }
      }

      if (insight.factor === "role_clarity") {
        if (
          insight.optimalContext === "explicit_structured" &&
          proposedRoleClarity === "open_autonomous"
        ) {
          warnings.push({
            memberId: m.id,
            memberName: m.name,
            factor: "role_clarity",
            message:
              " a besoin d'un rôle explicite structuré pour s'engager pleinement. Un cadre ouvert risque de créer de l'anxiété.",
          });
          membersWithConflicts.add(m.id);
        }
      }
    }
  }

  const membersWithData = members.filter(
    (m) => m.mobilizationInsights && m.mobilizationInsights.length > 0,
  ).length;
  const compatibilityScore =
    membersWithData === 0 ? 1.0 : (membersWithData - membersWithConflicts.size) / membersWithData;

  const recommendations: string[] = [];
  if (compatibilityScore < 1.0) {
    recommendations.push(
      "Ajustez la taille du groupe ou le cadrage des rôles pour maximiser l'engagement de tous.",
    );
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
  strategy: SquadCompositionStrategy,
): TeamMemberProfile[] {
  // Calcule un score pour chaque candidat
  const scoredCandidates = candidates.map((candidate) => {
    let score = 0;

    // 1. Familiarité relationnelle
    const isKnown = knownRelations.includes(candidate.id);
    const requiresFamiliarity = childMobilization.some(
      (m) => m.factor === "peer_familiarity" && m.optimalContext === "peers_familiar",
    );

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
    .map((sc) => sc.candidate);
}

/**
 * Analyse l'équilibre des rôles naturels Découverte au sein d'une escouade
 * Équilibre optimal : Idéateur + Bâtisseur + Capitaine/Organisateur + Médiateur
 */
export function analyzeSquadRoleBalance(members: TeamMemberProfile[]): SquadRoleBalanceReport {
  const roles = members.map((m) => (m.naturalDiscoveryRole || "").toLowerCase());

  const hasIdeateur = roles.some(
    (r) => r.includes("idéateur") || r.includes("createur") || r.includes("créatif"),
  );
  const hasBatisseur = roles.some(
    (r) => r.includes("bâtisseur") || r.includes("praticien") || r.includes("finisseur"),
  );
  const hasCapitaine = roles.some(
    (r) => r.includes("capitaine") || r.includes("moteur") || r.includes("organisateur"),
  );
  const hasMediateur = roles.some(
    (r) => r.includes("médiateur") || r.includes("ciment") || r.includes("soutien"),
  );

  const recommendations: string[] = [];
  if (!hasIdeateur)
    recommendations.push(
      "Ajoutez un profil 'Idéateur' pour stimuler l'imagination et la vision initiale.",
    );
  if (!hasBatisseur)
    recommendations.push(
      "Ajoutez un profil 'Bâtisseur' pour garantir la concrétisation technique du projet.",
    );
  if (!hasCapitaine && members.length >= 3)
    recommendations.push("Désignez un 'Capitaine / Moteur' pour cadencer les étapes du projet.");
  if (!hasMediateur && members.length >= 4)
    recommendations.push(
      "Prévoyez un rôle 'Médiateur' pour harmoniser les échanges et réguler l'énergie du groupe.",
    );

  const isBalanced = (hasIdeateur || members.length < 2) && (hasBatisseur || members.length < 2);

  return {
    isBalanced,
    roleCoverage: {
      hasIdeateur,
      hasBatisseur,
      hasCapitaine,
      hasMediateur,
    },
    recommendations,
  };
}

// ── Générateur d'équipes de Hackathon (Phase 4) ─────────────────────────────

/**
 * Divise un bassin de participants (plusieurs classes/écoles) en équipes
 * HÉTÉROGÈNES et équilibrées pour éviter les « groupes d'élites » :
 *   • snake draft déterministe (seed reproductible pour auditer le tirage),
 *   • chaque équipe reçoit à chaque tour le participant au talent dominant le
 *     plus rare parmi les restants (anti-accumulation d'élites du même canal),
 *   • diversité d'école maximisée quand `schoolByMember` est fourni.
 */
export function buildHackathonTeams(
  members: MobilizationAwareTeamMember[],
  opts: {
    teamSize: number;
    seed?: number;
    schoolByMember?: Record<string, string>;
    teamNames?: string[];
  },
): Array<{ teamName: string; members: TeamMemberProfile[] }> {
  if (opts.teamSize < 2 || opts.teamSize > members.length) {
    throw new Error(`Taille d'équipe invalide : ${opts.teamSize} pour ${members.length} participants.`);
  }

  // Ordre de départ déterministe (mélange de Fisher-Yates seedé) : neutralise
  // l'ordre d'inscription tout en restant reproductible.
  let state = (opts.seed ?? 42) >>> 0;
  const nextRand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const pool = [...members].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const teamCount = Math.floor(members.length / opts.teamSize);
  const teams: MobilizationAwareTeamMember[][] = Array.from({ length: teamCount }, () => []);

  // Rareté du talent dominant dans le bassin : les talents les plus rares
  // passent en premier dans chaque tour → chaque équipe capte de la variété.
  const rarity = new Map<string, number>();
  for (const m of pool) {
    rarity.set(m.primaryTalentKey, (rarity.get(m.primaryTalentKey) ?? 0) + 1);
  }

  const remaining = [...pool];
  for (let round = 0; round < opts.teamSize; round++) {
    // À chaque tour : le participant dont le talent dominant est le plus rare
    // parmi les restants (tie → diversité d'école → ordre du mélange seedé).
    for (let t = 0; t < teamCount && remaining.length > 0; t++) {
      let bestIdx = 0;
      let bestKey = "";
      for (let i = 0; i < remaining.length; i++) {
        const m = remaining[i];
        const school = opts.schoolByMember?.[m.id] ?? "";
        const key = `${rarity.get(m.primaryTalentKey) ?? 0}:${school}:${nextRand()}`;
        if (i === 0 || key > bestKey) {
          bestIdx = i;
          bestKey = key;
        }
      }
      const picked = remaining.splice(bestIdx, 1)[0];
      // Serpent : les tours pairs remplissent en ordre, les impairs en inverse —
      // égalise la force moyenne des équipes au fil des tours.
      const target = round % 2 === 0 ? t : teamCount - 1 - t;
      teams[target].push(picked);
    }
  }

  return teams.map((team, i) => ({
    teamName: opts.teamNames?.[i] ?? `Équipe ${i + 1}`,
    members: team.map(({ id, name, talents, primaryTalentKey, diagnosticIntent, naturalDiscoveryRole }) => ({
      id, name, talents, primaryTalentKey, diagnosticIntent, naturalDiscoveryRole,
    })),
  }));
}
