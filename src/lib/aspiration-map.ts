// Ponts d'aspiration — vocabulaire curé reliant une aspiration déclarée aux
// compétences fondamentales qu'elle exige réellement (analyse « Évolution de
// Génizio » §11-12, §33-34 — chantier Naya V4, 2026-08-12).
//
// Le principe (analyse §11) : un enfant qui dit « je veux devenir menuisier » ne
// reçoit pas frontalement des mathématiques — il reçoit des défis scénarisés dans
// l'univers de la menuiserie qui, au passage, sollicitent mesurer, compter,
// comprendre les proportions, suivre une séquence... La motivation naît de la
// finalité : « si je veux réellement faire ce métier, certaines compétences sont
// nécessaires ».
//
// worldAnchor : ancrage dans le monde réel de l'enfant vulnérable (analyse §14-15) —
// « entre dans son monde (argent, marché, débrouillardise, autonomie) avant de lui
// demander d'entrer dans le nôtre ».

export interface AspirationBridge {
  /** Clés Gardner (9 intelligences) ciblées par les défis-ponts. */
  talentKeys: string[];
  /** Domaines de défis (DOMAINS de challenges.functions.ts) les plus proches de l'univers. */
  domains: string[];
  /** Compétences concrètes que l'univers exige (pour le prompt et l'UI qualitative). */
  skillsHint: string[];
  /** Comment ancrer le pont dans le monde réel de l'enfant (analyse §14-15). */
  worldAnchor: string;
}

// Mapping curé des suggestions d'aspiration (ASPIRATION_SUGGESTIONS de
// profile-context.ts). Les labels libres hors mapping retombent sur le pont
// générique (findAspirationBridge) — le système ne casse jamais.
export const ASPIRATION_BRIDGES: Record<string, AspirationBridge> = {
  menuiserie: {
    talentKeys: ["artisanale", "spatial", "logico_mathematique"],
    domains: ["Artisanat", "Architecture"],
    skillsHint: ["mesurer", "compter", "comprendre les proportions", "visualiser l'espace", "suivre une séquence", "être précis"],
    worldAnchor: "Commence par un objet utile et réparable du quotidien (tabouret, étagère, jouet cassé) — l'enfant doit voir l'utilité immédiate du résultat avant tout savoir.",
  },
  mecanique: {
    talentKeys: ["spatial", "logico_mathematique", "artisanale"],
    domains: ["Sciences", "Tech & IA"],
    skillsHint: ["démonter et remonter", "diagnostiquer une panne", "cause et effet", "précision", "outils"],
    worldAnchor: "Ancre dans le débrouillage du quotidien (vélo, mobylette, appareil cassé) et le lien avec l'argent : réparer vaut, comprendre vaut mieux.",
  },
  medecine: {
    talentKeys: ["logico_mathematique", "linguistique", "emotionnelle"],
    domains: ["Sciences", "Communication"],
    skillsHint: ["observer les signes", "mémoire", "vocabulaire précis", "prendre soin"],
    worldAnchor: "Ancre dans la santé du quartier : soigner les proches, comprendre ce qui rend malade, le rôle de la prévention dans un contexte où l'accès aux soins est limité.",
  },
  agriculture: {
    talentKeys: ["logico_mathematique", "artisanale", "sociale"],
    domains: ["Agriculture", "Sciences"],
    skillsHint: ["observer le vivant", "mesurer les quantités", "prévoir les saisons", "patience", "expérimenter"],
    worldAnchor: "Ancre dans la terre et le marché : ce qui pousse nourrit et se vend — relier le cycle des cultures à la survie économique familiale.",
  },
  commerce: {
    talentKeys: ["entrepreneuriale", "logico_mathematique", "linguistique"],
    domains: ["Entrepreneuriat", "Communication"],
    skillsHint: ["calculer", "négocier", "tenir un compte", "convaincre", "gérer une petite caisse"],
    worldAnchor: "L'argent est déjà son terrain : partir de la vente réelle (petite caisse, marché) et transformer la débrouillardise existante en rigueur de gestion.",
  },
  art: {
    talentKeys: ["creative", "spatial", "emotionnelle"],
    domains: ["Arts", "Communication"],
    skillsHint: ["observer", "composer", "traduire une émotion", "persévérer sur un détail"],
    worldAnchor: "Partir de ce qu'il sait déjà dessiner/représenter et montrer que l'art peut être un métier et une voix — pas un loisir réservé.",
  },
  sport: {
    talentKeys: ["corporelle", "logico_mathematique", "emotionnelle"],
    domains: ["Sport", "Communication"],
    skillsHint: ["régularité", "mesurer la progression", "travailler en équipe", "gérer l'effort"],
    worldAnchor: "Ancrer dans les matchs de rue et la fierté physique : le sport comme discipline de vie qui mène à l'organisation et à la rigueur.",
  },
  informatique: {
    talentKeys: ["logico_mathematique", "spatial", "creative"],
    domains: ["Tech & IA", "Sciences"],
    skillsHint: ["logique", "séquences", "résoudre un problème", "créer un résultat visible"],
    worldAnchor: "Relier à une machine ou un téléphone réellement disponible : ce qu'un code permet de faire concrètement (réparer, organiser, gagner du temps).",
  },
  musique: {
    talentKeys: ["creative", "logico_mathematique", "corporelle"],
    domains: ["Arts", "Communication"],
    skillsHint: ["rythme", "séquences", "comptage", "écoute", "proportions (mesures)"],
    worldAnchor: "La musique est souvent déjà présente dans le quartier : partir des rythmes connus pour révéler les maths cachées (mesures, fractions du temps).",
  },
  couture: {
    talentKeys: ["artisanale", "spatial", "entrepreneuriale"],
    domains: ["Artisanat", "Entrepreneuriat"],
    skillsHint: ["mesurer", "géométrie des coupes", "précision", "suivre un patron", "vendre son travail"],
    worldAnchor: "Ancrer dans le tissu local et le marché : coudre utile puis coudre pour vendre — le geste précis comme source de revenu.",
  },
};

/** Pont générique pour une aspiration libre non mappée — thème = label, compétences = les moins explorées. */
export const GENERIC_ASPIRATION_BRIDGE: AspirationBridge = {
  talentKeys: [],
  domains: [],
  skillsHint: [],
  worldAnchor: "Partir de ce que l'enfant connaît déjà de cet univers (objets, personnes, situations du quartier) et relier chaque compétence à une finalité concrète et utile pour lui.",
};

/** Normalisation de matching : minuscules, sans accents, sans ponctuation. */
export function normalizeAspirationLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trouve le pont d'une aspiration : d'abord la clé canonique exacte, puis une
 * correspondance par tokens (une aspiration libre « menuisier » ou « atelier de
 * menuiserie » retombe sur le pont menuiserie), sinon le pont générique.
 * Ne JETTE jamais : toute aspiration reçoit un pont.
 */
export function findAspirationBridge(label: string): AspirationBridge {
  const normalized = normalizeAspirationLabel(label);
  if (!normalized) return GENERIC_ASPIRATION_BRIDGE;

  const exact = ASPIRATION_BRIDGES[normalized];
  if (exact) return exact;

  const tokens = normalized.split(" ");
  let best: { key: string; score: number } | null = null;
  for (const [key, bridge] of Object.entries(ASPIRATION_BRIDGES)) {
    const keyTokens = key.split(" ");
    const matched = tokens.filter((t) =>
      keyTokens.some(
        (kt) => kt === t || kt.startsWith(t) || t.startsWith(kt) || (t.length >= 5 && kt.startsWith(t.slice(0, 5)))
      )
    ).length;
    if (matched > 0 && (!best || matched > best.score)) {
      best = { key, score: matched };
    }
  }
  if (best && best.score >= 1) {
    return ASPIRATION_BRIDGES[best.key];
  }
  return GENERIC_ASPIRATION_BRIDGE;
}
