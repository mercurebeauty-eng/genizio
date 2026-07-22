import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VALID_TALENT_KEYS, TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { normalizeChildInterests } from "@/lib/interest-migration";
import { z } from "zod";

// Domaines couverts par le référentiel académique (cf. genizio-decisions #39). "creative"
// exclue volontairement (développement non linéaire par âge, cf. ACADEMIC_REFERENTIAL_INSTRUCTION
// ci-dessous) — ne jamais l'ajouter ici sans revoir le mécanisme de détection d'écart.
export const ACADEMIC_DOMAINS = [
  "mathematiques", "langage", "sciences",
  "corporelle", "sociale", "emotionnelle", "entrepreneuriale", "artisanale", "spatiale",
] as const;

const ChallengeSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  steps: z.array(z.string()),
  materials: z.array(z.string()),
  material_tags: z.array(z.string()).optional(),
  pedagogical_context: z.string().nullable().optional(),
  intelligences: z.array(z.string()).optional(),
  requires_supervision: z.boolean().default(false),
  supervision_warning: z.string().nullable().optional(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).optional(),
  proof_mode: z.enum(["photo", "declarative"]).optional(),
  proof_target: z.object({ metric: z.string(), value: z.number() }).nullable().optional(),
  declarative_award: z.record(z.string(), z.number()).nullable().optional(),
  academic_domain: z.enum(ACADEMIC_DOMAINS).nullable().optional(),
  academic_level_age: z.number().nullable().optional(),
  academic_reference_note: z.string().nullable().optional(),
});

// Shop Phase 1: log material tags that don't match any active product yet, so the
// admin sees what Naya is recommending most and can price it. Never breaks the
// caller's real insert if this side-tracking fails.
async function trackMaterialSuggestions(items: { material_tags: string[]; title: string }[]) {
  try {
    const allTags = Array.from(new Set(items.flatMap((i) => i.material_tags))).filter(Boolean);
    if (allTags.length === 0) return;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: activeProducts } = await supabaseAdmin
      .from("products")
      .select("material_tags")
      .eq("is_active", true);
    const covered = new Set((activeProducts ?? []).flatMap((p) => p.material_tags ?? []));

    const uncovered = allTags.filter((t) => !covered.has(t));
    if (uncovered.length === 0) return;

    for (const tag of uncovered) {
      const sample = items.find((i) => i.material_tags.includes(tag))?.title ?? null;
      const { data: existing } = await supabaseAdmin
        .from("material_suggestions")
        .select("id, seen_count")
        .eq("tag", tag)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("material_suggestions")
          .update({
            seen_count: existing.seen_count + 1,
            last_seen_at: new Date().toISOString(),
            sample_challenge_title: sample,
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("material_suggestions").insert({ tag, sample_challenge_title: sample });
      }
    }
  } catch (err) {
    console.error("trackMaterialSuggestions failed (non-fatal):", err);
  }
}

function calculateXPGain(age: number): number {
  // L'XP gagnée diminue à mesure que l'enfant grandit, rendant les niveaux
  // plus exigeants sans toucher au palier mathématique (500) du frontend.
  // ex: 4 ans = 190 XP, 8 ans = 130 XP, 12 ans = 70 XP
  return Math.max(50, 250 - (age * 15));
}
// Le niveau vient de la même formule que le tableau de bord (profiles.index.tsx :
// Math.floor(xp / 500) + 1) — comparer l'avant/après xp permet de détecter un
// passage de niveau au moment même où on l'attribue, sans requête séparée.
function levelForXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

async function awardCompletionXP(supabaseClient: any, childId: string) {
  try {
    const { data: profile } = await supabaseClient
      .from("child_profiles")
      .select("xp, streak, last_activity_date, age")
      .eq("id", childId)
      .single();
    if (!profile) return null;

    const now = new Date();
    let newStreak = profile.streak || 0;
    if (profile.last_activity_date) {
      const lastDate = new Date(profile.last_activity_date);
      const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > 24 && diffHours < 48) newStreak += 1;
      else if (diffHours >= 48) newStreak = 1;
      // if < 24h, streak remains the same (already incremented today)
    } else {
      newStreak = 1;
    }

    const oldXp = profile.xp || 0;
    const childAge = profile.age || 7; // Âge par défaut si non renseigné
    const xpGain = calculateXPGain(childAge);
    const newXp = oldXp + xpGain;

    await supabaseClient
      .from("child_profiles")
      .update({
        xp: newXp,
        streak: newStreak,
        last_activity_date: now.toISOString()
      })
      .eq("id", childId);

    return {
      xpGained: xpGain,
      newXp,
      newStreak,
      newLevel: levelForXp(newXp),
      leveledUp: levelForXp(newXp) > levelForXp(oldXp),
    };
  } catch (err) {
    console.error("awardCompletionXP failed (non-fatal):", err);
    return null;
  }
}

// Système de badges (cf. écran 8 du prototype, genizio-decisions) : un badge
// par domaine de DOMAINS ci-dessus, débloqué au 3e défi complété dans ce
// domaine. Le catalogue (titre/description/seuil) reste ici plutôt qu'en
// base — seule l'attribution réelle par enfant vit dans child_badges. Les
// chemins de génération hors DOMAINS (référentiel académique, gabarits de
// l'Atelier...) peuvent écrire des valeurs de domaine différentes : ces
// défis-là ne comptent simplement pour aucun badge, pas une erreur, juste
// une couverture partielle assumée pour ce premier jet.
const BADGE_THRESHOLD = 3;
// Exporté pour le Passeport d'Excellence (passport-print.tsx), qui affiche les
// badges réellement gagnés par l'enfant (child_badges) avec leur titre/description.
export const BADGE_CATALOG: Record<string, { title: string; description: string }> = {
  Sciences: {
    title: "Scientifique en herbe",
    description: "Tu as mené 3 expériences. Tu observes, tu questionnes, tu comprends le monde qui t'entoure.",
  },
  Architecture: {
    title: "Bâtisseur·se en herbe",
    description: "Tu as terminé 3 défis de construction. Tu penses déjà comme quelqu'un qui bâtit des choses solides.",
  },
  Artisanat: {
    title: "Artisan·e en herbe",
    description: "Tu as fabriqué 3 objets de tes propres mains. Le geste précis devient une seconde nature.",
  },
  Agriculture: {
    title: "Cultivateur·rice en herbe",
    description: "Tu as mené 3 défis liés à la nature et au vivant. Tu sais prendre soin de ce qui pousse.",
  },
  Sport: {
    title: "Athlète en herbe",
    description: "Tu as relevé 3 défis physiques. Ton corps devient un allié de plus en plus sûr.",
  },
  Communication: {
    title: "Orateur·rice en herbe",
    description: "Tu as réussi 3 défis de communication. Tes mots portent de plus en plus loin.",
  },
  Entrepreneuriat: {
    title: "Entrepreneur·se en herbe",
    description: "Tu as mené 3 projets à la manière d'un vrai petit commerce. Tu sais transformer une idée en réalité.",
  },
  Arts: {
    title: "Artiste en herbe",
    description: "Tu as créé 3 œuvres. Ton regard sur le monde devient de plus en plus unique.",
  },
  Langues: {
    title: "Linguiste en herbe",
    description: "Tu as relevé 3 défis de langue et d'écriture. Les mots deviennent un vrai terrain de jeu.",
  },
  "Tech & IA": {
    title: "Ingénieur·e numérique en herbe",
    description: "Tu as relevé 3 défis de logique et de technologie. Tu commences à penser comme la machine — puis mieux qu'elle.",
  },
};

async function checkAndAwardBadge(supabaseClient: any, childId: string, domain: string | null | undefined) {
  try {
    if (!domain) return null;
    const badgeDef = BADGE_CATALOG[domain];
    if (!badgeDef) return null;

    const { data: existing } = await supabaseClient
      .from("child_badges")
      .select("id")
      .eq("child_id", childId)
      .eq("badge_slug", domain)
      .maybeSingle();
    if (existing) return null; // déjà débloqué — pas de re-notification

    const { count } = await supabaseClient
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("child_id", childId)
      .eq("domain", domain)
      .eq("status", "completed");
    if ((count ?? 0) < BADGE_THRESHOLD) return null;

    const { error } = await supabaseClient
      .from("child_badges")
      .insert({ child_id: childId, badge_slug: domain });
    if (error) {
      console.error("checkAndAwardBadge insert failed (non-fatal):", error);
      return null;
    }

    return { slug: domain, title: badgeDef.title, description: badgeDef.description };
  } catch (err) {
    console.error("checkAndAwardBadge failed (non-fatal):", err);
    return null;
  }
}

// LLMs are known to favor items earlier in a list they're asked to choose
// from, independent of actual relevance. DOMAINS is always presented in the
// same order to every generation call for every child — shuffle it per call
// so that position bias doesn't quietly skew which domain gets picked across
// the whole platform. Same principle as the talent tie-break fix: don't let
// a fixed array order stand in for what should be a random/deterministic
// choice.
function shuffle<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

const DOMAINS = [
  "Sciences",
  "Architecture",
  "Artisanat",
  "Agriculture",
  "Sport",
  "Communication",
  "Entrepreneuriat",
  "Arts",
  "Langues",
  "Tech & IA",
];

// V2 (product-intelligence-architect pass): rather than leaving "which
// intelligence needs more exploration" entirely to the model's judgment on
// a raw JSON dump of scores, compute it deterministically and name it in
// the prompt. Cheap, zero hallucination risk, and directly serves the
// product's "reveal hidden talents" pitch instead of only reinforcing
// declared interests.
function getLeastExploredTalentLabels(
  talents: Record<string, number> | null | undefined,
  count = 2
): string[] {
  const raw = talents ?? {};
  return VALID_TALENT_KEYS
    .map((key) => ({ key, score: raw[key] ?? 0 }))
    // Shuffle before the (stable) sort so ties — e.g. a brand-new profile
    // where every score defaults to 0 — don't always resolve to the same
    // two talents in VALID_TALENT_KEYS' declared order.
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(({ key }) => TALENT_KEY_LABELS[key]);
}

// V3: a deterministic safety net behind the model's own risk self-assessment.
// The model can forget to flag a risky activity; this catches it from the
// generated text itself instead of trusting the same single pass that wrote
// it. Age-differentiated on purpose (per product direction): younger
// children always get a direct "adult must be present" instruction, while
// 12+ get concrete precautions to follow rather than a blocking tone — a
// 12-year-old lighting a candle with instructions is normal, not something
// to gate behind mandatory adult presence.
// JS's \b word boundary is ASCII-only (\w never matches accented letters),
// so a plain \b...\b pattern silently fails to match a keyword that starts
// or ends with an accented character (e.g. "électricité", "dénudé") — the
// boundary can never form between two non-\w characters. Build boundaries
// with Unicode-aware lookarounds instead so accented keywords match too.
function wordBoundaryPattern(alternatives: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`, "iu");
}

const SAFETY_KEYWORDS: { pattern: RegExp; note: { under12: string; from12: string } }[] = [
  {
    pattern: wordBoundaryPattern("feu|flamme|briquet|allumettes?|bougie"),
    note: {
      under12: "Cette activité implique du feu : un adulte doit être présent et superviser directement toute la manipulation.",
      from12: "Mesures de sécurité à prendre : utilise le briquet ou les allumettes dans un endroit dégagé, loin de tissus ou de papier, garde de l'eau ou un linge humide à proximité, et éteins bien la flamme après usage. Informe un parent avant de commencer.",
    },
  },
  {
    pattern: wordBoundaryPattern("couteau|cutter|lame|ciseaux pointus"),
    note: {
      under12: "Cette activité implique un objet tranchant : un adulte doit couper ou superviser directement cette étape.",
      from12: "Mesures de sécurité à prendre : coupe toujours en éloignant tes doigts de la lame, travaille sur une surface stable, et range l'outil après usage.",
    },
  },
  {
    pattern: wordBoundaryPattern("produits? chimiques?|eau de javel|acide|soude caustique"),
    note: {
      under12: "Cette activité implique des produits chimiques : un adulte doit manipuler ou superviser directement cette étape.",
      from12: "Mesures de sécurité à prendre : manipule ces produits dans un endroit ventilé, évite tout contact avec les yeux ou la peau, et lave-toi les mains après usage.",
    },
  },
  {
    pattern: wordBoundaryPattern("électricité|prise électrique|courant électrique|fils? dénudés?"),
    note: {
      under12: "Cette activité implique de l'électricité : un adulte doit superviser directement cette étape.",
      from12: "Mesures de sécurité à prendre : ne touche jamais une prise ou un fil dénudé avec les mains mouillées, et débranche l'appareil avant toute manipulation.",
    },
  },
  {
    pattern: wordBoundaryPattern("cuisinière|plaque de cuisson|plaque chauffante|four chaud|eau bouillante|huile chaude|casserole|poêle"),
    note: {
      under12: "Cette activité implique une source de chaleur en cuisine (cuisinière, four, eau ou huile chaude) : un adulte doit être présent et superviser directement toute la manipulation.",
      from12: "Mesures de sécurité à prendre : ne laisse jamais une casserole ou une poêle sans surveillance sur le feu, utilise des maniques pour les ustensiles chauds, éloigne les manches des bords de la plaque, et informe un parent avant de commencer.",
    },
  },
  {
    // "Extérieur non sécurisé" is the one risk category the prompt asks the
    // model to catch with zero deterministic backstop behind it. Nouns only
    // where possible (piscine, toit...) plus stems (grimp\p{L}*, escalad\p{L}*)
    // for the two common verbs, so conjugated forms ("grimpe", "escalade")
    // still match — a plain infinitive-only match would miss most real
    // generated text. Deliberately excludes generic outdoor words (jardin,
    // quartier, dehors) since the app's own principles already push for
    // "réalisable... dans le quartier" — flagging that would be exactly the
    // over-caution this net is designed to avoid.
    pattern: wordBoundaryPattern(
      "piscine|rivière|fleuve|lac|étang|mer|hauteur|toit|échelle|grimp\\p{L}*|escalad\\p{L}*|falaise|circulation|serpent|scorpion|animal sauvage"
    ),
    note: {
      under12: "Cette activité se déroule dans un environnement extérieur avec un risque réel (eau profonde, hauteur, circulation ou animal) : un adulte doit être présent et superviser directement toute la manipulation.",
      from12: "Mesures de sécurité à prendre : reste dans une zone connue de tes parents, ne t'approche jamais seul d'un point d'eau profond, d'une hauteur ou d'une route très fréquentée, et informe un parent avant de commencer.",
    },
  },
];

function applySafetyNet<T extends {
  description: string;
  steps: string[];
  materials: string[];
  requires_supervision?: boolean | null;
  supervision_warning?: string | null;
}>(challenge: T, age: number): { requires_supervision: boolean; supervision_warning: string | null } {
  const haystack = [challenge.description, ...challenge.steps, ...challenge.materials].join(" \n ");
  const matched = SAFETY_KEYWORDS.find((k) => k.pattern.test(haystack));

  if (!matched) {
    return {
      requires_supervision: challenge.requires_supervision ?? false,
      supervision_warning: challenge.supervision_warning ?? null,
    };
  }

  const fallbackNote = age < 12 ? matched.note.under12 : matched.note.from12;
  return {
    requires_supervision: true,
    supervision_warning: challenge.supervision_warning?.trim() || fallbackNote,
  };
}

// The model can (and does) omit "difficulty" despite the prompt asking for
// it; defaulting straight to "moyen" masked that silently. Warn so the gap
// is at least visible in logs instead of inflating the "moyen" bucket with
// no trace of why.
function resolveDifficulty(
  difficulty: string | null | undefined,
  challengeTitle: string
): "facile" | "moyen" | "difficile" {
  if (difficulty === "facile" || difficulty === "moyen" || difficulty === "difficile") {
    return difficulty;
  }
  console.warn(`[challenges] "difficulty" manquant ou invalide pour "${challengeTitle}" — défaut "moyen" appliqué.`);
  return "moyen";
}

// Backstop for "proof_mode: declarative" (défis comptables/chronométrés/live — cf.
// genizio-decisions #35) : même philosophie que applySafetyNet ci-dessus — ne jamais
// faire confiance à la seule auto-discipline du modèle. Un défi ne devient déclaratif
// que si le modèle a AUSSI produit une cible et une récompense cohérentes ; sinon,
// repli silencieux sur "photo" (le mode utilisé par tous les défis avant l'existence
// de celui-ci, donc toujours sûr). Floor à 1 (pas 0 comme validateChallengeProof) :
// ici le modèle propose une récompense à la génération plutôt que de juger une
// soumission réelle — il n'y a aucune raison de "proposer" 0 point pour une clé,
// autant l'omettre.
function resolveProofMode(
  proofMode: string | null | undefined,
  proofTarget: { metric?: unknown; value?: unknown } | null | undefined,
  declarativeAward: Record<string, unknown> | null | undefined,
  challengeTitle: string
): {
  proof_mode: "photo" | "declarative";
  proof_target: { metric: string; value: number } | null;
  declarative_award: Record<string, number> | null;
} {
  if (proofMode !== "declarative") {
    return { proof_mode: "photo", proof_target: null, declarative_award: null };
  }

  const metric = typeof proofTarget?.metric === "string" ? proofTarget.metric.trim().slice(0, 60) : "";
  const value = typeof proofTarget?.value === "number" ? proofTarget.value : NaN;

  const award: Record<string, number> = {};
  const validTalentKeys = new Set(VALID_TALENT_KEYS);
  for (const [key, points] of Object.entries(declarativeAward ?? {})) {
    if (typeof points === "number" && validTalentKeys.has(key)) {
      award[key] = Math.max(1, Math.min(3, Math.round(points)));
    }
  }

  if (!metric || !Number.isFinite(value) || value <= 0 || Object.keys(award).length === 0) {
    console.warn(`[challenges] "proof_mode: declarative" incohérent pour "${challengeTitle}" — repli sur "photo".`);
    return { proof_mode: "photo", proof_target: null, declarative_award: null };
  }

  return { proof_mode: "declarative", proof_target: { metric, value }, declarative_award: award };
}

// Backstop pour l'étiquetage du référentiel académique (cf. genizio-decisions #38) : un âge
// incohérent (hors [3,18], absent, ou domaine invalide) redevient simplement "pas de
// signal" — même philosophie que resolveProofMode, ne jamais faire confiance à la seule
// auto-discipline du modèle. Contrairement à proof_mode, il n'y a pas de "valeur par défaut
// sûre" ici : l'absence de signal (les deux champs à null) est elle-même le repli sûr, un
// défi non académique ou mal étiqueté ne doit simplement pas compter dans la détection d'écart.
function resolveAcademicLevel(
  domain: string | null | undefined,
  levelAge: number | null | undefined,
  referenceNote: string | null | undefined,
  challengeTitle: string
): {
  academic_domain: (typeof ACADEMIC_DOMAINS)[number] | null;
  academic_level_age: number | null;
  academic_reference_note: string | null;
} {
  const validDomain = (ACADEMIC_DOMAINS as readonly string[]).includes(domain ?? "")
    ? (domain as (typeof ACADEMIC_DOMAINS)[number])
    : null;
  const validAge = typeof levelAge === "number" && Number.isFinite(levelAge) && levelAge >= 3 && levelAge <= 18
    ? Math.round(levelAge)
    : null;

  if (!validDomain || validAge === null) {
    if (domain || levelAge) {
      console.warn(`[challenges] étiquetage du référentiel académique incohérent pour "${challengeTitle}" — ignoré.`);
    }
    return { academic_domain: null, academic_level_age: null, academic_reference_note: null };
  }

  // La citation est un bonus de traçabilité (décision #39), pas une condition de validité —
  // un domaine/âge cohérents sans citation restent utilisables pour la détection d'écart.
  const note = typeof referenceNote === "string" && referenceNote.trim() ? referenceNote.trim().slice(0, 200) : null;

  return { academic_domain: validDomain, academic_level_age: validAge, academic_reference_note: note };
}

// Single choke point for the checks every challenge must pass through before
// it reaches a parent or the DB: the safety net, the difficulty fallback,
// title truncation, material_tags normalization. Before this existed, the
// 3 insertion points (bulk insert, single-challenge preview, template
// assignment) each called applySafetyNet/resolveDifficulty separately —
// nothing stopped a future 4th call site (or a reordering refactor) from
// silently skipping one of them. Route every insertion/preview through this
// instead of re-deriving these fields by hand.
// Exported (2026-07-20, NAYA Phase 3b/5 fix): the two new AI-generated-challenge
// insertion points added by Phase 3b (generateDiscriminantChallenge) and Phase 5
// (recommendChallengesForChild) had each re-implemented insertion by hand and
// skipped this choke point entirely — exactly the failure mode this comment
// already warned about. Import this instead of duplicating the checks again.
export function finalizeChallenge<T extends {
  title: string;
  description: string;
  steps: string[];
  materials: string[];
  material_tags?: string[] | null;
  requires_supervision?: boolean | null;
  supervision_warning?: string | null;
  difficulty?: string | null;
  proof_mode?: string | null;
  proof_target?: { metric?: unknown; value?: unknown } | null;
  declarative_award?: Record<string, unknown> | null;
  academic_domain?: string | null;
  academic_level_age?: number | null;
  academic_reference_note?: string | null;
}>(c: T, age: number) {
  const safety = applySafetyNet(c, age);
  const proof = resolveProofMode(c.proof_mode, c.proof_target, c.declarative_award, c.title);
  const academic = resolveAcademicLevel(c.academic_domain, c.academic_level_age, c.academic_reference_note, c.title);
  return {
    title: c.title.slice(0, 120),
    material_tags: c.material_tags ?? [],
    difficulty: resolveDifficulty(c.difficulty, c.title),
    requires_supervision: safety.requires_supervision,
    supervision_warning: safety.supervision_warning,
    proof_mode: proof.proof_mode,
    proof_target: proof.proof_target,
    declarative_award: proof.declarative_award,
    academic_domain: academic.academic_domain,
    academic_level_age: academic.academic_level_age,
    academic_reference_note: academic.academic_reference_note,
  };
}

/**
 * Helper mapping child.interests tags (from INTERESTS_BY_TALENT in src/components/profiles/shared.ts)
 * into rich cognitive posture descriptors and behavioral drivers for AI prompt payloads.
 */
export function formatChildInterestsPayload(interests?: string[] | null): string {
  const normalized = normalizeChildInterests(interests);
  if (normalized.length === 0) {
    return "Aucun levier spécifique renseigné — explorer et expérimenter avec différentes postures d'apprentissage.";
  }

  const tagMap = new Map<string, string>();
  for (const [, talentGroup] of Object.entries(INTERESTS_BY_TALENT)) {
    for (const tag of talentGroup.tags) {
      tagMap.set(tag, talentGroup.label);
    }
  }

  return normalized
    .map((tag) => {
      const label = tagMap.get(tag);
      return label ? `- [${label}] "${tag}"` : `- [Levier d'action] "${tag}"`;
    })
    .join("\n");
}

// Shared constitution injected into every challenge-generation prompt (bulk
// and single). Written dense and numbered on purpose: the text-only calls
// run on Haiku (lightweight model), which needs explicit, unambiguous rules
// rather than loose guidance to reliably avoid generic/unrealistic output.
const GENIZIO_PRINCIPLES = `PRINCIPES DE GÉNÉRATION GÉNIZIO (règles strictes, à respecter impérativement) :
- CONCRET AVANT TOUT : chaque défi doit produire un résultat observable et vérifiable (objet construit, expérience réalisée, problème résolu, performance accomplie) — jamais une simple rêverie sans action physique.
- Priorise dans cet ordre : observation du réel > expérimentation > création manuelle > résolution de problème concret. L'imagination doit s'appuyer sur une action réelle, jamais la remplacer seule.
- Utilise en priorité les objets déjà disponibles chez l'enfant. N'invente jamais un défi nécessitant un achat important ou des conditions rares/spéciales.
- CENTRES D'INTÉRÊT = LEVIERS COMPORTEMENTAUX ET MODES COGNITIFS PROFONDS : Ne traite jamais un centre d'intérêt (déclaré par le parent ou observé) comme un simple thème, un sujet de surface ou un hobby décoratif (ex: "football", "dinosaures"). Décode et exploite le LEVIER COMPORTEMENTAL ET LE MODE OPÉRATOIRE MENTAL sous-jacent de l'enfant (ex: "Démonte pour comprendre", "Négocie toujours", "A besoin de bouger pour réfléchir"). Utilise ces traits comme MÉCANIQUE ET POSTURE D'APPRENTISSAGE pour introduire n'importe quel domaine. Si l'enfant "démonte pour comprendre", propose un défi de déconstruction/analyse inverse, qu'il s'agisse de sciences, d'écriture, d'artisanat ou de logique. Chaque défi doit employer la mécanique d'action préférée de l'enfant (démonter, schématiser, simuler, optimiser, enquêter) pour l'engager naturellement dans les apprentissages.
- VARIE LA MÉCANIQUE D'UN DÉFI À L'AUTRE : ne fais pas de "récupérer des matériaux et construire un objet" le réflexe par défaut de chaque défi. Alterne réellement entre observation, expérimentation, fabrication, résolution de problème, performance physique ou chronométrée, enquête sociale — la variété de forme compte autant que la variété de sujet.
- INTERDIT : défi irréalisable concrètement, matériel inaccessible, exercice creux sans valeur pédagogique réelle, tâche trop abstraite déconnectée du quotidien, formulation générique déjà vue mille fois ("dessine ce que tu veux", "imagine une histoire" sans ancrage réel).
- Cible explicitement 1 à 2 compétences précises et nomme-les dans "pedagogical_context" : Cognitives (logique, esprit critique, curiosité scientifique, créativité) · Pratiques (autonomie, débrouillardise/ingéniosité, méthode et rigueur, gestion du temps) · Sociales (communication, leadership, collaboration, empathie) · Personnelles (résilience face à la frustration, confiance en soi, esprit d'initiative, adaptabilité).
- Ne vise pas systématiquement le format le plus court : plus l'enfant grandit (8 ans et +), plus des formats longs et immersifs (au-delà d'une heure, voire un projet sur plusieurs jours) construisent une vraie résilience — une alternative constructive aux écrans, tant que ça reste réaliste pour le temps disponible indiqué.
- AUCUNE syntaxe Markdown dans les champs texte (pas de #, ##, **, tirets de liste) — phrases en texte brut uniquement. Les étapes vont exclusivement dans le tableau "steps", jamais mises en forme dans "description".
- "difficulty" ("facile" | "moyen" | "difficile") : évalue selon le temps nécessaire, le niveau d'autonomie requis, la complexité cognitive, la quantité de matériel, et le niveau de créativité/analyse demandé — reste cohérent avec la tranche d'âge.
- RELECTURE OBLIGATOIRE : avant de répondre, relis chaque champ texte et corrige toute faute d'orthographe, d'accent ou de grammaire. Zéro faute tolérée dans le JSON final.
- CLARTÉ POUR L'ENFANT : le titre et la description doivent être compréhensibles directement par l'enfant de cet âge, sans qu'un adulte ait besoin de les lui expliquer. Évite le jargon technique ou adulte (ex: "algorithme", "pseudo-code", "prototype") — si un tel mot est vraiment nécessaire au concept, explique-le en langage simple dans la même phrase.`;

// Was hand-copied into both prompts below and had already drifted once
// (one copy had an extra clarifying example the other lacked) — a single
// shared string, like GENIZIO_PRINCIPLES above, means a future wording
// tweak only has to be made once. Each call site prefixes its own list
// marker ("- " or "N. ") since the two prompts use different list styles.
const SAFETY_INSTRUCTION = `SÉCURITÉ ET SUPERVISION, sans excès de prudence : analyse si le défi comporte des risques réels (feu, cuisine avec source de chaleur — plaque, four, eau ou huile chaude —, objets coupants, produits chimiques, électricité, extérieur non sécurisé — eau profonde, hauteur, circulation, animaux dangereux). Si OUI, règle "requires_supervision" à true. Adapte le ton de "supervision_warning" à l'âge : avant 12 ans, précise qu'un adulte doit être présent pour cette étape ; à partir de 12 ans, un enfant peut réaliser l'étape lui-même — donne des mesures de sécurité concrètes à suivre plutôt que d'exiger la présence d'un adulte (ex: manipuler un briquet loin de matières inflammables, avec de l'eau à proximité). Ne signale pas de risque pour des activités quotidiennes sans danger réel (cuisine froide/sans cuisson, mélanger des ingrédients, extérieur familier, etc.).`;

// Partagée entre les 5 générateurs de défis IA de l'app (cf. genizio-decisions #35) —
// même raison que SAFETY_INSTRUCTION ci-dessus : un seul texte source, pas de copies
// qui dérivent. "declarative" retire tout jugement IA à la soumission (voir
// submitDeclarativeProof) : aucune photo n'a le pouvoir de prouver un comptage ou une
// durée, donc autant ne pas prétendre le vérifier — la déclaration du parent fait foi.
export const PROOF_MODE_INSTRUCTION = `MODE DE PREUVE : détermine "proof_mode" selon la nature du défi.
- "photo" (par défaut, le cas le plus courant) : le défi produit un résultat final visible (objet construit, dessin, expérience montée, texte écrit) — une photo suffit à en juger. N'inclus alors ni "proof_target" ni "declarative_award".
- "declarative" : le défi consiste en une action comptable, chronométrée ou physique en direct qu'une seule photo ne peut structurellement pas prouver (répétitions, durée, distance — ex: "20 jongles", "courir 10 minutes sans s'arrêter"). Dans ce cas UNIQUEMENT, fournis aussi :
  - "proof_target": {"metric": "unité comptée en 2-4 mots, ex: jongles réussis / minutes de course", "value": nombre cible}
  - "declarative_award": objet {"clé":points} avec des points de 1 à 3, clés EXCLUSIVEMENT parmi : spatial, corporelle, sociale, entrepreneuriale, creative, artisanale, emotionnelle, logico_mathematique, linguistique — les intelligences réellement mobilisées si le défi est réussi.`;

// Référentiel académique interne Génizio (cf. genizio-decisions #37/#39, docs/memoire/
// genizio_referentiel_academique.md — version condensée pour prompt, sans le détail des
// sources). Remplace les notes scolaires comme signal de calibrage : indépendant de l'école
// réelle de l'enfant, volontairement calé sur des standards internationaux exigeants
// (Common Core US, Singapore Math, NGSS, SHAPE America, CASEL, NFEC selon le domaine — niveaux
// de confiance inégaux, cf. le document source). Sert à étiqueter le CONTENU réel d'un défi
// par âge — jamais à afficher un verdict au parent (§1 du plan NAYA). "creative" est
// délibérément absente : son développement documenté n'est pas linéaire par âge (creux normaux
// à certains âges), incompatible avec ce mécanisme de comparaison — ne JAMAIS l'étiqueter.
export const ACADEMIC_REFERENTIAL_INSTRUCTION = `RÉFÉRENTIEL ACADÉMIQUE : si le défi relève d'un des domaines ci-dessous, détermine "academic_domain" ("mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale"), "academic_level_age" (nombre entier = l'âge auquel correspond RÉELLEMENT le contenu du défi que tu viens de concevoir, d'après ce référentiel — PAS forcément l'âge de l'enfant), et "academic_reference_note" (1 phrase courte citant la ligne précise du référentiel sur laquelle tu t'es basé, ex: "toutes les tables à un chiffre mémorisées vers 8 ans" — pas juste "niveau 8 ans"). Pour "creative" (créativité pure, imaginaire libre) ou tout domaine hors de cette liste, omets les trois champs.

MATHÉMATIQUES / LOGIQUE :
5 ans : compter à 100 par 1 et 10, écrire les nombres 0-20. 6 ans : addition/soustraction dans les 20. 7 ans : tables de multiplication 2,3,4,5,10 mémorisées, mesures standard, figures géométriques. 8 ans : TOUTES les tables à un chiffre (2-9) mémorisées, fractions comme quantité (1/b, a/b). 9 ans : multiplication à plusieurs chiffres, division avec reste, fractions équivalentes. 10 ans : multiplication/division à 2 chiffres, nombres décimaux. 11 ans : équations à une inconnue simples (x+p=q, px=q), inégalités simples. 12 ans : équations plus complexes (px+q=r), inégalités. 13 ans : exposants, racines, systèmes de 2 équations, notion de fonction. 14 ans : théorème de Pythagore, statistiques descriptives, algèbre avancée.

LANGAGE (lecture/écriture) :
5 ans : isole les sons d'un mot de 3 sons, débute le décodage syllabe par syllabe. 6 ans : lit un texte de son niveau à voix haute avec précision et expression, se corrige seul. 7 ans : même fluidité sur un texte plus avancé, décode des mots à plusieurs syllabes. 8-10 ans : décode des mots complexes, résume un texte, utilise des connecteurs logiques (parce que, donc, ensuite). 11-14 ans : rédige des textes structurés en plusieurs paragraphes, argumente avec plusieurs arguments organisés, analyse un texte (intention de l'auteur, point de vue).

SCIENCES / DÉCOUVERTE DU MONDE :
5-7 ans : propriétés de base des matériaux (ex: ce qui flotte/coule), besoins de base des êtres vivants. 8-10 ans : états et changements de la matière (fusion, évaporation...), systèmes du corps humain, cycle de la matière entre êtres vivants et environnement. 11-14 ans : cycle de l'eau complet (évaporation, condensation, précipitation), rôle de la photosynthèse, écosystèmes, énergie et forces.

CORPORELLE (motricité) :
3-5 ans : motricité globale en développement rapide (courir, sauter, grimper avec plus de contrôle). 6-10 ans : compétence dans une variété d'habiletés motrices (lancer, attraper, dribbler), concepts de mouvement de base, notions de condition physique. 11-14 ans : stratégies/tactiques dans des situations de jeu complexes, autonomie dans l'activité physique.

SOCIALE (relations) :
5-7 ans : partage, tour de rôle, reconnaît les émotions d'autrui simplement. 8-10 ans : comprend les perspectives d'autrui, empathie, communique et coopère, résout des conflits simples. 11-14 ans : négociation, résiste à la pression sociale négative, travail d'équipe dans des groupes plus larges/moins familiers.

EMOTIONNELLE (conscience et gestion de soi) :
5-7 ans : reconnaît et nomme ses émotions de base, autorégulation simple avec aide d'un adulte. 8-10 ans : reconnaît l'influence de ses émotions sur son comportement, autorégulation plus autonome, fixe de petits objectifs. 11-14 ans : gestion du stress plus complexe, prise de décision responsable tenant compte de plusieurs facteurs.

ENTREPRENEURIALE :
5-7 ans : notions d'argent de base (compter, épargner, différence besoin/envie). 8-10 ans : budget simple, idée de gagner de l'argent par un petit service, comprend qu'un choix a un coût. 11-14 ans : notions de base d'un petit projet (coût, prix, marge), planifie un budget sur plusieurs semaines.

ARTISANALE (habileté manuelle) :
6-7 ans : écriture fluide et contrôlée, maniement précis ciseaux/colle. 8-9 ans : motricité fine raffinée, tâches demandant une concentration prolongée. 10-14 ans : motricité fine proche de l'adulte, projets complexes en plusieurs séances, recherche un résultat "professionnel".

SPATIALE :
3 ans : vocabulaire spatial de base (dessus/dessous, dedans/dehors). 4-9 ans : perçoit des objets sous différents points de vue, notion de perspective en développement. 5 ans : réussit une tâche simple de "pliage mental" (imaginer un objet après pliage). 7-8 ans : pliage mental plus avancé, plafonne généralement vers cet âge.`;

const ALLOWED_IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Extraction robuste du JSON dans une réponse LLM brute. Remplace les regex
// ad-hoc dispersées (une par site d'appel, chacune avec ses propres angles
// morts) par une seule implémentation couvrant les cas réellement observés :
// bloc balisé ```json ... ``` (avec ou sans texte de politesse autour, ex.
// "Voici le résultat :\n```json\n{...}\n```\nJ'espère que ça aide"), bloc
// balisé sans fermeture (troncature de sortie), plusieurs blocs balisés dans
// la même réponse (on préfère celui explicitement tagué "json"), et JSON brut
// sans balise du tout. DeepSeek Reasoner en particulier n'accepte pas
// response_format:json_object (cf. callDeepSeekText) et est donc le provider
// le plus susceptible d'entourer son JSON de texte conversationnel.
export function extractJsonFromLLMResponse(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return trimmed;

  // 1. Bloc explicitement tagué ```json ... ``` (prioritaire s'il y a plusieurs blocs)
  const tagged = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (tagged) return tagged[1].trim();

  // 2. N'importe quel bloc balisé dont le contenu ressemble à du JSON
  for (const m of trimmed.matchAll(/```(?:\w+)?\s*([\s\S]*?)```/gi)) {
    const content = m[1].trim();
    if (content.startsWith("{") || content.startsWith("[")) return content;
  }

  // 3. Bloc balisé sans fermeture (réponse tronquée) — on retire juste le marqueur d'ouverture
  const unclosed = trimmed.match(/^```(?:\w+)?\s*([\s\S]*)$/);
  if (unclosed) {
    const content = unclosed[1].trim();
    if (content.startsWith("{") || content.startsWith("[")) return content;
  }

  // 4. Pas de balise — extrait le plus grand span {...} ou [...], tolère du
  //    texte conversationnel avant/après le JSON.
  const firstBrace = trimmed.search(/[{[]/);
  const lastBrace = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

// Routage IA (décision du 2026-07-21) : DeepSeek n'a pas de vision, donc toute
// analyse d'image reste sur Claude Sonnet 5 — c'est la SEULE raison pour laquelle
// Anthropic est encore appelé. Tout le texte (génération de défis, synthèses,
// raisonnement bayésien NAYA...) passe par DeepSeek, en attendant une clé Gemini 3.6.
// Anciens noms de modèles Anthropic conservés en commentaire pour mémoire :
// claude-haiku-4-5-20251001 (texte, remplacé) / claude-sonnet-5 (vision, inchangé).
const DEEPSEEK_CHAT_MODEL = "deepseek-chat";

async function callAnthropicVision(
  prompt: string,
  jsonMode: boolean,
  imageUrl: string | undefined,
  imageData: { base64: string; mediaType: string } | undefined,
  maxOutputTokens: number,
  maxRetries: number,
  model: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API Anthropic non configurée dans .env (ANTHROPIC_API_KEY)");
  }

  const contentBlocks: any[] = [];

  if (imageData) {
    const mediaType = ALLOWED_IMAGE_MEDIA_TYPES.includes(imageData.mediaType)
      ? imageData.mediaType
      : "image/jpeg";
    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: imageData.base64,
      },
    });
  } else if (imageUrl) {
    // Let a fetch/decode failure propagate instead of silently continuing
    // text-only — callers that pass an image expect the AI to actually see
    // it, and validateChallengeProof's fallback path only works if this throws.
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`Impossible de récupérer l'image (${imgResp.status})`);
    }
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const mediaType = ALLOWED_IMAGE_MEDIA_TYPES.includes(contentType) ? contentType : "image/jpeg";

    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data,
      },
    });
  }

  contentBlocks.push({
    type: "text",
    text: prompt,
  });

  const systemPrompt = jsonMode
    ? "Tu es un assistant IA précis. Tu dois impérativement répondre au format JSON demandé, sous forme de JSON brut, sans bloc de code Markdown, sans préambule ni explications."
    : undefined;

  let attempt = 0;
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: contentBlocks,
            },
          ],
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API Error Response (Attempt ${attempt + 1}):`, errorText);

        if (response.status === 429) {
          throw new Error("Quota Anthropic atteint (429). Veuillez patienter une minute avant de réessayer.");
        }
        if (response.status === 503 || response.status >= 500) {
          throw new Error(`Erreur Anthropic API (${response.status})`); // Transient error -> trigger retry
        }

        throw new Error(`Erreur Anthropic API (${response.status}) - Fatal`);
      }

      const json = await response.json();
      // Read the first *text* block, not content[0] blindly: claude-sonnet-5 prepends
      // a "thinking" block (content[0].type === "thinking", no .text), so content[0].text
      // is undefined for any reasoning-capable model — that silently produced "" and made
      // JSON.parse fail with "Réponse IA invalide" on every Sonnet call. Finding the text
      // block makes this robust to thinking blocks regardless of model.
      const textBlock = Array.isArray(json.content)
        ? json.content.find((b: any) => b?.type === "text")
        : null;
      let textContent = textBlock?.text ?? json.content?.[0]?.text ?? "";
      if (jsonMode) {
        textContent = textContent.trim();
        if (textContent.startsWith("```")) {
          textContent = textContent.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "").trim();
        }
      }
      clearTimeout(timeoutId);
      return textContent;
    } catch (err: any) {
      clearTimeout(timeoutId);
      attempt++;

      const isFatal = err.message && err.message.includes("Fatal");
      if (attempt >= maxRetries || isFatal) {
        throw err;
      }

      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      console.log(`Retrying Anthropic API in ${Math.round(delay)}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw new Error("Erreur Anthropic API après plusieurs tentatives.");
}

// DeepSeek expose une API compatible OpenAI (chat/completions) — même forme de
// requête/réponse que la plupart des fournisseurs texte, contrairement au format
// propriétaire d'Anthropic utilisé ci-dessus pour la vision.
async function callDeepSeekText(
  prompt: string,
  jsonMode: boolean,
  maxOutputTokens: number,
  maxRetries: number,
  model: string
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API DeepSeek non configurée dans .env (DEEPSEEK_API_KEY)");
  }

  const systemPrompt = jsonMode
    ? "Tu es un assistant IA précis. Tu dois impérativement répondre au format JSON demandé, sous forme de JSON brut, sans bloc de code Markdown, sans préambule ni explications."
    : "Tu es un assistant IA précis et utile.";

  let attempt = 0;
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          // deepseek-reasoner n'accepte pas ce paramètre — ne le passer qu'en mode
          // chat classique, JSON.parse(...) ci-dessous filtre quand même le résultat.
          ...(jsonMode && model !== "deepseek-reasoner" ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepSeek API Error Response (Attempt ${attempt + 1}):`, errorText);

        if (response.status === 429) {
          throw new Error("Quota DeepSeek atteint (429). Veuillez patienter une minute avant de réessayer.");
        }
        if (response.status === 503 || response.status >= 500) {
          throw new Error(`Erreur DeepSeek API (${response.status})`); // Transient error -> trigger retry
        }

        throw new Error(`Erreur DeepSeek API (${response.status}) - Fatal`);
      }

      const json = await response.json();
      let textContent: string = json.choices?.[0]?.message?.content ?? "";
      if (jsonMode) {
        textContent = textContent.trim();
        if (textContent.startsWith("```")) {
          textContent = textContent.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "").trim();
        }
      }
      clearTimeout(timeoutId);
      return textContent;
    } catch (err: any) {
      clearTimeout(timeoutId);
      attempt++;

      const isFatal = err.message && err.message.includes("Fatal");
      if (attempt >= maxRetries || isFatal) {
        throw err;
      }

      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      console.log(`Retrying DeepSeek API in ${Math.round(delay)}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw new Error("Erreur DeepSeek API après plusieurs tentatives.");
}

export async function callClaude(
  prompt: string,
  jsonMode: boolean = false,
  imageUrl?: string,
  // Le plafond de tokens de sortie réservé n'est pas ce qui est réellement généré —
  // un appel qui n'a besoin que de ~100 tokens mais en demande 4000 peut consommer
  // tout le budget par-minute à lui seul. Chaque site d'appel doit passer une
  // valeur proche de sa sortie réelle attendue plutôt qu'une taille unique.
  maxOutputTokens = 4000,
  maxRetries = 3,
  // Préféré à imageUrl quand présent — l'appelant a déjà les octets bruts (ex.
  // directement depuis un input file du navigateur) et évite l'aller-retour
  // upload-puis-fetch par Supabase Storage qu'imageUrl nécessite (cf.
  // validateChallengeProof : cet upload se faisait avant à chaque soumission
  // quel que soit le résultat, ce qui saturait le rate limit de l'API storage).
  imageData?: { base64: string; mediaType: string },
  // Force un modèle précis. Avant le passage à DeepSeek (2026-07-21), servait à
  // faire tourner un appel texte sur Sonnet pour le rôle de raisonnement NAYA
  // (diagnostic bayésien, decision #27 — "quand le système doit vraiment
  // réfléchir"). Le seul site d'appel qui l'utilise (generateHypotheses) passe
  // désormais "deepseek-reasoner" au lieu de "claude-sonnet-5".
  modelOverride?: string
): Promise<string> {
  const hasImage = !!(imageData || imageUrl);
  if (hasImage) {
    // DeepSeek n'a pas de vision — toute analyse d'image reste sur Claude,
    // quel que soit modelOverride (qui ne s'applique qu'au routage texte).
    return callAnthropicVision(prompt, jsonMode, imageUrl, imageData, maxOutputTokens, maxRetries, "claude-sonnet-5");
  }
  return callDeepSeekText(prompt, jsonMode, maxOutputTokens, maxRetries, modelOverride ?? DEEPSEEK_CHAT_MODEL);
}

const GenerateInput = z.object({
  childId: z.string().uuid(),
  count: z.number().int().min(1).max(6).default(4),
});

export const generateChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    // Domains repeatedly generated but never even started are a real signal
    // that's currently thrown away: the prompt only ever sees *completed*
    // challenges (below), so a domain the child ignores keeps coming back
    // just because the rotation/least-explored logic doesn't know it was
    // ignored. 14 days is long enough that "todo" genuinely means ignored,
    // not "hasn't gotten to it yet this week".
    const STALE_DOMAIN_CUTOFF = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: existing }, { data: completedChallenges }, { data: staleChallenges }] = await Promise.all([
      supabase
        .from("challenges")
        .select("title")
        .eq("child_id", data.childId)
        // Unbounded before: for a long-tenured family this list could grow
        // into a huge block of text sitting right before the safety
        // instruction later in the prompt, risking the "lost in the middle"
        // effect where instructions buried in a long context get followed
        // less reliably. The 30 most recent titles are enough to avoid
        // repeats without letting the prompt grow indefinitely.
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("challenges")
        .select("title, domain, ai_observations")
        .eq("child_id", data.childId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(6),
      supabase
        .from("challenges")
        .select("domain")
        .eq("child_id", data.childId)
        .eq("status", "todo")
        .lt("created_at", STALE_DOMAIN_CUTOFF),
    ]);
    const existingTitles = (existing ?? []).map((c) => c.title);
    const completedSummary = (completedChallenges ?? [])
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ''}"`)
      .join("\n");

    // A single unstarted challenge in a domain proves nothing (parents get
    // busy) — only flag a domain once it's happened at least twice, so this
    // is a real repeated pattern rather than noise from one busy week.
    const staleDomainCounts = (staleChallenges ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.domain] = (acc[r.domain] ?? 0) + 1;
      return acc;
    }, {});
    const ignoredDomains = Object.entries(staleDomainCounts)
      .filter(([, count]) => count >= 2)
      .map(([domain]) => domain);

    const leastExplored = getLeastExploredTalentLabels(child.talents as Record<string, number> | null);

    const prompt = `Tu es Naya, un mentor pédagogique pour enfants en Afrique francophone, sur la plateforme Génizio.
Génère ${data.count} défis d'apprentissage sur mesure pour cet enfant.

Profil :
- Prénom : ${child.name}
- Âge : ${child.age} ans
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Modes d'engagement et leviers comportementaux observés par le parent :
${formatChildInterestsPayload(child.interests)}
- Scores de talents actuels (Radar Chart de Howard Gardner, sur les 9 intelligences) : ${JSON.stringify(child.talents || {})}

Défis déjà accomplis par l'enfant et observations de Naya :
${completedSummary || "(Aucun défi complété pour le moment)"}

CONSIGNES DE DÉVELOPPEMENT LIÉES À L'ÂGE :
Adapte strictly la forme, la complexité intellectuelle et la motricité requise pour le défi à l'âge exact de l'enfant :
- De 1 à 3 ans (Exploration sensorielle et motrice) : Activités purement sensorielles (toucher, manipuler, transvaser, trier des couleurs/objets simples, textures, eau, sable). Aucune règle complexe, aucune consigne de motricité fine avancée (pas de découpage précis, pas d'écriture). Étape ultra-simple en 1 action à la fois.
- De 4 à 7 ans (Phase exploratoire et imaginative) : Activités intégrant de l'imagination, des petits jeux de rôle ("fait semblant de"), du dessin, des petites manipulations de cause à effet guidées par le plaisir immédiat. L'action pratique doit primer sur la théorie.
- De 8 à 11 ans (Phase structurée et concrète) : Proposer des projets de fabrication concrets (maquettes, expériences scientifiques simples, recettes simples, bricolage) avec des règles claires, des étapes méthodiques, et de l'observation logique ou sociale.
- De 12 ans et + (Phase d'abstraction et d'analyse) : Permettre de la pensée critique, de la stratégie, des projets plus autonomes et complexes, de la logique conceptuelle (ex: coder un algorithme sur papier, déchiffrer des énigmes ou concevoir des objets élaborés).

${GENIZIO_PRINCIPLES}

Contraintes :
- SYNTHÈSE PÉDAGOGIQUE ET APPRENTISSAGE ÉQUILIBRÉ : Associe les leviers comportementaux observés par le parent (posture cognitive) avec la cartographie des talents de l'enfant. Les intelligences actuellement les moins explorées chez cet enfant sont ${leastExplored.join(" et ")}. Sauf si le contexte les rend peu réalistes, au moins un des ${data.count} défis DOIT utiliser la posture ou mécanique d'action préférentielle de l'enfant comme passerelle naturelle pour explorer l'une de ces intelligences moins travaillées — c'est ainsi que Naya révèle des talents cachés en s'appuyant sur ses moteurs d'action naturels.
- Ancre les défis dans le contexte africain (matériaux locaux, réalités du quotidien, langues, marchés, agriculture, artisanat, culture).
- Choisis parmi ces domaines : ${shuffle(DOMAINS).join(", ")}.${ignoredDomains.length > 0 ? `\n- Cet enfant a déjà reçu plusieurs défis dans ${ignoredDomains.length > 1 ? "ces domaines" : "ce domaine"} (${ignoredDomains.join(", ")}) sans jamais les commencer : évite de reproposer ${ignoredDomains.length > 1 ? "ces domaines" : "ce domaine"}, sauf sous un angle radicalement différent de ce qui a déjà été proposé.` : ""}
- Chaque défi doit être concret, réalisable à la maison ou dans le quartier, adapté à l'âge.
- Étapes claires (3 à 6), matériaux simples et accessibles.
- Ne répète pas ces titres déjà proposés (${existingTitles.join(" | ") || "(aucun)"}) — et si tu remarques que plusieurs d'entre eux suivent la même mécanique de fond (ex: "récupère des matériaux et construis un objet"), varie consciemment vers une autre approche (observation, expérimentation, résolution de problème, performance...) plutôt que de prolonger ce schéma.
- Pour "material_tags" : un tag court en minuscules, sans accent, par matériau physique achetable
  (ex: "carton", "cutter", "colle", "ampoule") — pas les objets déjà présents chez tout le monde
  (eau, table, papier). Un tableau vide si rien d'achetable n'est nécessaire.
- ${SAFETY_INSTRUCTION}
- ${PROOF_MODE_INSTRUCTION}
- ${ACADEMIC_REFERENTIAL_INSTRUCTION}

Réponds STRICTEMENT en JSON valide avec ce format, pour chaque défi :
{"challenges":[{"domain":"...","title":"...","description":"...","duration":"...","steps":["...","..."],"materials":["...","..."],"material_tags":["..."],"pedagogical_context":"Ce que Naya observe via cette activité","intelligences":["Intelligence dominante sollicitée"],"requires_supervision":true ou false,"supervision_warning":"..." (ou null si false),"difficulty":"facile"|"moyen"|"difficile","proof_mode":"photo"|"declarative","proof_target":{"metric":"...","value":20} (uniquement si declarative),"declarative_award":{"corporelle":2} (uniquement si declarative),"academic_domain":"mathematiques"|"langage"|"sciences"|"corporelle"|"sociale"|"emotionnelle"|"entrepreneuriale"|"artisanale"|"spatiale"|null,"academic_level_age":14 (uniquement si academic_domain non null),"academic_reference_note":"..." (uniquement si academic_domain non null)}]}`;

    // Up to 6 full défis in one response, each now carrying the academic
    // referential fields (domain/level/citation) added on top of the original
    // schema. Measured live: 4 défis alone already uses 3100-3700 of a 4000
    // cap (78-91%) — a single slightly longer response silently truncates the
    // JSON and fails the whole batch. 8000 keeps real headroom at count=6 too.
    const content = await callClaude(prompt, true, undefined, 8000);
    let parsed: { challenges?: unknown };
    try {
      parsed = JSON.parse(extractJsonFromLLMResponse(content));
    } catch (err) {
      console.error("Error parsing generateChallenges LLM response:", err, "Raw:", content);
      throw new Error("Réponse IA invalide");
    }

    let list: z.infer<typeof ChallengeSchema>[];
    try {
      list = z.array(ChallengeSchema).parse(parsed.challenges ?? []);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    const rows = list.map((c) => ({
      user_id: userId,
      child_id: data.childId,
      domain: c.domain,
      description: c.description,
      duration: c.duration,
      steps: c.steps,
      materials: c.materials,
      pedagogical_context: c.pedagogical_context || null,
      // The model isn't told which exact tokens to use for "intelligences"
      // (it's free text, e.g. "Créativité"), so it never matches
      // VALID_TALENT_KEYS's technical keys (creative, spatial, ...) —
      // target_intelligences at creation time is decorative, not the
      // source of truth for talent scoring (that's increment_child_talents
      // at validation time, which does constrain to the 9 known keys).
      // Falling back to [c.domain] used to silently write a non-taxonomy
      // value (e.g. "Cuisine") into this column; [] keeps this consistent
      // with assignTemplateChallenge instead.
      target_intelligences: c.intelligences || [],
      ...finalizeChallenge(c, child.age),
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("challenges")
      .insert(rows)
      .select("*");
    if (insErr) throw new Error(insErr.message);
    void trackMaterialSuggestions((inserted ?? []).map((c) => ({ material_tags: c.material_tags ?? [], title: c.title })));
    return inserted;
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const patch: {
      status?: "todo" | "in_progress" | "completed";
      progress?: number;
      notes?: string | null;
      completed_at?: string | null;
    } = {};
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "completed") {
        patch.progress = 100;
        patch.completed_at = new Date().toISOString();
      } else if (data.status === "todo") {
        patch.progress = 0;
        patch.completed_at = null;
      } else {
        patch.completed_at = null;
      }
    }
    if (data.progress !== undefined) {
      patch.progress = data.progress;
      if (data.progress === 100) {
        patch.status = "completed";
        patch.completed_at = new Date().toISOString();
      } else if (data.progress > 0) {
        patch.status = "in_progress";
        patch.completed_at = null;
      }
    }
    if (data.notes !== undefined) patch.notes = data.notes;

    // Ownership is enforced by RLS too, but every other mutation in this file
    // checks it explicitly — do the same here instead of relying solely on RLS.
    const { data: row, error } = await context.supabase
      .from("challenges")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (patch.status === "completed" && row?.child_id) {
      await awardCompletionXP(context.supabase, row.child_id);
    }

    return row;
  });

export const deleteChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("challenges")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ValidateInput = z.object({
  id: z.string().uuid(),
  proofText: z.string().max(2000).optional(),
  // Raw bytes instead of a pre-uploaded Storage URL — the image is only
  // persisted to Storage after the AI confirms it's actually relevant (see
  // below), instead of on every submission attempt regardless of outcome.
  proofImageBase64: z.string().optional(),
  proofImageMediaType: z.string().optional(),
});

export const validateChallengeProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ValidateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: challenge, error: challengeErr } = await supabase
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.id)
      .single();

    if (challengeErr || !challenge) throw new Error("Défi introuvable");
    if (challenge.user_id !== userId) throw new Error("Accès refusé.");

    const prompt = `Tu es un mentor pédagogique et un expert en psychologie de l'enfant (Inspiré par Howard Gardner et les intelligences multiples).
L'enfant (Prénom: ${challenge.child_profiles.name}, Âge: ${challenge.child_profiles.age}) vient de terminer le défi : "${challenge.title}".
Domaine : ${challenge.domain}
Description du défi : ${challenge.description}

Le parent a soumis cette preuve de réalisation :
${data.proofText ? `Texte/Notes : "${data.proofText}"` : ""}
${data.proofImageBase64 ? `Une image a également été fournie (vérifie l'image si possible).` : ""}

Ta mission :
1. Vérifie D'ABORD si cette preuve correspond réellement à CE défi précis (le texte décrit-il une activité liée au défi ? l'image montre-t-elle quelque chose en rapport ?). Si la preuve est manifestement hors-sujet ou sans rapport avec le défi, n'écris AUCUN message de félicitations : explique poliment et brièvement au parent que la preuve ne semble pas correspondre à ce défi et invite à en soumettre une nouvelle. Dans ce cas, "talents_awarded" doit être un objet vide {}. IMPORTANT : le parent ne peut joindre qu'UNE SEULE photo à la fois (jamais plusieurs) — ne demande jamais "des photos" au pluriel ni plusieurs preuves différentes ; suggère UNE seule photo montrant l'aspect le plus représentatif du défi.
2. Si (et seulement si) la preuve correspond bien au défi, rédige une courte observation (2-3 phrases) encourageante pour le parent, soulignant l'ingéniosité de l'enfant dans cette réalisation. (Tu peux t'adresser au parent). Texte brut uniquement, sans aucune syntaxe Markdown (pas de #, ##, **, tirets de liste).
3. Dans ce cas seulement, détermine quelles intelligences ont été réellement mobilisées et attribue des points (de 1 à 3 par intelligence, selon la qualité réelle de la réalisation — ne distribue jamais de points par défaut).
Les intelligences possibles sont : spatial, corporelle, sociale, entrepreneuriale, creative, artisanale, emotionnelle, logico_mathematique, linguistique.

Réponds STRICTEMENT en JSON valide avec ce format :
{
  "observations": "Ton message d'encouragement...",
  "talents_awarded": {
    "nom_de_lintelligence": 2
  }
}`;

    let aiContent = "";
    let imageAnalyzed = !!data.proofImageBase64;
    const imageData = data.proofImageBase64
      ? { base64: data.proofImageBase64, mediaType: data.proofImageMediaType ?? "image/jpeg" }
      : undefined;
    // A short observation + a small talents_awarded object — nowhere near
    // the 4000-token default sized for a batch of full défis. Reserving
    // that much per call was the main way this endpoint could exhaust the
    // org's per-minute output-token budget on a single request.
    try {
      aiContent = await callClaude(prompt, true, undefined, 500, 3, imageData);
    } catch (err) {
      if (err instanceof Error && (err.message.includes("429") || err.message.includes("rate_limit") || err.message.includes("quota"))) {
        console.error("Vision model rate limited / quota exceeded:", err);
        throw new Error("Service IA temporairement surchargé (limite de débit atteinte). Veuillez réessayer dans un instant.");
      }
      console.warn("Vision model call failed, falling back to text only:", err);
      imageAnalyzed = false;
      try {
        aiContent = await callClaude(prompt, true, undefined, 500);
      } catch (fallbackErr) {
        console.error("Text-only fallback model call failed:", fallbackErr);
        if (fallbackErr instanceof Error && (fallbackErr.message.includes("429") || fallbackErr.message.includes("rate_limit") || fallbackErr.message.includes("quota"))) {
          throw new Error("Service IA temporairement surchargé (limite de débit atteinte). Veuillez réessayer dans un instant.");
        }
        throw new Error(`Erreur d'analyse par l'IA : ${fallbackErr instanceof Error ? fallbackErr.message : "Erreur inconnue"}`);
      }
    }

    let parsed: { observations?: string; talents_awarded?: Record<string, number> };
    try {
      parsed = JSON.parse(extractJsonFromLLMResponse(aiContent));
    } catch (parseErr) {
      console.error("Error parsing vision/text AI response JSON:", parseErr, "Content:", aiContent);
      throw new Error("Réponse IA invalide — réessayez dans quelques instants.");
    }

    const observations = parsed.observations ?? "Bravo pour cette belle réalisation !";
    const awarded = parsed.talents_awarded ?? {};

    const validTalentKeys = new Set(VALID_TALENT_KEYS);
    const deltas: Record<string, number> = {};
    let intelligenceKeys: string[] = [];
    for (const [key, points] of Object.entries(awarded)) {
      // Drop anything the AI returns outside the 9 known intelligences — a
      // hallucinated or misspelled key would otherwise pollute talents forever.
      if (typeof points === 'number' && validTalentKeys.has(key)) {
        // Floor was previously 1 — meaning even when the model correctly
        // judged a submission irrelevant/low-effort and tried to award 0,
        // the code silently bumped it back up to 1, guaranteeing every
        // submission got rewarded regardless of what the AI concluded.
        // Floor of 0 lets a genuine "no merit" verdict actually result in
        // no points, instead of masking it.
        const clamped = Math.max(0, Math.min(3, Math.round(points)));
        if (clamped > 0) {
          deltas[key] = clamped;
          intelligenceKeys.push(key);
        }
      }
    }

    if (Object.keys(deltas).length > 0) {
      // Atomic increment (row-locked, see increment_child_talents) instead of a
      // client-side read-modify-write, so two near-simultaneous validations for
      // the same child can't silently drop one set of points.
      const { error: talentsError } = await supabase.rpc("increment_child_talents", {
        p_child_id: challenge.child_profiles.id,
        p_deltas: deltas,
      });
      if (talentsError) throw new Error(talentsError.message);
    }

    const relevant = Object.keys(deltas).length > 0;

    if (!relevant) {
      // NAYA 2.0 Phase 0 : une soumission jugée hors-sujet ne modifie rien en
      // base (aucun trigger DB ne peut donc la capter) — c'est pourtant un vrai
      // signal de friction pour le Jumeau Pédagogique. Émission applicative,
      // best-effort : un échec de journalisation ne doit jamais casser la
      // validation elle-même.
      try {
        const { error: evtErr } = await supabase.from("observation_events").insert({
          child_id: challenge.child_id,
          user_id: userId,
          type: "PROOF_REJECTED",
          source: "app",
          payload: {
            challenge_id: challenge.id,
            domain: challenge.domain,
            had_image: !!data.proofImageBase64,
            image_analyzed: imageAnalyzed,
          },
        });
        if (evtErr) console.error("PROOF_REJECTED event insert failed (non-fatal):", evtErr);
      } catch (err) {
        console.error("PROOF_REJECTED event insert failed (non-fatal):", err);
      }
    }

    // A rejected submission used to still write ai_observations to the DB —
    // and the UI only ever renders this whole validation card while
    // ai_observations is null, so writing it here permanently hid the
    // "submit again" form the AI's own rejection message just promised the
    // parent. Only persist the outcome (and only upload the photo) once the
    // AI actually confirms the submission is relevant.
    let updatedChallenge: any = challenge;
    let levelUp: Awaited<ReturnType<typeof awardCompletionXP>> = null;
    let badgeUnlocked: Awaited<ReturnType<typeof checkAndAwardBadge>> = null;
    if (relevant) {
      let proofImageUrl: string | null = null;
      if (data.proofImageBase64) {
        const mediaType = data.proofImageMediaType ?? "image/jpeg";
        const ext = mediaType.split("/")[1] ?? "jpg";
        const fileName = `${challenge.child_id}/${challenge.id}-${Math.random()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("proofs")
          .upload(fileName, Buffer.from(data.proofImageBase64, "base64"), { contentType: mediaType });
        if (uploadError) {
          console.error("Erreur d'upload de la preuve (non bloquant):", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage.from("proofs").getPublicUrl(fileName);
          proofImageUrl = publicUrlData.publicUrl;
        }
      }

      const patch = {
        status: "completed" as const,
        progress: 100,
        completed_at: new Date().toISOString(),
        proof_image_url: proofImageUrl,
        ai_observations: observations,
        target_intelligences: intelligenceKeys,
      };

      const { data: updated, error } = await supabase
        .from("challenges")
        .update(patch)
        .eq("id", data.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      updatedChallenge = updated;

      levelUp = await awardCompletionXP(supabase, challenge.child_id);
      badgeUnlocked = await checkAndAwardBadge(supabase, challenge.child_id, challenge.domain);

      // NAYA 2.0 Phase 3b : si ce défi était un défi discriminant, met à jour la boucle bayésienne
      try {
        const { processDiscriminantResult } = await import("@/lib/hypotheses.functions");
        void processDiscriminantResult(data.id, "COMPLETED", relevant);
      } catch (err) {
        console.error("Non-fatal: processDiscriminantResult failed", err);
      }
    }

    return {
      challenge: updatedChallenge,
      observations,
      awarded_points: awarded,
      imageAnalyzed,
      relevant,
      levelUp,
      badgeUnlocked,
    };
  });

const SubmitDeclarativeInput = z.object({
  id: z.string().uuid(),
  reportedValue: z.number().finite(),
});

// Chemin de preuve "declarative" (cf. genizio-decisions #35) : 0 appel IA, par
// design. Une seule photo ne peut pas prouver un comptage/une durée, donc on ne
// prétend plus le vérifier — on compare la déclaration du parent à la cible fixée
// par finalizeChallenge au moment de la génération du défi. Retourne exactement
// la même forme que validateChallengeProof ({challenge, observations,
// awarded_points, imageAnalyzed, relevant}) pour qu'OutcomeChat réutilise sans
// modification son écran de succès / son message de refus.
export const submitDeclarativeProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SubmitDeclarativeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: challenge, error: challengeErr } = await supabase
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.id)
      .single();

    if (challengeErr || !challenge) throw new Error("Défi introuvable");
    if (challenge.user_id !== userId) throw new Error("Accès refusé.");
    if (challenge.proof_mode !== "declarative") {
      throw new Error("Ce défi ne se valide pas par déclaration.");
    }

    const target = challenge.proof_target as { metric?: string; value?: number } | null;
    if (!target?.metric || typeof target.value !== "number") {
      throw new Error("Cible de déclaration manquante pour ce défi.");
    }

    const childName = challenge.child_profiles.name as string;
    const relevant = data.reportedValue >= target.value;

    if (!relevant) {
      // Même logique que le rejet côté photo (PROOF_REJECTED) : rien n'est modifié
      // en base pour le défi, mais c'est un vrai signal de friction pour le Jumeau
      // Pédagogique — journalisation best-effort, jamais bloquante.
      try {
        const { error: evtErr } = await supabase.from("observation_events").insert({
          child_id: challenge.child_id,
          user_id: userId,
          type: "PROOF_REJECTED",
          source: "app",
          payload: { challenge_id: challenge.id, domain: challenge.domain, declarative: true, reported_value: data.reportedValue, target_value: target.value },
        });
        if (evtErr) console.error("PROOF_REJECTED event insert failed (non-fatal):", evtErr);
      } catch (err) {
        console.error("PROOF_REJECTED event insert failed (non-fatal):", err);
      }

      return {
        challenge,
        observations: `Pas encore atteint cette fois (${data.reportedValue}/${target.value} ${target.metric}) — ce n'est pas grave, ${childName} peut retenter dès que prêt·e !`,
        awarded_points: {},
        imageAnalyzed: false,
        relevant: false,
        levelUp: null,
        badgeUnlocked: null,
      };
    }

    const award = (challenge.declarative_award as Record<string, number> | null) ?? {};
    if (Object.keys(award).length > 0) {
      const { error: talentsError } = await supabase.rpc("increment_child_talents", {
        p_child_id: challenge.child_id,
        p_deltas: award,
      });
      if (talentsError) throw new Error(talentsError.message);
    }

    const observations = `Bravo ! ${childName} a réussi ${data.reportedValue} ${target.metric} (objectif : ${target.value}). Une belle preuve de persévérance.`;

    const { data: updated, error } = await supabase
      .from("challenges")
      .update({
        status: "completed" as const,
        progress: 100,
        completed_at: new Date().toISOString(),
        ai_observations: observations,
        target_intelligences: Object.keys(award),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Manquait ici jusqu'à présent : validateChallengeProof et updateChallenge
    // l'appellent déjà toutes les deux — un défi validé par déclaration (jongles,
    // minutes de course...) est une complétion tout aussi réelle et doit compter
    // pour l'XP/la série au même titre qu'une preuve photo.
    const levelUp = await awardCompletionXP(supabase, challenge.child_id);
    const badgeUnlocked = await checkAndAwardBadge(supabase, challenge.child_id, challenge.domain);

    // NAYA 2.0 Phase 3b : si ce défi déclaratif était le défi discriminant d'un
    // cycle d'hypothèses, met à jour la boucle bayésienne — même point d'entrée
    // que validateChallengeProof, l'origine de la preuve ne doit pas changer le
    // fonctionnement du moteur bayésien en aval.
    try {
      const { processDiscriminantResult } = await import("@/lib/hypotheses.functions");
      void processDiscriminantResult(data.id, "COMPLETED", true);
    } catch (err) {
      console.error("Non-fatal: processDiscriminantResult failed", err);
    }

    return {
      challenge: updated,
      observations,
      awarded_points: award,
      imageAnalyzed: false,
      relevant: true,
      levelUp,
      badgeUnlocked,
    };
  });

const AssignTemplateInput = z.object({
  childId: z.string().uuid(),
  template: ChallengeSchema.extend({
    intelligences: z.array(z.string()).optional(),
    pedagogical_context: z.string().optional(),
  }),
  // Atelier du Temps — mécanique "Estimation" (cf. genizio-decisions #30) : combien
  // de temps l'enfant pense avoir besoin, capturé au moment de l'assignation depuis
  // l'Atelier. Absent pour tout autre chemin d'assignation (ex. "Composer un défi
  // ciblé" sur la page Défis, qui ne demande pas de temps) — reste NULL en base,
  // aucune carte de comparaison ne s'affichera pour ces défis-là, c'est voulu.
  estimated_duration_minutes: z.number().int().positive().max(1440).optional(),
});

export const assignTemplateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AssignTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, age")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const { template } = data;
    // Re-run the deterministic checks here rather than trusting
    // template.requires_supervision/supervision_warning/difficulty as-is:
    // this is a client-supplied value (round-tripped from
    // generateSingleChallenge's preview) and this insert is the actual
    // point of truth in the DB.
    const { data: inserted, error } = await supabase
      .from("challenges")
      .insert({
        user_id: userId,
        child_id: data.childId,
        domain: template.domain,
        description: template.description,
        duration: template.duration,
        steps: template.steps,
        materials: template.materials,
        target_intelligences: template.intelligences ?? [],
        status: "todo",
        progress: 0,
        pedagogical_context: template.pedagogical_context ?? null,
        estimated_duration_minutes: data.estimated_duration_minutes ?? null,
        ...finalizeChallenge(template, child.age),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    void trackMaterialSuggestions([{ material_tags: inserted.material_tags ?? [], title: inserted.title }]);
    return inserted;
  });

const GenerateSingleInput = z.object({
  childId: z.string().uuid(),
  timeAvailable: z.string().optional(),
  location: z.string().optional(),
  homeMaterials: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
});

export const generateSingleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateSingleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    // Unlike generateChallenges (the batch generator), this on-demand single-défi
    // path never checked recent titles at all — a parent clicking "Composer un défi
    // ciblé" repeatedly could get literal duplicates. Fetching both in parallel
    // matches generateChallenges' existing pattern instead of inventing a new one.
    const [{ data: completedChallenges }, { data: existing }] = await Promise.all([
      supabase
        .from("challenges")
        .select("title, domain, ai_observations")
        .eq("child_id", data.childId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(6),
      supabase
        .from("challenges")
        .select("title")
        .eq("child_id", data.childId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const completedSummary = (completedChallenges ?? [])
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ''}"`)
      .join("\n");
    const existingTitles = (existing ?? []).map((c) => c.title);

    const timeAvailable = data.timeAvailable || "30 min";
    const location = data.location || "Maison (Intérieur)";
    const targetDomain = data.domain && data.domain !== "all" ? data.domain : null;

    const domainInstruction = targetDomain
      ? `3. Tu DOIS générer un défi spécifiquement dans le domaine d'intelligence ou la catégorie suivante : "${targetDomain}". Adapte l'activité pour cibler ce domaine précis.`
      : `3. Les intelligences actuellement les moins explorées chez cet enfant sont ${getLeastExploredTalentLabels(child.talents as Record<string, number> | null).join(" et ")}. Sauf si le temps/lieu disponible les rend peu réalistes, choisis un domaine d'intelligence qui cible l'une de ces intelligences plutôt que de renforcer un talent déjà confirmé. Tu peux créer des défis "hybrides" (ex: utiliser l'art pour comprendre les mathématiques).`;

    const prompt = `Tu es Naya, un mentor pédagogique d'élite spécialisé dans la psychologie de l'enfant et les Intelligences Multiples d'Howard Gardner, opérant en Afrique francophone.
Génère un défi d'apprentissage sur-mesure, hautement interactif et passionnant pour cet enfant, en respectant son contexte immédiat.

Profil de l'enfant :
- Prénom : ${child.name}
- Âge : ${child.age} ans
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Modes d'engagement et leviers comportementaux observés par le parent :
${formatChildInterestsPayload(child.interests)}
- Scores de talents actuels (Radar Chart de Howard Gardner) : ${JSON.stringify(child.talents || {})}

CONSIGNES DE DÉVELOPPEMENT LIÉES À L'ÂGE :
Adapte strictement la forme, la complexité intellectuelle et la motricité requise pour le défi à l'âge exact de l'enfant :
- De 1 à 3 ans (Exploration sensorielle et motrice) : Activités purement sensorielles (toucher, manipuler, transvaser, trier des couleurs/objets simples, textures, eau, sable). Aucune règle complexe, aucune consigne de motricité fine avancée (pas de découpage précis, pas d'écriture). Étape ultra-simple en 1 action à la fois.
- De 4 à 7 ans (Phase exploratoire et imaginative) : Activités intégrant de l'imagination, des petits jeux de rôle ("fait semblant de"), du dessin, des petites manipulations de cause à effet guidées par le plaisir immédiat. L'action pratique doit primer sur la théorie.
- De 8 à 11 ans (Phase structurée et concrète) : Proposer des projets de fabrication concrets (maquettes, expériences scientifiques simples, recettes simples, bricolage) avec des règles claires, des étapes méthodiques, et de l'observation logique ou sociale.
- De 12 ans et + (Phase d'abstraction et d'analyse) : Permettre de la pensée critique, de la stratégie, des projets plus autonomes et complexes, de la logique conceptuelle (ex: coder un algorithme sur papier, déchiffrer des énigmes ou concevoir des objets élaborés).

${GENIZIO_PRINCIPLES}

Défis déjà accomplis par l'enfant et observations de Naya :
${completedSummary || "(Aucun défi complété pour le moment)"}

Ne répète pas ces titres déjà proposés à cet enfant (${existingTitles.join(" | ") || "(aucun)"}) — et si tu remarques que plusieurs d'entre eux suivent la même mécanique de fond (ex: "récupère des matériaux et construis un objet"), varie consciemment vers une autre approche (observation, expérimentation, résolution de problème, performance...) plutôt que de prolonger ce schéma.

Contexte immédiat (TRÈS IMPORTANT) :
- Temps disponible : ${timeAvailable}
- Lieu / Environnement : ${location}
${data.homeMaterials ? `- Matériaux/objets disponibles à la maison : ${data.homeMaterials}` : ""}

Ta mission (Synthèse Pédagogique) :
1. Analyse la carte des talents (Radar Chart), les leviers comportementaux observés par le parent (posture cognitive), ET les observations des défis passés.
2. Synthèse pédagogique : Utilise les postures cognitives et mécaniques d'action préférées de l'enfant comme levier d'entrée pour aborder le domaine cible. Si les observations passées indiquent une évolution ou des points de blocage, adapte la mécanique d'action pour créer une passerelle d'apprentissage stimulante.
${domainInstruction}
4. Le défi doit s'adapter EXACTEMENT au temps disponible. S'il n'y a que 10 minutes, propose un "mini-défi" immédiat. Si c'est 1h+, propose un projet structuré.
5. Le défi doit être réalisable avec les objets de ce lieu précis.
${
  data.homeMaterials
    ? `6. UTILISATION DES MATÉRIAUX DE LA MAISON : Tu DOIS concevoir un défi qui utilise en priorité ou exclusivement les matériaux indiqués par le parent ("${data.homeMaterials}"). Si ces matériaux ne suffisent pas ou ne sont pas propices à une activité d'apprentissage stimulante dans le domaine choisi, tu PEUX inclure d'autres ustensiles simples ou matériaux courants, mais signale-le de façon transparente dans la description et les étapes (et liste le matériel additionnel nécessaire). Si les matériaux fournis ne permettent vraiment rien d'intéressant, génère le défi sans cette contrainte et explique-le brièvement dans la description ou le contexte pédagogique.`
    : ""
}
7. ${SAFETY_INSTRUCTION}
8. Pour "material_tags" : un tag court en minuscules, sans accent, par matériau physique achetable
   (ex: "carton", "cutter", "colle", "ampoule") — pas les objets déjà présents chez tout le monde
   (eau, table, papier). Un tableau vide si rien d'achetable n'est nécessaire.
9. ${PROOF_MODE_INSTRUCTION}
10. ${ACADEMIC_REFERENTIAL_INSTRUCTION}

Réponds STRICTEMENT en JSON valide avec ce format exact :
{
  "domain": "Domaine choisi",
  "title": "Titre accrocheur du défi",
  "description": "Pitch pour l'enfant",
  "duration": "Durée estimée",
  "steps": ["Étape 1", "Étape 2..."],
  "materials": ["Outil 1", "Matériau 2..."],
  "material_tags": ["outil-1", "materiau-2"],
  "pedagogical_context": "Ce que Naya observe via cette activité",
  "intelligences": ["Intelligence dominante sollicitée"],
  "requires_supervision": true ou false,
  "supervision_warning": "Attention: Manipulez le couteau avec l'enfant" (ou null si false),
  "difficulty": "facile" | "moyen" | "difficile",
  "proof_mode": "photo" | "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null)
}`;

    // A single défi, not a batch — the 4000 default (sized for up to 6 défis
    // in generateChallenges) would needlessly reserve most of the org's
    // per-minute output-token budget for a response that only needs a
    // fraction of that.
    const content = await callClaude(prompt, true, undefined, 1200);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonFromLLMResponse(content));
    } catch (err) {
      console.error("Error parsing generateSingleChallenge LLM response:", err, "Raw:", content);
      throw new Error("Réponse IA invalide");
    }

    let c: z.infer<typeof ChallengeSchema>;
    try {
      c = ChallengeSchema.parse(parsed);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    // Preview only — nothing is persisted here. The Laboratoire and the Défi page's
    // single-challenge generator both show this as a draft the parent can regenerate
    // freely; assignTemplateChallenge re-applies the same checks server-side at the
    // real insertion point, since this preview is round-tripped through the client.
    return {
      ...c,
      ...finalizeChallenge(c, child.age),
    };
  });

export const getChildAISynthesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .single();

    if (!child) throw new Error("Profil introuvable");

    const { data: completed } = await supabase
      .from("challenges")
      .select("title, domain, ai_observations")
      .eq("child_id", data.childId)
      .eq("status", "completed");

    if (!completed || completed.length === 0) {
      return "Naya attend que l'enfant réalise ses premiers défis pour analyser son profil et dresser une synthèse de ses talents émergents. Dès qu'un défi sera complété et validé par l'IA, vous retrouverez ici ses points forts et styles d'apprentissage préférentiels.";
    }

    // Regenerated at most once a week instead of on every page load (this
    // function used to call the AI fresh every single time, including on
    // every remount and after every challenge validation). The 7-day window
    // rolls forward from the last successful generation, not a fixed
    // calendar boundary — visiting again 8 days after the last regeneration
    // triggers a new one, and the next window starts from that moment.
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastGeneratedAt = child.ai_synthesis_generated_at ? new Date(child.ai_synthesis_generated_at).getTime() : 0;
    if (child.ai_synthesis && Date.now() - lastGeneratedAt < ONE_WEEK_MS) {
      return child.ai_synthesis;
    }

    const completedSummary = completed
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? 'Pas d\'observation'}"`)
      .join("\n");

    const formattedInterests = formatChildInterestsPayload(child.interests);

    const prompt = `Tu es Naya, une IA mentore pédagogique.
Analyse les accomplissements suivants de l'enfant ${child.name} (${child.age} ans) :
Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

Défis accomplis et observations de Naya :
${completedSummary}

Rédige une synthèse pédagogique bienveillante et constructive à l'attention des parents (2 paragraphes courts maximum).
Mets en lumière ses formes d'intelligence dominantes qui ressortent de ses actions, ses points forts comportementaux, et donne 1-2 recommandations de domaines à explorer ensuite pour cultiver son potentiel.
Écris dans un style fluide, chaleureux et professionnel, en texte brut uniquement — aucune syntaxe Markdown (pas de #, ##, **, tirets de liste), sépare les deux paragraphes par un simple retour à la ligne.`;

    try {
      // 2 short paragraphs, not a batch of défis.
      const synthesis = await callClaude(prompt, false, undefined, 700);
      // Only refresh the cache on a genuine success — a transient
      // quota/API failure must not lock in the fallback message as "the"
      // synthesis for the next 7 days.
      await supabase
        .from("child_profiles")
        .update({ ai_synthesis: synthesis, ai_synthesis_generated_at: new Date().toISOString() })
        .eq("id", data.childId);
      return synthesis;
    } catch (e: any) {
      console.error("AI Synthesis Error:", e.message);
      // Prefer a real (if stale) previous synthesis over the generic
      // "please wait" message when one exists.
      return (
        child.ai_synthesis ||
        "L'intelligence de Naya se repose quelques instants (quota de requêtes atteint). Revenez dans une petite minute pour lire la synthèse complète !"
      );
    }
  });

// Lettre d'orientation du Passeport d'Excellence — distincte de getChildAISynthesis
// (qui est comportementale/pédagogique) : celle-ci est tournée vers l'avenir,
// synthétise guilde + talents dominants + domaines les plus pratiqués en un
// paragraphe de recommandation, dans le ton d'une lettre de référence. Gatée sur
// pdf_unlocked (data.childId doit appartenir à un Passeport déjà payé/activé par
// l'administration) : contrairement à un chat libre, le volume d'appels reste donc
// borné au nombre de familles ayant payé, pas à l'usage gratuit de l'app. Même
// cache 7 jours que ai_synthesis, mêmes garanties (fallback sur l'ancienne lettre
// en cas d'échec transitoire de l'API).
export const getPassportLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .single();

    if (!child) throw new Error("Profil introuvable");
    if (!child.pdf_unlocked) throw new Error("Passeport non débloqué");

    const { data: completed } = await supabase
      .from("challenges")
      .select("title, domain")
      .eq("child_id", data.childId)
      .eq("status", "completed");

    if (!completed || completed.length === 0) {
      return "";
    }

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastGeneratedAt = child.passport_letter_generated_at ? new Date(child.passport_letter_generated_at).getTime() : 0;
    if (child.passport_letter && Date.now() - lastGeneratedAt < ONE_WEEK_MS) {
      return child.passport_letter;
    }

    const domainCounts: Record<string, number> = {};
    for (const c of completed) domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;
    const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

    const topTalents = Object.entries((child.talents as Record<string, number>) || {})
      .filter(([, v]) => (v ?? 0) > 0)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 3)
      .map(([k]) => TALENT_KEY_LABELS[k] ?? k);

    const prompt = `Tu es Naya, mentore IA de Génizio. Rédige la lettre de clôture du "Passeport d'Excellence" — un dossier de valorisation des talents — de ${child.name} (${child.age} ans).

Domaines les plus pratiqués : ${topDomains.join(", ") || "non déterminés"}
Talents dominants : ${topTalents.join(", ") || "non déterminés"}
Nombre de défis réels complétés : ${completed.length}

Écris un unique paragraphe (4 à 6 phrases), chaleureux et tourné vers l'avenir, qui :
- résume ce que ces éléments révèlent du potentiel de ${child.name},
- suggère 2-3 pistes concrètes (matières, activités, filières) où ce potentiel pourrait s'épanouir,
- reste honnête et mesuré (aucun score, aucune comparaison à d'autres enfants, aucune promesse de réussite garantie).
Texte brut uniquement, aucune syntaxe Markdown.`;

    try {
      const letter = await callClaude(prompt, false, undefined, 400);
      await supabase
        .from("child_profiles")
        .update({ passport_letter: letter, passport_letter_generated_at: new Date().toISOString() })
        .eq("id", data.childId);
      return letter;
    } catch (e: any) {
      console.error("Passport letter error:", e.message);
      return child.passport_letter || "";
    }
  });

const AnalyzePostInput = z.object({
  imageUrl: z.string().url(),
  domain: z.string().optional(),
});

export const analyzePostProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AnalyzePostInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Tu es Naya, une IA experte en développement de l'enfant et intelligences multiples (Howard Gardner).
Analyse cette photo qui représente une "preuve" d'activité ou une création réalisée par un enfant. 
Le parent a indiqué que cette activité était liée au domaine : ${data.domain || 'Non spécifié'}.
Ton but est de valider cette preuve et d'y apposer ton "Tampon pédagogique".
Réponds STRICTEMENT en une seule phrase courte, chaleureuse et valorisante. Ta phrase DOIT mentionner l'intelligence principale que l'enfant a dû utiliser dans cette scène (ex: spatiale, créative, kinesthésique, logico-mathématique, naturaliste, etc.).
Exemple: "Naya détecte une forte intelligence spatiale et créative dans cette magnifique construction !"
NE mets PAS de guillemets autour de ta réponse.`;
    
    // One short sentence, capped at 150 chars below — 4000 was ~25x more
    // budget than this could ever use.
    const tag = await callClaude(prompt, false, data.imageUrl, 200);
    return tag.trim().slice(0, 150); // safety cap
  });
