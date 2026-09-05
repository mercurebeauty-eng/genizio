import { DISCOVERY_DOMAINS, type DiscoveryDomain } from "./discovery.functions";
import { ACADEMIC_DOMAIN_LABELS } from "./challenges.functions";

/**
 * L'état cognitif et dynamique de l'enfant dans un domaine particulier.
 * Inspiré de la Zone Proximale de Développement (ZPD) et modélisé comme un filtre à inertie.
 */
export interface DomainCapabilityState {
  domain: string;
  stableLevelAge: number; // N_stable : Niveau maîtrisé avec haute confiance
  exploratoryLevelAge: number; // N_explore : Plafond ZPD cible (Zone d'étirement)
  peakLevelAge: number; // N_peak : Plus haut niveau observé crédible
  confidence: number; // Confiance de l'estimation [0..1]
  evidenceCount: number; // Nombre total de preuves
  hasUnconsolidatedCollectivePeak?: boolean; // Vrai si le pic d'exploration vient d'un projet de groupe non vérifié en solo
}

export interface ObservationEvidence {
  source: "challenge" | "discovery_trace" | "collective_project";
  domain: string;
  demonstratedLevelAge: number;
  autonomyWeight: number; // 0..1 (ex: seul=1.0, guidé=0.4)
  perseveranceWeight: number; // 0..1 (ex: >=2 essais=1.0, 1 essai=0.7)
  metacognitiveWeight: number; // 0..1 (ex: dialogue de qualité=1.0, basique=0.6)
  proofWeight: number; // 0..1 (ex: photo=1.0, texte seul=0.7)
  outcomeStatus: "completed" | "functional" | "partial" | "blocked" | "failed";
  occurredAt: string; // ISO Date
}

/**
 * Évalue le poids de confiance global d'une preuve d'observation.
 */
export function computeEvidenceWeight(evidence: ObservationEvidence): number {
  if (evidence.outcomeStatus === "failed" || evidence.outcomeStatus === "blocked") {
    // Si la trace est un échec pur, son poids pour justifier un "pic" est 0
    return 0.0;
  }

  // Un "completed" (défi standard) ou "functional" (découverte aboutie) vaut 1, "partial" vaut 0.5.
  const outcomeWeight = evidence.outcomeStatus === "partial" ? 0.5 : 1.0;

  return (
    evidence.autonomyWeight *
    evidence.perseveranceWeight *
    evidence.metacognitiveWeight *
    evidence.proofWeight *
    outcomeWeight
  );
}

export function mapDiscoveryDifficultyToLevelAge(
  difficulty: string | null | undefined,
  childAge: number,
): number {
  switch (difficulty) {
    case "facile":
      return Math.max(2, childAge - 1);
    case "moyen":
      return childAge;
    case "difficile":
      return childAge + 2;
    case "eleve":
      return childAge + 3;
    default:
      return childAge;
  }
}

/**
 * Calcule l'état capacitaire tri-niveaux d'un enfant pour un domaine donné.
 */
export function calibrateDomainCapability(
  childAge: number,
  domain: string,
  evidences: ObservationEvidence[],
  openHypothesisCause?: string | null,
): DomainCapabilityState {
  if (evidences.length === 0) {
    let emptyExplore = childAge;
    if (openHypothesisCause === "READY_FOR_MORE") {
      emptyExplore = childAge + 1;
    } else if (openHypothesisCause) {
      emptyExplore = Math.max(childAge, childAge - 1);
    }
    return {
      domain,
      stableLevelAge: childAge,
      exploratoryLevelAge: emptyExplore,
      peakLevelAge: childAge,
      confidence: 0,
      evidenceCount: 0,
    };
  }

  // 1. Trier par date croissante pour rejouer l'historique
  const sorted = [...evidences].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  // Valeurs initiales
  let stableLevel = childAge;
  let exploreLevel = childAge;
  let peakLevel = childAge;
  let hasUnconsolidatedCollectivePeak = false;

  // Fenêtre glissante pour évaluer la stabilisation
  let consecutiveExploreFailures = 0;
  let consecutiveStableSuccesses = 0;

  for (const ev of sorted) {
    const w = computeEvidenceWeight(ev);
    const isSuccess = ev.outcomeStatus === "completed" || ev.outcomeStatus === "functional";
    const isPartial = ev.outcomeStatus === "partial";

    // -- A. MAJ du Pic et Montée Opportuniste --
    if ((isSuccess || isPartial) && w >= 0.5) {
      // Un signal assez fort
      if (ev.demonstratedLevelAge > peakLevel) {
        peakLevel = ev.demonstratedLevelAge;
      }

      // Si la preuve dépasse la ZPD actuelle, on monte
      if (ev.demonstratedLevelAge >= exploreLevel) {
        // La montée est proportionnelle à la force du signal
        const push = w * (ev.demonstratedLevelAge - stableLevel);
        const newExplore = Math.round(stableLevel + push);

        if (newExplore > exploreLevel) {
          exploreLevel = newExplore;
          // Si cette poussée vient d'un projet collectif, on marque l'alerte
          if (ev.source === "collective_project") {
            hasUnconsolidatedCollectivePeak = true;
          } else {
            hasUnconsolidatedCollectivePeak = false; // Confirmé/remplacé par un solo
          }
        }
        consecutiveExploreFailures = 0; // Réinitialiser le compteur d'échec sur la ZPD
      }
    }

    // -- B. MAJ du Socle (Stable) --
    if (isSuccess && ev.demonstratedLevelAge >= stableLevel) {
      if (w >= 0.7) {
        // Succès fort et autonome
        consecutiveStableSuccesses++;
        if (consecutiveStableSuccesses >= 2 || ev.source === "challenge") {
          // On consolide le socle
          stableLevel = Math.max(stableLevel, ev.demonstratedLevelAge);
          consecutiveStableSuccesses = 0;
          if (stableLevel >= exploreLevel) {
            hasUnconsolidatedCollectivePeak = false; // Consolidé
          }
        }
      }
    } else if (ev.outcomeStatus === "failed" || ev.outcomeStatus === "blocked") {
      // -- C. Échec & Descente avec Inertie --
      if (ev.demonstratedLevelAge >= exploreLevel - 1) {
        consecutiveExploreFailures++;
        if (consecutiveExploreFailures >= 2) {
          // Rétrogradation amortie (0.5 par échec au-delà du premier)
          // On ne descend jamais en dessous du socle stable
          exploreLevel = Math.max(stableLevel, exploreLevel - 0.5);
        }
      }
      consecutiveStableSuccesses = 0;
    }
  }

  // Dernière passe : si un cycle d'hypothèse dit formellement "READY_FOR_MORE"
  // pour ce domaine précis (analyse de l'IA qui détecte de l'ennui), on force
  // une petite ouverture de la ZPD même si les preuves mathématiques manquent.
  if (openHypothesisCause === "READY_FOR_MORE") {
    exploreLevel = Math.max(exploreLevel, stableLevel + 1);
  } else if (openHypothesisCause) {
    // Si autre cause (ex: difficulté, anxiété, désengagement), on rapproche la ZPD du socle
    // pour regagner en confiance sans baisser le socle.
    exploreLevel = Math.max(stableLevel, exploreLevel - 1);
  }

  return {
    domain,
    stableLevelAge: stableLevel,
    exploratoryLevelAge: Math.max(stableLevel, Math.round(exploreLevel)), // round to nearest integer for DB/prompts
    peakLevelAge: peakLevel,
    confidence: Math.min(1.0, sorted.length / 5), // Arbitrary scaling for confidence based on evidence volume
    evidenceCount: sorted.length,
    hasUnconsolidatedCollectivePeak,
  };
}

export type ChallengeTargetRole = "consolidation" | "exploration" | "probe_peak";

/**
 * Échantillonne adaptativement le niveau cible pour le prochain défi.
 * RandomRoll doit être entre 0 et 1 (Math.random()).
 */
export function sampleTargetLevelForChallenge(
  capability: DomainCapabilityState,
  randomRoll: number,
): { targetLevelAge: number; targetRole: ChallengeTargetRole } {
  // 70% de consolidation (N_stable ou N_stable + 1)
  if (randomRoll < 0.7) {
    // Si explore et stable sont identiques, on donne le stable.
    const lvl =
      capability.exploratoryLevelAge > capability.stableLevelAge && randomRoll < 0.35
        ? capability.stableLevelAge + 1
        : capability.stableLevelAge;
    return { targetLevelAge: lvl, targetRole: "consolidation" };
  }

  // 25% d'étirement en ZPD (N_explore)
  if (randomRoll < 0.95) {
    return { targetLevelAge: capability.exploratoryLevelAge, targetRole: "exploration" };
  }

  // 5% de sonde sur le pic max (N_peak)
  return { targetLevelAge: capability.peakLevelAge, targetRole: "probe_peak" };
}

/**
 * Mappage inter-domaines : Convertit les domaines "Découverte" (libres) en domaines "Académiques" (Défis).
 */
export function mapDiscoveryToAcademicDomain(discoveryDomain: string): string {
  const mapping: Record<string, string> = {
    logique: "mathematiques",
    maths: "mathematiques",
    sciences: "sciences",
    construction: "artisanale",
    art_creativite: "artisanale",
    expression_orale: "langage",
    langues: "langage",
    programmation: "mathematiques", // ou sciences, mais mathematiques est un proxy fort de logique formelle
    nature_environnement: "sciences",
    autre: "entrepreneuriale",
  };
  return mapping[discoveryDomain] || discoveryDomain;
}

/**
 * Formate l'instruction pédagogique ZPD Tri-Niveaux pour le prompt système de Naya.
 */
export function formatDynamicCapabilityInstruction(capabilities: DomainCapabilityState[]): string {
  if (capabilities.length === 0) {
    return "PROGRESSION MESURÉE : aucun niveau ni capacité observée pour le moment. Calibre les défis sur l'âge chronologique de l'enfant.";
  }

  const lines = capabilities.map((cap) => {
    const label = ACADEMIC_DOMAIN_LABELS[cap.domain] ?? cap.domain;
    if (
      cap.stableLevelAge === cap.exploratoryLevelAge &&
      cap.exploratoryLevelAge === cap.peakLevelAge
    ) {
      return `- ${label} : niveau observé ${cap.stableLevelAge} ans.`;
    }

    let line = `- ${label} : socle de maîtrise à ${cap.stableLevelAge} ans`;
    if (cap.exploratoryLevelAge > cap.stableLevelAge) {
      line += `, mais cible d'exploration (ZPD) ouverte jusqu'à ${cap.exploratoryLevelAge} ans`;
    }
    if (cap.peakLevelAge > cap.exploratoryLevelAge) {
      line += ` (et a même déjà démontré des fulgurances sur des concepts de niveau ${cap.peakLevelAge} ans !).`;
    } else {
      line += ".";
    }

    if (cap.hasUnconsolidatedCollectivePeak) {
      line += `\n  ⚠️ [Pic collectif non consolidé] En ${label}, l'enfant a démontré un potentiel de niveau ${cap.exploratoryLevelAge} lors d'un projet en groupe. Propose un défi solo de niveau ${Math.max(cap.stableLevelAge, cap.exploratoryLevelAge - 1)} pour sonder son autonomie réelle, en utilisant sa mécanique d'action préférée comme levier d'entrée.`;
    }

    return line;
  });

  return `ZONE PROXIMALE DE DÉVELOPPEMENT (Moteur Tri-Niveaux dynamique issu des défis et initiatives libres de l'enfant) :\nPour chaque domaine abordé, Naya ne doit pas se limiter au socle de maîtrise, mais proposer une majorité de défis autour du socle (consolidation), quelques-uns dans la cible d'exploration (étirement cognitif), et très occasionnellement sur le niveau de fulgurance (si existant) pour sonder le potentiel caché.\n\n${lines.join("\n")}`;
}
