import type { ParticipationStatus, EnvironmentalConditions } from "./collective-capability";

export type MobilizationFactor =
  | "group_size"
  | "role_clarity"
  | "peer_familiarity"
  | "time_pressure";

export interface MobilizationConditionHypothesis {
  factor: MobilizationFactor;
  optimalContext: string;
  observedTendency: string;
  confidence: number; // 0 to 1
  parentInsightText: string;
  mentorActionableTip: string;
  supportingExperiencesCount: number;
}

export interface MobilizationExperienceTrace {
  participationStatus: ParticipationStatus;
  environmentalConditions?: EnvironmentalConditions;
}

/**
 * Analyse les variations d'engagement selon l'environnement pour inférer les conditions
 * optimales de mobilisation du potentiel de l'enfant (sans jugement moral).
 */
export function analyzeMobilizationConditions(
  traces: MobilizationExperienceTrace[],
): MobilizationConditionHypothesis[] {
  const hypotheses: MobilizationConditionHypothesis[] = [];
  const validTraces = traces.filter((t) => t.environmentalConditions !== undefined);

  if (validTraces.length < 2) {
    return hypotheses; // Pas assez de données pour dégager des conditions de mobilisation
  }

  // 1. Facteur : Taille du groupe (Petit groupe <= 4 vs Grand groupe > 4)
  const smallGroupTraces = validTraces.filter((t) => t.environmentalConditions!.groupSize <= 4);
  const largeGroupTraces = validTraces.filter((t) => t.environmentalConditions!.groupSize > 4);

  if (smallGroupTraces.length >= 1 && largeGroupTraces.length >= 1) {
    const smallActiveRate =
      smallGroupTraces.filter((t) => t.participationStatus === "active_participant").length /
      smallGroupTraces.length;
    const largeActiveRate =
      largeGroupTraces.filter((t) => t.participationStatus === "active_participant").length /
      largeGroupTraces.length;

    if (smallActiveRate >= 0.7 && largeActiveRate <= 0.4) {
      hypotheses.push({
        factor: "group_size",
        optimalContext: "Escouades restreintes (2 à 4 enfants)",
        observedTendency:
          "Plein engagement en petit comité, phase d'observation/retrait en grand groupe.",
        confidence: Math.min(0.9, 0.5 + (smallGroupTraces.length + largeGroupTraces.length) * 0.1),
        parentInsightText:
          "Votre enfant s'épanouit et prend de belles initiatives lorsqu'il collabore en petit comité (2 à 4 enfants). Dans les grands groupes, il préfère pour l'instant observer avant de s'engager.",
        mentorActionableTip:
          "Proposer des rôles en binôme ou en petite escouade de 3 maximum avant de l'intégrer à des plénières.",
        supportingExperiencesCount: smallGroupTraces.length + largeGroupTraces.length,
      });
    }
  }

  // 2. Facteur : Clarté du Rôle (Structuré vs Autonome)
  const structuredTraces = validTraces.filter(
    (t) => t.environmentalConditions!.roleClarity === "explicit_structured",
  );
  const openTraces = validTraces.filter(
    (t) => t.environmentalConditions!.roleClarity === "open_autonomous",
  );

  if (structuredTraces.length >= 1 && openTraces.length >= 1) {
    const structActiveRate =
      structuredTraces.filter((t) => t.participationStatus === "active_participant").length /
      structuredTraces.length;
    const openActiveRate =
      openTraces.filter((t) => t.participationStatus === "active_participant").length /
      openTraces.length;

    if (structActiveRate >= 0.7 && openActiveRate <= 0.4) {
      hypotheses.push({
        factor: "role_clarity",
        optimalContext: "Missions aux responsabilités explicites et délimitées",
        observedTendency: "Déclenchement immédiat de l'action dès que le périmètre est clair.",
        confidence: Math.min(0.9, 0.5 + (structuredTraces.length + openTraces.length) * 0.1),
        parentInsightText:
          "L'implication de votre enfant est maximale lorsque les attentes et son rôle sont clairement définis dès le départ, ce qui lui offre un cadre sécurisant pour exprimer ses compétences.",
        mentorActionableTip:
          "Prendre 1 minute au démarrage pour lui confier un livrable très précis plutôt qu'une consigne ouverte.",
        supportingExperiencesCount: structuredTraces.length + openTraces.length,
      });
    }
  }

  // 3. Facteur : Familiarité des Pairs (Amis vs Inconnus)
  const familiarTraces = validTraces.filter(
    (t) => t.environmentalConditions!.peerFamiliarity === "peers_familiar",
  );
  const newPeerTraces = validTraces.filter(
    (t) => t.environmentalConditions!.peerFamiliarity === "peers_new",
  );

  if (familiarTraces.length >= 1 && newPeerTraces.length >= 1) {
    const famActiveRate =
      familiarTraces.filter((t) => t.participationStatus === "active_participant").length /
      familiarTraces.length;
    const newActiveRate =
      newPeerTraces.filter((t) => t.participationStatus === "active_participant").length /
      newPeerTraces.length;

    if (famActiveRate >= 0.7 && newActiveRate <= 0.4) {
      hypotheses.push({
        factor: "peer_familiarity",
        optimalContext: "Environnement relationnel de confiance (pairs familiers / guilde)",
        observedTendency: "Prend le leadership plus facilement avec des coéquipiers connus.",
        confidence: Math.min(0.9, 0.5 + (familiarTraces.length + newPeerTraces.length) * 0.1),
        parentInsightText:
          "La sécurité relationnelle est un moteur clé : avec des amis ou des membres familiers de sa Guilde, il libère immédiatement sa spontanéité et son leadership.",
        mentorActionableTip:
          "L'associer à un coéquipier familier lorsqu'on l'invite à collaborer avec de nouveaux participants.",
        supportingExperiencesCount: familiarTraces.length + newPeerTraces.length,
      });
    }
  }

  return hypotheses;
}
