// Challenge Mission Planner — Planificateur déterministe de missions pédagogiques
//
// Principe : Genizio décide en amont de ce qu'il faut travailler ou tester pour
// chaque défi, Naya reçoit un cahier des charges pédagogique net et se concentre
// sur son cœur d'expertise : la conception de l'expérience concrète engageante.

import type { ChildDevelopmentState } from "./context-engine";
import { DOMAINS } from "./challenges.functions";

export type MissionPedagogicalIntent =
  | "child_question_action"   // Répondre par l'expérience à une question posée par l'enfant
  | "collective_peak_solo"   // Valider en autonomie solo un pic réussi en groupe
  | "hypothesis_verification" // Vérifier une hypothèse d'aspiration ou d'apprentissage
  | "zpd_progression"         // Pousser la difficulté d'un cran (ZPD N+1)
  | "cross_domain_bridge"     // Utiliser un atout pour stimuler un talent moins exploré
  | "open_exploration";       // Exploration équilibrée d'un nouveau domaine

export interface ChallengeMission {
  missionIndex: number;
  intent: MissionPedagogicalIntent;
  targetDomain: string;
  targetTalents: string[];
  difficultyZone: "stable" | "exploration_zpd" | "consolidation";
  pedagogicalBrief: string;
  actionHook?: string;
}

/**
 * Planifie les missions pédagogiques prioritaires pour la prochaine série de défis.
 * Garantit un dosage équilibré : question enfant, consolidation de pic, progression ZPD,
 * vérification d'hypothèse et passerelles transversales.
 */
export function planChallengeMissions(
  state: ChildDevelopmentState,
  count: number = 4,
): ChallengeMission[] {
  const missions: ChallengeMission[] = [];
  const usedDomains = new Set<string>();

  const availableDomains = DOMAINS.filter(
    (d) => !state.capabilities.ignoredOrFatiguedDomains.includes(d),
  );
  const fallbackDomains = availableDomains.length > 0 ? availableDomains : DOMAINS;

  function pickAvailableDomain(preferred?: string): string {
    if (preferred && fallbackDomains.includes(preferred) && !usedDomains.has(preferred)) {
      usedDomains.add(preferred);
      return preferred;
    }
    const candidate =
      fallbackDomains.find((d) => !usedDomains.has(d)) ||
      fallbackDomains[missions.length % fallbackDomains.length];
    usedDomains.add(candidate);
    return candidate;
  }

  // 1. Mission Prioritaire : Question formulée spontanément par l'enfant
  if (state.operationalContext.latestChildQuestion && missions.length < count) {
    const targetDomain = pickAvailableDomain("Sciences");
    missions.push({
      missionIndex: missions.length + 1,
      intent: "child_question_action",
      targetDomain,
      targetTalents: ["logico_mathematique", "creative"],
      difficultyZone: "exploration_zpd",
      pedagogicalBrief: `Répondre par l'expérimentation et l'observation concrète à la question de ${state.identity.name} : « ${state.operationalContext.latestChildQuestion} ». L'enfant doit découvrir la réponse par lui-même en manipulant, jamais par un cours passif.`,
      actionHook: state.operationalContext.latestChildQuestion,
    });
  }

  // 2. Mission : Pic collectif non consolidé (Épreuve d'autonomie en solo)
  const peakTarget = state.capabilities.progressionTargets.find(
    (t) => t.hasUnconsolidatedCollectivePeak,
  );
  if (peakTarget && missions.length < count) {
    const targetDomain = pickAvailableDomain(peakTarget.domain);
    missions.push({
      missionIndex: missions.length + 1,
      intent: "collective_peak_solo",
      targetDomain,
      targetTalents: ["artisanale", "logico_mathematique"],
      difficultyZone: "exploration_zpd",
      pedagogicalBrief: `Un pic de performance a été observé en groupe dans le domaine ${peakTarget.domain} (niveau visé : ${peakTarget.targetLevelAge} ans) : concevoir une mission individuelle pour vérifier son autonomie réelle et ancrer sa confiance en solo.`,
    });
  }

  // 3. Mission : Vérification d'Hypothèse Active (Aspiration métier ou dynamique d'action)
  const pendingHypothesis = state.activeHypotheses.find(
    (h) => h.status === "exploring" || h.status === "untested",
  );
  if (pendingHypothesis && missions.length < count) {
    const targetDomain = pickAvailableDomain(pendingHypothesis.targetDomain);
    const targetTalents = pendingHypothesis.targetTalents?.length
      ? pendingHypothesis.targetTalents
      : ["artisanale", "spatial"];
    missions.push({
      missionIndex: missions.length + 1,
      intent: "hypothesis_verification",
      targetDomain,
      targetTalents,
      difficultyZone: "stable",
      pedagogicalBrief: `Mettre ${state.identity.name} en situation pour éprouver l'hypothèse : « ${pendingHypothesis.statement} ». Observer sa persévérance et son affinité réelle sur le terrain.`,
    });
  }

  // 4. Mission : Progression ZPD (Zone Proximale de Développement)
  const zpdTarget = state.capabilities.progressionTargets.find(
    (t) => t.targetLevelAge > t.lastLevelAge && !usedDomains.has(t.domain),
  );
  if (zpdTarget && missions.length < count) {
    const targetDomain = pickAvailableDomain(zpdTarget.domain);
    missions.push({
      missionIndex: missions.length + 1,
      intent: "zpd_progression",
      targetDomain,
      targetTalents: ["logico_mathematique", "artisanale"],
      difficultyZone: "exploration_zpd",
      pedagogicalBrief: `Franchir un palier de progression en ${zpdTarget.domain} vers le niveau ${zpdTarget.targetLevelAge} ans. Relier la notion abstraite à un système concret et décomposer les étapes pour préserver la confiance.`,
    });
  }

  // 5. Mission : Passerelle Transversale vers un talent moins exploré
  if (state.capabilities.leastExploredTalents.length > 0 && missions.length < count) {
    const leastExplored = state.capabilities.leastExploredTalents[0];
    const targetDomain = pickAvailableDomain();
    missions.push({
      missionIndex: missions.length + 1,
      intent: "cross_domain_bridge",
      targetDomain,
      targetTalents: ["creative", "spatial"],
      difficultyZone: "consolidation",
      pedagogicalBrief: `Stimuler le talent moins exploré « ${leastExplored} » en utilisant les modes d'action naturels de l'enfant comme tremplin bienveillant.`,
    });
  }

  // 6. Remplissage si nécessaire pour atteindre `count`
  while (missions.length < count) {
    const targetDomain = pickAvailableDomain();
    missions.push({
      missionIndex: missions.length + 1,
      intent: "open_exploration",
      targetDomain,
      targetTalents: ["creative", "artisanale"],
      difficultyZone: "stable",
      pedagogicalBrief: `Découverte et réalisation concrète dans le domaine ${targetDomain}, adaptée à l'âge et aux réalités locales.`,
    });
  }

  return missions;
}

export interface PlanSingleMissionOptions {
  forcedDomain?: string | null;
  homeMaterials?: string | null;
}

/**
 * Planifie une mission unique sur-mesure (ex: « Composer un défi ciblé » dans le Lab).
 * Respecte scrupuleusement le domaine forcé par le parent s'il est spécifié,
 * tout en injectant le bon mandat pédagogique (pic à consolider, hypothèse active, ou ZPD).
 */
export function planSingleChallengeMission(
  state: ChildDevelopmentState,
  options?: PlanSingleMissionOptions,
): ChallengeMission {
  const forcedDomain =
    options?.forcedDomain && options.forcedDomain !== "all"
      ? options.forcedDomain
      : null;

  let mission: ChallengeMission;

  if (forcedDomain) {
    // 1. Vérifier si un pic collectif existe sur ce domaine
    const peakTarget = state.capabilities.progressionTargets.find(
      (t) => t.domain === forcedDomain && t.hasUnconsolidatedCollectivePeak,
    );
    if (peakTarget) {
      mission = {
        missionIndex: 1,
        intent: "collective_peak_solo",
        targetDomain: forcedDomain,
        targetTalents: ["artisanale", "logico_mathematique"],
        difficultyZone: "exploration_zpd",
        pedagogicalBrief: `Un pic de performance a été observé en groupe dans le domaine ${forcedDomain} (niveau visé : ${peakTarget.targetLevelAge} ans) : concevoir une mission individuelle ciblée pour vérifier son autonomie réelle sans le groupe.`,
      };
    } else {
      // 2. Vérifier si une hypothèse active existe sur ce domaine
      const activeHyp = state.activeHypotheses.find(
        (h) =>
          h.targetDomain === forcedDomain &&
          (h.status === "exploring" || h.status === "untested"),
      );
      if (activeHyp) {
        mission = {
          missionIndex: 1,
          intent: "hypothesis_verification",
          targetDomain: forcedDomain,
          targetTalents: activeHyp.targetTalents?.length
            ? activeHyp.targetTalents
            : ["artisanale", "spatial"],
          difficultyZone: "stable",
          pedagogicalBrief: `Mettre ${state.identity.name} en situation dans le domaine ${forcedDomain} pour éprouver l'hypothèse : « ${activeHyp.statement} ».`,
        };
      } else {
        // 3. Vérifier si une progression ZPD existe sur ce domaine
        const zpdTarget = state.capabilities.progressionTargets.find(
          (t) => t.domain === forcedDomain && t.targetLevelAge > t.lastLevelAge,
        );
        if (zpdTarget) {
          mission = {
            missionIndex: 1,
            intent: "zpd_progression",
            targetDomain: forcedDomain,
            targetTalents: ["logico_mathematique", "artisanale"],
            difficultyZone: "exploration_zpd",
            pedagogicalBrief: `Franchir un palier de progression en ${forcedDomain} vers le niveau ${zpdTarget.targetLevelAge} ans. Relier la notion abstraite à une réalisation concrète.`,
          };
        } else {
          // 4. Exploration ciblée dans ce domaine
          mission = {
            missionIndex: 1,
            intent: "open_exploration",
            targetDomain: forcedDomain,
            targetTalents: ["creative", "artisanale"],
            difficultyZone: "stable",
            pedagogicalBrief: `Découverte pratique et réalisation concrète sur-mesure dans le domaine ciblé : ${forcedDomain}.`,
          };
        }
      }
    }
  } else {
    // Si aucun domaine forcé (ou "all"), on utilise la priorité globale du planificateur
    mission = planChallengeMissions(state, 1)[0];
  }

  // Enrichir avec les matériaux maison spécifiés par le parent si présents
  if (options?.homeMaterials?.trim()) {
    mission.pedagogicalBrief += ` Conçu spécialement pour utiliser en priorité les matériaux mentionnés : « ${options.homeMaterials.trim()} ».`;
    mission.actionHook = options.homeMaterials.trim();
  }

  return mission;
}

