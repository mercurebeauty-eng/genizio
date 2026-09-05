// Clubs Périscolaires du Samedi — moteur pur (Phase 3).
//
// Complète mentor-safeguards.ts (qui reste la source des constantes économiques :
// prix, split 70/30, quotas 6–8 enfants/escouade, max 2 escouades) :
//   • catalogue des ateliers matériels du jour (zéro écran par construction),
//   • rotation déterministe anti-répétition des ateliers,
//   • distribution équitable des rôles naturels de l'escouade,
//   • feuille de route chronométrée de l'atelier,
//   • quorum de validation d'une séance,
//   • quote-part mentor proratisée aux présents,
//   • arbitrage de fraude d'une séance (empreinte + vision + présence).

import {
  MENTOR_CATEGORY_QUOTAS,
  SATURDAY_CLUB_CHILD_PRICE_XOF,
  SATURDAY_CLUB_SPLIT,
  type MentorCategory,
  type MentorSafeguardStanding,
} from "@/lib/mentor-safeguards";

// ── Ateliers matériels ──────────────────────────────────────────────────────

export type AtelierKey = "fablab" | "enquete" | "sciences" | "robotique_papier";

export interface AtelierDefinition {
  key: AtelierKey;
  label: string;
  /** Matériaux simples du quotidien local. */
  materials: string[];
  /** Gabarit de brief énoncé au mentor (variables interpolées). */
  briefTemplate: string;
  /** Ce que Naya Vision doit voir sur la photo de preuve. */
  visionExpectation: string;
}

export const SATURDAY_ATELIERS: Record<AtelierKey, AtelierDefinition> = {
  fablab: {
    key: "fablab",
    label: "🛠️ FabLab — Fabrique fonctionnelle",
    materials: ["carton", "ficelle", "pailles", "bouchons", "scotch", "ciseaux"],
    briefTemplate:
      "Construis un objet qui RÉSOUT un vrai problème du quartier (ex : pont qui tient 3 livres, lance-piège à mouches, distributeur de craie). La machine doit fonctionner devant le mentor, pas faire joli.",
    visionExpectation:
      "une construction physique en carton/pailles/ficelle visible en entier, assemblée (pas un dessin ni une feuille plate)",
  },
  enquete: {
    key: "enquete",
    label: "🕵️ Enquête — Autopsie du quartier",
    materials: ["cahier", "crayon", "double-décimètre", "sac de collecte"],
    briefTemplate:
      "Mène une vraie enquête de terrain : mesure, compte, compare (ex : combien d'arbres par rue, quelle pente du marché, où disparaît l'eau de pluie). Produis une planche d'enquête avec chiffres ET preuves collectées.",
    visionExpectation:
      "une planche d'enquête manuscrite avec tableaux/chiffres ET des échantillons ou objets collectés posés à côté",
  },
  sciences: {
    key: "sciences",
    label: "🔬 Sciences — Laboratoire du quotidien",
    materials: ["bouteilles", "eau", "sel", "huile", "chandelle", "miroir"],
    briefTemplate:
      "Réponds à une question testable par une expérience réelle (ex : que flotte et pourquoi, quel sel fait fondre la glace le plus vite, comment dévier la lumière). L'expérience doit être montée et démontrable.",
    visionExpectation:
      "un dispositif expérimental monté (bouteilles, liquides, supports) avec traces de manipulation réelle",
  },
  robotique_papier: {
    key: "robotique_papier",
    label: "🤖 Robotique papier — Mécanismes animés",
    materials: ["papier cartonné", "attaches parisiennes", "ficelle", "bouchons", "colle"],
    briefTemplate:
      "Construis un mécanisme qui BOUGE réellement (levier, engrenage papier, poulie, piston à air) déclenché par une manivelle ou une tirette. Le mouvement doit fonctionner à la main.",
    visionExpectation:
      "un mécanisme en papier/carton avec leviers ou engrenages visibles, en position animée",
  },
};

export const ATELIER_KEYS = Object.keys(SATURDAY_ATELIERS) as AtelierKey[];

/**
 * Atelier du jour : rotation déterministe anti-répétition. Le même atelier ne
 * revient pas deux samedis de suite pour une escouade — seed = escouade + date.
 */
export function getAtelierForDate(squadId: string, occurredAt: string, lastAtelierKey?: AtelierKey | null): AtelierKey {
  const weekNumber = weekKey(occurredAt);
  const seed = hashString(`${squadId}:${weekNumber}`);
  let idx = seed % ATELIER_KEYS.length;
  if (lastAtelierKey && ATELIER_KEYS[idx] === lastAtelierKey) {
    idx = (idx + 1) % ATELIER_KEYS.length;
  }
  return ATELIER_KEYS[idx];
}

/** Numéro de semaine ISO simplifié (année*100 + semaine approximative par jours/7). */
function weekKey(dateIso: string): number {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const week = Math.floor((d.getTime() - start) / (7 * 24 * 3600 * 1000));
  return year * 100 + week;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Rôles naturels (rotation équitable) ─────────────────────────────────────

export type SquadNaturalRole = "ideateur" | "batisseur" | "capitaine" | "mediateur";

export const SQUAD_ROLE_LABEL: Record<SquadNaturalRole, string> = {
  ideateur: "💡 Idéateur",
  batisseur: "🧱 Bâtisseur",
  capitaine: "🧭 Capitaine",
  mediateur: "🕊️ Médiateur",
};

/**
 * Assigne les 4 rôles naturels en rotation hebdomadaire réelle : l'affectation
 * est OPTIMALE (parcours exhaustif des permutations — 24 max) minimisant le
 * nombre de répétitions de rôles déjà exercés. Un Capitaine sortant ne peut pas
 * redevenir Capitaine quand une alternative existe, quel que soit son ordre de
 * passage. Tie-break déterministe (hash enfant×rôle).
 */
export function assignNaturalRoles(
  childIds: string[],
  weekSeed: string,
  pastRolesByChild: Record<string, SquadNaturalRole[]> = {},
): Record<string, SquadNaturalRole> {
  const roles: SquadNaturalRole[] = ["capitaine", "ideateur", "batisseur", "mediateur"];
  // Tri déterministe (seed + id) pour une attribution stable d'une exécution à l'autre.
  const ordered = [...childIds].sort((a, b) => {
    const ha = hashString(`${weekSeed}:${a}`);
    const hb = hashString(`${weekSeed}:${b}`);
    return ha - hb || (a < b ? -1 : 1);
  });

  const k = Math.min(roles.length, ordered.length);
  const targets = ordered.slice(0, k);
  const assignment: Record<string, SquadNaturalRole> = {};

  let bestPerm: SquadNaturalRole[] | null = null;
  let bestCost = Infinity;
  for (const perm of permutations(roles, k)) {
    let cost = 0;
    for (let i = 0; i < k; i++) {
      const repeats = (pastRolesByChild[targets[i]] ?? []).filter((r) => r === perm[i]).length;
      cost += repeats * 1000; // une répétition domine toujours le tie-break
      // Tie-break dépendant de la SEMAINE : sans historique, l'affectation
      // tourne quand même d'une semaine à l'autre (rotation par défaut).
      cost += hashString(`${weekSeed}:${targets[i]}:${perm[i]}`) % 7;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestPerm = perm;
    }
  }

  if (bestPerm) {
    targets.forEach((id, i) => {
      assignment[id] = bestPerm![i];
    });
  }
  return assignment;
}

/** Toutes les suites ordonnées de k rôles pris dans `items` (sans répétition). */
function permutations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const walk = (current: T[], pool: T[]) => {
    if (current.length === k) {
      out.push([...current]);
      return;
    }
    for (let i = 0; i < pool.length; i++) {
      current.push(pool[i]);
      walk(current, pool.filter((_, j) => j !== i));
      current.pop();
    }
  };
  walk([], items);
  return out;
}

// ── Feuille de route chronométrée ───────────────────────────────────────────

export const WORKSHOP_TIMELINE: Array<{ phase: string; minutes: number; guidance: string }> = [
  { phase: "Échauffement", minutes: 10, guidance: "Rappel du défi de la semaine passée + annonce de l'atelier du jour. Les enfants reformulent l'objectif avec leurs mots." },
  { phase: "Conception", minutes: 40, guidance: "Chaque rôle tient sa place : l'Idéateur propose, le Bâtisseur assemble, le Capitaine répartit, le Médiateur arbitre. Le mentor circule, il ne fait pas à la place." },
  { phase: "Test", minutes: 30, guidance: "L'objet FONCTIONNE-t-il ? Chaque escouade teste, échoue, ajuste. L'échec est noté dans le cahier, il fait partie du travail." },
  { phase: "Restitution orale", minutes: 10, guidance: "Une phrase par enfant : ce que j'ai fabriqué, ce qui a marché, ce que je referais autrement." },
];

// ── Quorum & payout ─────────────────────────────────────────────────────────

/**
 * Quorum de validation : le nombre de présents doit respecter les bornes
 * d'escouade de la catégorie (support : 6 à 8 présents requis).
 */
export function checkSquadQuorum(params: {
  category: MentorCategory;
  presentCount: number;
}): { ok: boolean; reason?: string } {
  const quota = MENTOR_CATEGORY_QUOTAS[params.category];
  if (params.presentCount < quota.minChildrenPerSquad) {
    return {
      ok: false,
      reason: `Quorum non atteint : ${params.presentCount} présent(s), minimum ${quota.minChildrenPerSquad} pour valider une séance.`,
    };
  }
  if (params.presentCount > quota.maxChildrenPerSquad) {
    return {
      ok: false,
      reason: `Effectif anormal : ${params.presentCount} présents au-delà du maximum de ${quota.maxChildrenPerSquad} par escouade.`,
    };
  }
  return { ok: true };
}

/**
 * Quote-part mentor de la séance : 70 % du prix mensuel proratisé aux enfants
 * présents, plancher = quorum de l'escouade (une séance non valide ne paie pas).
 * Le standing du mentor module le déblocage (probation/suspension → gel).
 */
export function computeSessionPayoutXof(params: {
  presentCount: number;
  category: MentorCategory;
  standing: MentorSafeguardStanding;
}): { amountXof: number; payable: boolean; reason?: string } {
  const quota = MENTOR_CATEGORY_QUOTAS[params.category];
  const billableCount = Math.min(
    Math.max(params.presentCount, 0),
    quota.maxChildrenPerSquad,
  );
  const grossXof = billableCount * SATURDAY_CLUB_CHILD_PRICE_XOF;
  const amountXof = Math.round(grossXof * SATURDAY_CLUB_SPLIT.mentorShare);

  const payable = params.standing !== "banned" && params.standing !== "frozen_suspended";
  return {
    amountXof: payable ? amountXof : 0,
    payable,
    reason: payable ? undefined : `Payout gelé (statut mentor : ${params.standing}).`,
  };
}

// ── Arbitrage de fraude d'une séance ────────────────────────────────────────

export interface SessionFraudContext {
  /** Distance de Hamming vs la preuve la plus proche du MÊME mentor (90 j), ou null. */
  hammingSameMentor: number | null;
  /** Distance vs la preuve la plus proche toutes escouades confondues, ou null. */
  hammingGlobal: number | null;
  /** Verdict Naya Vision (présence d'artefact matériel, écran détecté, anomalies). */
  vision: {
    materialArtifactDetected: boolean;
    confidence: number;
    screenContentDetected: boolean;
  } | null;
  presentCount: number;
}

export type SessionFraudDecision = {
  decision: "validate" | "flag" | "reject";
  reasons: string[];
};

/**
 * Décision déterministe d'une séance :
 *  • REJET si capture d'écran détectée (violence au principe zéro écran) ou
 *    artefact matériel absent avec confiance vision élevée, ou doublon CERTAIN
 *    de la preuve du même mentor.
 *  • FLAG (revue humaine) si doublon suspect, confiance vision faible,
 *    ou quorum seulement atteint par excès.
 *  • VALIDATE sinon.
 */
export function evaluateSessionFraud(ctx: SessionFraudContext): SessionFraudDecision {
  const reasons: string[] = [];

  if (ctx.vision?.screenContentDetected) {
    reasons.push("Capture d'écran détectée par Naya Vision : la preuve n'est pas un objet physique (règle zéro écran).");
    return { decision: "reject", reasons };
  }
  if (ctx.hammingSameMentor !== null && ctx.hammingSameMentor <= 4) {
    reasons.push(`Preuve quasi identique à une séance précédente du même mentor (distance ${ctx.hammingSameMentor}/64).`);
    return { decision: "reject", reasons };
  }
  if (ctx.vision && !ctx.vision.materialArtifactDetected && ctx.vision.confidence >= 0.7) {
    reasons.push(`Aucun objet matériel détecté avec une confiance élevée (${Math.round(ctx.vision.confidence * 100)} %).`);
    return { decision: "reject", reasons };
  }

  if (ctx.hammingSameMentor !== null && ctx.hammingSameMentor <= 8) {
    reasons.push(`Preuve proche d'une séance précédente du même mentor (distance ${ctx.hammingSameMentor}/64) — revue requise.`);
  }
  if (ctx.hammingGlobal !== null && ctx.hammingGlobal <= 4 && ctx.hammingSameMentor !== null && ctx.hammingGlobal < ctx.hammingSameMentor) {
    reasons.push(`Preuve proche d'une autre escouade (distance ${ctx.hammingGlobal}/64) — possible réutilisation entre mentors.`);
  }
  if (ctx.vision && (!ctx.vision.materialArtifactDetected || ctx.vision.confidence < 0.5)) {
    reasons.push(`Confiance vision faible ou artefact incertain (${ctx.vision ? Math.round(ctx.vision.confidence * 100) : 0} %) — revue requise.`);
  }

  return reasons.length > 0 ? { decision: "flag", reasons } : { decision: "validate", reasons };
}
