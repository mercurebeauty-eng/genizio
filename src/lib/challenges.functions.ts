import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VALID_TALENT_KEYS, TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { normalizeChildInterests } from "@/lib/interest-migration";
import { getChildAccessStatus } from "@/lib/child-access";
import { assertChildActor } from "@/lib/child-actor";
import {
  formatTimePressureNote,
  resolveTimeLimitMinutes,
  type TimePressure,
} from "@/lib/time-limit";
import { formatChildProfileContext } from "@/lib/profile-context";
import { getInterestHypothesesSnapshot, type InterestHypotheses } from "@/lib/interest-confidence";
import { z } from "zod";

import {
  GradeLevel,
  AcademicSubject,
  BehavioralDriver,
  GRADE_LEVEL_METADATA,
  DRIVER_FUSION_GUIDANCE,
  CURRICULUM_TOPICS,
  ACADEMIC_SUBJECT_LABELS,
  calculateZPADifficulty,
  findCurriculumTopic,
} from "@/lib/academic-homework.functions";

// ============================================================================
// CONSTITUTION & PERSONA NAYA — module pur de prompts partagés (chantier 1
// « Naya 3.0 »). Ces constantes vivaient historiquement ici, dispersées dans les
// 16 sites d'appel IA (copies collées qui dérivaient, cf. genizio-decisions) ;
// elles sont désormais centralisées dans src/lib/naya-prompts.ts. Ce fichier
// importe (pour son usage interne) et ré-exporte telles quelles — les importeurs
// existants (hypotheses.functions.ts, recommendations.functions.ts,
// admin-os.functions.ts, tests…) ne changent pas d'un seul caractère.
// ============================================================================
import {
  GENIZIO_PRINCIPLES,
  SAFETY_INSTRUCTION,
  PROOF_MODE_INSTRUCTION,
  ACADEMIC_REFERENTIAL_INSTRUCTION,
  ACADEMIC_SECRET_INSTRUCTION,
  AGE_DEVELOPMENT_GUIDANCE,
  MATERIAL_TAGS_INSTRUCTION,
  INTELLIGENCES_FIELD_INSTRUCTION,
  TRAIT_SUBFORM_INSTRUCTION,
  STEPS_INSTRUCTION,
  buildAvoidRepeatsInstruction,
  NAYA_SYSTEM_PROMPT,
  NAYA_SYSTEM_PROMPT_JSON,
  buildChallengePrompt,
  buildSingleChallengePrompt,
  buildHomeworkPrompt,
} from "@/lib/naya-prompts";

export {
  GENIZIO_PRINCIPLES,
  SAFETY_INSTRUCTION,
  PROOF_MODE_INSTRUCTION,
  ACADEMIC_REFERENTIAL_INSTRUCTION,
  ACADEMIC_SECRET_INSTRUCTION,
  AGE_DEVELOPMENT_GUIDANCE,
  MATERIAL_TAGS_INSTRUCTION,
  INTELLIGENCES_FIELD_INSTRUCTION,
  TRAIT_SUBFORM_INSTRUCTION,
  STEPS_INSTRUCTION,
} from "@/lib/naya-prompts";

// « Le Loup de Naya » (chantier 2, Naya 3.0) : vérification sémantique shadow de
// chaque génération. Import statique sûr — naya-verifier ne référence ce module
// que par import dynamique dans les corps de fonctions (pas de cycle ES au char-
// gement). Le Loup est strictement non-bloquant : jamais de throw vers l'appelant.
import { verifyAndLog } from "@/lib/naya-verifier.functions";

// Domaines couverts par le référentiel académique (cf. genizio-decisions #39). "creative"
// exclue volontairement (développement non linéaire par âge, cf. ACADEMIC_REFERENTIAL_INSTRUCTION
// ci-dessous) — ne jamais l'ajouter ici sans revoir le mécanisme de détection d'écart.
export const ACADEMIC_DOMAINS = [
  "mathematiques",
  "langage",
  "sciences",
  "corporelle",
  "sociale",
  "emotionnelle",
  "entrepreneuriale",
  "artisanale",
  "spatiale",
] as const;

// Déplacée depuis hypotheses.functions.ts (2026-07-22) — utilisée maintenant aussi
// par computeProgressionTargets ci-dessous, source unique plutôt qu'une copie par
// fichier consommateur (même remède que les fragments de prompt partagés).
export const ACADEMIC_DOMAIN_LABELS: Record<string, string> = {
  mathematiques: "mathématiques",
  langage: "langage",
  sciences: "sciences",
  corporelle: "motricité/sport",
  sociale: "compétences sociales",
  emotionnelle: "gestion des émotions",
  entrepreneuriale: "esprit d'initiative",
  artisanale: "habileté manuelle",
  spatiale: "repérage dans l'espace",
};

export const ChallengeSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  steps: z.array(z.string()),
  materials: z.array(z.string()),
  material_tags: z.array(z.string()).optional(),
  pedagogical_context: z.string().nullable().optional(),
  intelligences: z.array(z.string()).optional(),
  trait_subform: z.string().nullable().optional(),
  requires_supervision: z.boolean().default(false),
  supervision_warning: z.string().nullable().optional(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).optional(),
  proof_mode: z.enum(["photo", "declarative"]).optional(),
  proof_target: z.object({ metric: z.string(), value: z.number() }).nullable().optional(),
  declarative_award: z.record(z.string(), z.number()).nullable().optional(),
  academic_domain: z.enum(ACADEMIC_DOMAINS).nullable().optional(),
  academic_level_age: z.number().nullable().optional(),
  academic_reference_note: z.string().nullable().optional(),
  academic_subject: z
    .enum(["maths", "francais", "sciences", "histoire_geo", "anglais"])
    .nullable()
    .optional(),
  academic_grade_level: z
    .enum(["CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"])
    .nullable()
    .optional(),
  homework_instruction: z.string().nullable().optional(),
  behavioral_driver: z
    .enum(["deconstruire", "schematiser", "simuler", "enqueter", "optimiser"])
    .nullable()
    .optional(),
  zpa_level: z.number().int().min(1).max(5).nullable().optional(),
  academic_secret: z.string().nullable().optional(),
  // Défis-projets (2026-08-12, analyse §27-28) : kind (micro/projet) + niveau de
  // guidage 1-5 — le filet déterministe resolveKind/resolveGuidanceLevel borne tout.
  kind: z.enum(["micro", "projet"]).optional(),
  guidance_level: z.number().int().min(1).max(5).optional(),
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
        await supabaseAdmin
          .from("material_suggestions")
          .insert({ tag, sample_challenge_title: sample });
      }
    }
  } catch (err) {
    console.error("trackMaterialSuggestions failed (non-fatal):", err);
  }
}

// Exportée pour que l'aperçu de défi (profiles.index.tsx) affiche le vrai gain XP au lieu
// d'un "+180 XP" en dur qui ne correspondait à la formule réelle pour aucun âge.
export function calculateXPGain(age: number): number {
  // L'XP gagnée diminue à mesure que l'enfant grandit, rendant les niveaux
  // plus exigeants sans toucher au palier mathématique (500) du frontend.
  // ex: 4 ans = 190 XP, 8 ans = 130 XP, 12 ans = 70 XP
  return Math.max(50, 250 - age * 15);
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

    // Série hebdomadaire, pas quotidienne (cf. genizio-decisions) : le rythme réel du produit
    // est "un défi par semaine" (défi terrain de 30-60min, pas un exercice de 2 minutes) —
    // une série à fenêtre de 24h ne pouvait mathématiquement pas survivre à ce rythme et
    // n'avait aucun rappel pour la sauver. Même mécanique qu'avant (fenêtre "déjà comptée" /
    // "période suivante" / "trop tard, reset"), juste étalée sur 7/14 jours au lieu de 24/48h.
    const now = new Date();
    let newStreak = profile.streak || 0;
    if (profile.last_activity_date) {
      const lastDate = new Date(profile.last_activity_date);
      const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 7 && diffDays < 14) newStreak += 1;
      else if (diffDays >= 14) newStreak = 1;
      // if < 7j, streak remains the same (already counted this week)
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
        last_activity_date: now.toISOString(),
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
    description:
      "Tu as mené 3 expériences. Tu observes, tu questionnes, tu comprends le monde qui t'entoure.",
  },
  Architecture: {
    title: "Bâtisseur·se en herbe",
    description:
      "Tu as terminé 3 défis de construction. Tu penses déjà comme quelqu'un qui bâtit des choses solides.",
  },
  Artisanat: {
    title: "Artisan·e en herbe",
    description:
      "Tu as fabriqué 3 objets de tes propres mains. Le geste précis devient une seconde nature.",
  },
  Agriculture: {
    title: "Cultivateur·rice en herbe",
    description:
      "Tu as mené 3 défis liés à la nature et au vivant. Tu sais prendre soin de ce qui pousse.",
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
    description:
      "Tu as mené 3 projets à la manière d'un vrai petit commerce. Tu sais transformer une idée en réalité.",
  },
  Arts: {
    title: "Artiste en herbe",
    description: "Tu as créé 3 œuvres. Ton regard sur le monde devient de plus en plus unique.",
  },
  Langues: {
    title: "Linguiste en herbe",
    description:
      "Tu as relevé 3 défis de langue et d'écriture. Les mots deviennent un vrai terrain de jeu.",
  },
  "Tech & IA": {
    title: "Ingénieur·e numérique en herbe",
    description:
      "Tu as relevé 3 défis de logique et de technologie. Tu commences à penser comme la machine — puis mieux qu'elle.",
  },
};

async function checkAndAwardBadge(
  supabaseClient: any,
  childId: string,
  domain: string | null | undefined,
) {
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

export const DOMAINS = [
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
// Exportée pour le fallback EXPLORATION de recommendChallengesForChild (recommendations.functions.ts) —
// même logique déterministe que la génération en lot, réutilisée plutôt que dupliquée.
export function getLeastExploredTalentLabels(
  talents: Record<string, number> | null | undefined,
  count = 2,
): string[] {
  const raw = talents ?? {};
  return (
    VALID_TALENT_KEYS.map((key) => ({ key, score: raw[key] ?? 0 }))
      // Shuffle before the (stable) sort so ties — e.g. a brand-new profile
      // where every score defaults to 0 — don't always resolve to the same
      // two talents in VALID_TALENT_KEYS' declared order.
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => a.score - b.score)
      .slice(0, count)
      .map(({ key }) => TALENT_KEY_LABELS[key])
  );
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
      under12:
        "Cette activité implique du feu : un adulte doit être présent et superviser directement toute la manipulation.",
      from12:
        "Mesures de sécurité à prendre : utilise le briquet ou les allumettes dans un endroit dégagé, loin de tissus ou de papier, garde de l'eau ou un linge humide à proximité, et éteins bien la flamme après usage. Informe un parent avant de commencer.",
    },
  },
  {
    pattern: wordBoundaryPattern("couteau|cutter|lame|ciseaux pointus"),
    note: {
      under12:
        "Cette activité implique un objet tranchant : un adulte doit couper ou superviser directement cette étape.",
      from12:
        "Mesures de sécurité à prendre : coupe toujours en éloignant tes doigts de la lame, travaille sur une surface stable, et range l'outil après usage.",
    },
  },
  {
    pattern: wordBoundaryPattern("produits? chimiques?|eau de javel|acide|soude caustique"),
    note: {
      under12:
        "Cette activité implique des produits chimiques : un adulte doit manipuler ou superviser directement cette étape.",
      from12:
        "Mesures de sécurité à prendre : manipule ces produits dans un endroit ventilé, évite tout contact avec les yeux ou la peau, et lave-toi les mains après usage.",
    },
  },
  {
    pattern: wordBoundaryPattern("électricité|prise électrique|courant électrique|fils? dénudés?"),
    note: {
      under12:
        "Cette activité implique de l'électricité : un adulte doit superviser directement cette étape.",
      from12:
        "Mesures de sécurité à prendre : ne touche jamais une prise ou un fil dénudé avec les mains mouillées, et débranche l'appareil avant toute manipulation.",
    },
  },
  {
    pattern: wordBoundaryPattern(
      "cuisinière|plaque de cuisson|plaque chauffante|four chaud|eau bouillante|huile chaude|casserole|poêle",
    ),
    note: {
      under12:
        "Cette activité implique une source de chaleur en cuisine (cuisinière, four, eau ou huile chaude) : un adulte doit être présent et superviser directement toute la manipulation.",
      from12:
        "Mesures de sécurité à prendre : ne laisse jamais une casserole ou une poêle sans surveillance sur le feu, utilise des maniques pour les ustensiles chauds, éloigne les manches des bords de la plaque, et informe un parent avant de commencer.",
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
      "piscine|rivière|fleuve|lac|étang|mer|hauteur|toit|échelle|grimp\\p{L}*|escalad\\p{L}*|falaise|circulation|serpent|scorpion|animal sauvage",
    ),
    note: {
      under12:
        "Cette activité se déroule dans un environnement extérieur avec un risque réel (eau profonde, hauteur, circulation ou animal) : un adulte doit être présent et superviser directement toute la manipulation.",
      from12:
        "Mesures de sécurité à prendre : reste dans une zone connue de tes parents, ne t'approche jamais seul d'un point d'eau profond, d'une hauteur ou d'une route très fréquentée, et informe un parent avant de commencer.",
    },
  },
];

function applySafetyNet<
  T extends {
    description: string;
    steps: string[];
    materials: string[];
    requires_supervision?: boolean | null;
    supervision_warning?: string | null;
  },
>(
  challenge: T,
  age: number,
): { requires_supervision: boolean; supervision_warning: string | null } {
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
  challengeTitle: string,
): "facile" | "moyen" | "difficile" {
  if (difficulty === "facile" || difficulty === "moyen" || difficulty === "difficile") {
    return difficulty;
  }
  console.warn(
    `[challenges] "difficulty" manquant ou invalide pour "${challengeTitle}" — défaut "moyen" appliqué.`,
  );
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
  challengeTitle: string,
): {
  proof_mode: "photo" | "declarative";
  proof_target: { metric: string; value: number } | null;
  declarative_award: Record<string, number> | null;
} {
  if (proofMode !== "declarative") {
    return { proof_mode: "photo", proof_target: null, declarative_award: null };
  }

  const metric =
    typeof proofTarget?.metric === "string" ? proofTarget.metric.trim().slice(0, 60) : "";
  // Cible bornée (review 2026-08-12, P2) : une valeur flottante ou hallucinée
  // (ex. 1e9) rendrait le défi déclaratif infranchissable — clamp [1, 1000]
  // unités (même esprit que declarative_award clampé [1,3]).
  const value =
    typeof proofTarget?.value === "number"
      ? Math.min(1000, Math.max(1, Math.round(proofTarget.value)))
      : NaN;

  const award: Record<string, number> = {};
  const validTalentKeys = new Set(VALID_TALENT_KEYS);
  for (const [key, points] of Object.entries(declarativeAward ?? {})) {
    if (typeof points === "number" && validTalentKeys.has(key)) {
      award[key] = Math.max(1, Math.min(3, Math.round(points)));
    }
  }

  if (!metric || !Number.isFinite(value) || value <= 0 || Object.keys(award).length === 0) {
    console.warn(
      `[challenges] "proof_mode: declarative" incohérent pour "${challengeTitle}" — repli sur "photo".`,
    );
    return { proof_mode: "photo", proof_target: null, declarative_award: null };
  }

  return { proof_mode: "declarative", proof_target: { metric, value }, declarative_award: award };
}

// target_intelligences était rempli directement depuis le champ libre "intelligences"
// du JSON généré par l'IA (2026-07-22 et avant) — jamais contraint aux 9 clés
// réelles (VALID_TALENT_KEYS), donc jamais exploitable comme donnée (ex: "Créativité"
// au lieu de "creative"). Même remède que declarative_award ci-dessus : filtrer
// plutôt que faire confiance. Les défis déjà complétés ont déjà la vraie valeur
// (validateChallengeProof/submitDeclarativeProof écrasent ce champ avec les
// intelligences RÉELLEMENT démontrées à la validation) — ce filtre ne change donc
// que les défis pas encore complétés, pour que le champ soit exploitable dès la
// création (cf. computeProgressionTargets, qui ne lit que les défis complétés).
function resolveTargetIntelligences(intelligences: string[] | null | undefined): string[] {
  const validTalentKeys = new Set(VALID_TALENT_KEYS);
  return (intelligences ?? []).filter((k) => typeof k === "string" && validTalentKeys.has(k));
}

// Même philosophie que resolveTargetIntelligences : ne jamais faire confiance à la seule
// auto-discipline du modèle. N'accepte un trait_subform QUE si son domaine parent (cf.
// TALENT_SUBFORMS) fait déjà partie des intelligences résolues de ce défi (pas de signal
// fantôme sur un défi qui ne sollicite pas ce talent, et pas de sous-forme empruntée à un
// autre domaine que celui réellement choisi) — sinon null.
function resolveTraitSubform(
  resolvedIntelligences: string[],
  subform: string | null | undefined,
): string | null {
  if (!subform) return null;
  return resolvedIntelligences.some((domain) => TALENT_SUBFORMS[domain]?.includes(subform))
    ? subform
    : null;
}

// Backstop pour l'étiquetage du référentiel académique (cf. genizio-decisions #38) : un âge
// incohérent (hors [3,21], absent, ou domaine invalide) redevient simplement "pas de
// signal" — même philosophie que resolveProofMode, ne jamais faire confiance à la seule
// auto-discipline du modèle. Contrairement à proof_mode, il n'y a pas de "valeur par défaut
// sûre" ici : l'absence de signal (les deux champs à null) est elle-même le repli sûr, un
// défi non académique ou mal étiqueté ne doit simplement pas compter dans la détection d'écart.
function resolveAcademicLevel(
  domain: string | null | undefined,
  levelAge: number | null | undefined,
  referenceNote: string | null | undefined,
  challengeTitle: string,
): {
  academic_domain: (typeof ACADEMIC_DOMAINS)[number] | null;
  academic_level_age: number | null;
  academic_reference_note: string | null;
} {
  const validDomain = (ACADEMIC_DOMAINS as readonly string[]).includes(domain ?? "")
    ? (domain as (typeof ACADEMIC_DOMAINS)[number])
    : null;
  const validAge =
    typeof levelAge === "number" && Number.isFinite(levelAge) && levelAge >= 3 && levelAge <= 21
      ? Math.round(levelAge)
      : null;

  if (!validDomain || validAge === null) {
    if (domain || levelAge) {
      console.warn(
        `[challenges] étiquetage du référentiel académique incohérent pour "${challengeTitle}" — ignoré.`,
      );
    }
    return { academic_domain: null, academic_level_age: null, academic_reference_note: null };
  }

  // La citation est un bonus de traçabilité (décision #39), pas une condition de validité —
  // un domaine/âge cohérents sans citation restent utilisables pour la détection d'écart.
  const note =
    typeof referenceNote === "string" && referenceNote.trim()
      ? referenceNote.trim().slice(0, 200)
      : null;

  return {
    academic_domain: validDomain,
    academic_level_age: validAge,
    academic_reference_note: note,
  };
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

// Défis-projets (2026-08-12, analyse §27) : un « projet » n'est accepté que si l'IA
// le demande ET que le défi a assez d'étapes pour être un vrai projet (construire,
// concevoir, planifier → résultat observable) — anti-hallucination, fallback micro.
export function resolveKind(
  iaKind: string | null | undefined,
  steps: string[],
  title: string,
): "micro" | "projet" {
  if (iaKind === "projet" && steps.length >= 3) return "projet";
  return "micro";
}

// Autonomie progressive (analyse §28) : plus l'enfant complète dans un domaine,
// moins le système fait le travail à sa place — le niveau de guidage demandé par
// l'IA (1 = pas-à-pas détaillé → 5 = « voici l'objectif, trouve ta méthode ») est
// réduit d'un cran tous les 4 défis complétés dans le domaine. Borné 1-5.
export function resolveGuidanceLevel(
  iaLevel: number | null | undefined,
  completedInDomain = 0,
): number {
  const clamped = Math.min(5, Math.max(1, Math.round(iaLevel ?? 3)));
  return Math.max(1, clamped - Math.floor(completedInDomain / 4));
}

export function finalizeChallenge<
  T extends {
    title: string;
    description: string;
    steps: string[];
    materials: string[];
    material_tags?: string[] | null;
    intelligences?: string[] | null;
    trait_subform?: string | null;
    requires_supervision?: boolean | null;
    supervision_warning?: string | null;
    difficulty?: string | null;
    proof_mode?: string | null;
    proof_target?: { metric?: unknown; value?: unknown } | null;
    declarative_award?: Record<string, unknown> | null;
    academic_domain?: string | null;
    academic_level_age?: number | null;
    academic_reference_note?: string | null;
    kind?: string | null;
    guidance_level?: number | null;
  },
>(c: T, age: number, context?: { completedInDomain?: number }) {
  const safety = applySafetyNet(c, age);
  const proof = resolveProofMode(c.proof_mode, c.proof_target, c.declarative_award, c.title);
  const academic = resolveAcademicLevel(
    c.academic_domain,
    c.academic_level_age,
    c.academic_reference_note,
    c.title,
  );
  const resolvedIntelligences = resolveTargetIntelligences(c.intelligences);
  return {
    title: c.title.slice(0, 120),
    material_tags: c.material_tags ?? [],
    target_intelligences: resolvedIntelligences,
    trait_subform: resolveTraitSubform(resolvedIntelligences, c.trait_subform),
    difficulty: resolveDifficulty(c.difficulty, c.title),
    requires_supervision: safety.requires_supervision,
    supervision_warning: safety.supervision_warning,
    proof_mode: proof.proof_mode,
    proof_target: proof.proof_target,
    declarative_award: proof.declarative_award,
    academic_domain: academic.academic_domain,
    academic_level_age: academic.academic_level_age,
    academic_reference_note: academic.academic_reference_note,
    kind: resolveKind(c.kind, c.steps, c.title),
    guidance_level: resolveGuidanceLevel(c.guidance_level, context?.completedInDomain ?? 0),
  };
}

/**
 * Helper mapping child.interests tags (from INTERESTS_BY_TALENT in src/components/profiles/shared.ts)
 * into rich cognitive posture descriptors and behavioral drivers for AI prompt payloads.
 */
export function formatChildInterestsPayload(
  interests?: string[] | null,
  hypotheses?: InterestHypotheses | null,
): string {
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

  // Décision 2026-08-05 : avec un snapshot de confiance, les intérêts déclarés sont des
  // HYPOTHÈSES DE TRAVAIL — les confirmés sont crédités, les non testés marqués comme à
  // valider en priorité, les écartés retirés du prompt (l'expérience a montré que ce
  // n'est pas un moteur d'engagement pour cet enfant). Sans snapshot : comportement
  // historique inchangé (fallback ci-dessous).
  if (hypotheses) {
    const influencePct = Math.round(hypotheses.parentInfluence * 100);
    const lines: string[] = [
      `Déclaration du parent, hypothèse de travail — l'expérience réelle prime (influence parentale actuelle : ${influencePct} %).`,
    ];
    const refutedNotes: string[] = [];

    for (const tag of normalized) {
      const label = tagMap.get(tag) ?? "Levier d'action";
      const h = hypotheses.byTag[tag];
      if (h?.status === "refuted") {
        refutedNotes.push(
          `Intérêt déclaré non confirmé : "${tag}" — ne pas l'utiliser comme moteur d'engagement, explorer d'autres pistes.`,
        );
        continue;
      }
      if (h?.status === "confirmed") {
        lines.push(`- [${label}] "${tag}" — confirmé par l'expérience`);
      } else if (h?.status === "untested") {
        lines.push(
          `- [${label}] "${tag}" — hypothèse du parent à confirmer (à tester en priorité)`,
        );
      } else {
        lines.push(`- [${label}] "${tag}"`);
      }
    }

    const active =
      lines.length > 1
        ? lines.join("\n")
        : `- (aucun levier déclaré encore crédité${hypotheses.refutedTags.length > 0 ? " — tous les leviers déclarés ont été écartés par l'expérience" : ""})`;
    const refutedBlock = refutedNotes.length > 0 ? `\n${refutedNotes.join("\n")}` : "";
    return `${active}${refutedBlock}`;
  }

  return normalized
    .map((tag) => {
      const label = tagMap.get(tag);
      return label ? `- [${label}] "${tag}"` : `- [Levier d'action] "${tag}"`;
    })
    .join("\n");
}

export type ProgressionTarget = {
  domain: string;
  lastLevelAge: number; // backward compatibility
  targetLevelAge: number; // backward compatibility
  cause: string | null;
  // New fields from DomainCapabilityState
  stableLevelAge: number;
  exploratoryLevelAge: number;
  peakLevelAge: number;
  confidence: number;
  evidenceCount: number;
  hasUnconsolidatedCollectivePeak?: boolean;
};

import { calibrateDomainCapability, formatDynamicCapabilityInstruction, mapDiscoveryDifficultyToLevelAge, type ObservationEvidence } from "./dynamic-capability";
import { mapDiscoveryToAcademicDomain } from "./dynamic-capability";

export async function computeProgressionTargets(
  supabase: any,
  childId: string,
): Promise<ProgressionTarget[]> {
  // 1. On charge l'enfant pour avoir son âge chronologique
  const { data: childProfile } = await supabase
    .from("child_profiles")
    .select("birth_date")
    .eq("id", childId)
    .single();

  let childAge = 6; // par défaut
  if (childProfile?.birth_date) {
    const today = new Date();
    const birthDate = new Date(childProfile.birth_date);
    childAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      childAge--;
    }
  }

  const [{ data: pastChallenges }, { data: discoveryTraces }, { data: openCycle }] = await Promise.all([
    supabase
      .from("challenges")
      .select("academic_domain, academic_level_age, status, completed_at, presentation_mode")
      .eq("child_id", childId)
      .not("academic_domain", "is", null)
      .not("academic_level_age", "is", null)
      .order("completed_at", { ascending: true }) // Tri croissant pour rejouer l'historique
      .limit(200),
    supabase
      .from("discovery_traces")
      .select("domain, perceived_difficulty, autonomy_level, attempts_count, outcome_status, proof_image_url, naya_dialogue, created_at, source_type, ai_behavioral_analysis")
      .eq("child_id", childId)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("hypothesis_cycles")
      .select("hypotheses, trigger_domain")
      .eq("child_id", childId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const evidencesByDomain = new Map<string, ObservationEvidence[]>();

  // Injection des défis dans le moteur de capacité
  for (const c of pastChallenges ?? []) {
    if (!c.academic_domain || typeof c.academic_level_age !== "number") continue;
    
    // Convertir les statuts des défis en outcome_status pour le moteur ZPD
    let outcomeStatus: ObservationEvidence["outcomeStatus"] = "failed"; // default
    if (c.status === "completed") outcomeStatus = "completed";
    else if (c.status === "abandoned" || c.status === "failed" || c.status === "not_completed") outcomeStatus = "failed";
    else continue; // on ignore les todo/in_progress
    
    // Le poids du défi est très élevé car il a été validé (par le parent ou vérifié)
    const ev: ObservationEvidence = {
      source: "challenge",
      domain: c.academic_domain,
      demonstratedLevelAge: c.academic_level_age,
      autonomyWeight: 1.0,      // Conserver une pondération neutre haute
      perseveranceWeight: 1.0,
      metacognitiveWeight: 1.0,
      proofWeight: 1.0,
      outcomeStatus,
      occurredAt: c.completed_at || new Date().toISOString(),
    };

    if (!evidencesByDomain.has(c.academic_domain)) evidencesByDomain.set(c.academic_domain, []);
    evidencesByDomain.get(c.academic_domain)!.push(ev);
  }

  // Injection des découvertes (capteur libre)
  for (const d of discoveryTraces ?? []) {
    const acaDomain = mapDiscoveryToAcademicDomain(d.domain);
    const levelAge = mapDiscoveryDifficultyToLevelAge(d.perceived_difficulty, childAge);
    
    let autonomyW = 0.5;
    if (d.autonomy_level === "totalement_seul") autonomyW = 1.0;
    else if (d.autonomy_level === "aide_ponctuelle") autonomyW = 0.7;
    else if (d.autonomy_level === "guide_pas_a_pas") autonomyW = 0.4;
    
    const persW = d.attempts_count >= 2 ? 1.0 : 0.7;
    
    // Évaluation métacognitive heuristique : si naya_dialogue a > 2 clés remplies, on considère 1.0, sinon 0.6
    let metaW = 0.6;
    if (d.naya_dialogue && typeof d.naya_dialogue === "object") {
      const keysCount = Object.keys(d.naya_dialogue).length;
      if (keysCount >= 2) metaW = 1.0;
      else if (keysCount === 1) metaW = 0.8;
    }
    
    const proofW = d.proof_image_url ? 1.0 : 0.7;

    let outcomeStatus: ObservationEvidence["outcomeStatus"] = "functional";
    if (d.outcome_status === "partiel") outcomeStatus = "partial";
    else if (d.outcome_status === "bloque") outcomeStatus = "blocked";
    else if (d.outcome_status === "abandonne") outcomeStatus = "failed";

    let ev: ObservationEvidence;
    if (d.source_type === "fablab_marathon" || d.source_type === "projet_collectif") {
      const collectivePayload = d.ai_behavioral_analysis as any;
      let alpha = 0.6; 
      if (collectivePayload?.implication === "pilier") alpha = 0.85;
      else if (collectivePayload?.implication === "apprenti") alpha = 0.35;
      else if (collectivePayload?.implication === "observateur") alpha = 0.15;

      const baseLevelAge = mapDiscoveryDifficultyToLevelAge(d.perceived_difficulty, childAge);
      let demonstratedLevelAge = childAge;
      if (baseLevelAge > childAge) {
        demonstratedLevelAge = childAge + alpha * (baseLevelAge - childAge);
      } else {
        demonstratedLevelAge = baseLevelAge;
      }

      let autoW = 0.5;
      let persW2 = 0.5;
      let metaW2 = 0.5;
      if (collectivePayload?.supervisorTags) {
         for (const t of collectivePayload.supervisorTags) {
           const shift = t.impact === "positive" ? 0.2 : t.impact === "negative" ? -0.2 : 0;
           if (t.dimension === "autonomie") autoW = Math.min(1.0, Math.max(0.0, autoW + shift));
           if (t.dimension === "perseverance") persW2 = Math.min(1.0, Math.max(0.0, persW2 + shift));
           if (t.dimension === "collaboration") metaW2 = Math.min(1.0, Math.max(0.0, metaW2 + shift));
         }
         if (collectivePayload.implication === "pilier" && autoW === 0.5) autoW = 0.8;
      }

      ev = {
        source: "collective_project",
        domain: acaDomain,
        demonstratedLevelAge: Number(demonstratedLevelAge.toFixed(2)),
        autonomyWeight: autoW,
        perseveranceWeight: persW2,
        metacognitiveWeight: metaW2,
        proofWeight: proofW,
        outcomeStatus,
        occurredAt: d.created_at || new Date().toISOString(),
      };
    } else {
      ev = {
        source: "discovery_trace",
        domain: acaDomain,
        demonstratedLevelAge: levelAge,
        autonomyWeight: autonomyW,
        perseveranceWeight: persW,
        metacognitiveWeight: metaW,
        proofWeight: proofW,
        outcomeStatus,
        occurredAt: d.created_at || new Date().toISOString(),
      };
    }

    if (!evidencesByDomain.has(acaDomain)) evidencesByDomain.set(acaDomain, []);
    evidencesByDomain.get(acaDomain)!.push(ev);
  }

  const hypotheses = (openCycle?.hypotheses as { cause: string; current_probability: number }[] | null) || [];
  const topCause = hypotheses[0]?.cause;
  const causeDomain = openCycle?.trigger_domain as string | undefined;

  // Calcul du Tri-Niveau (N_stable, N_explore, N_peak) pour tous les domaines avec de la data
  const targets: ProgressionTarget[] = [];
  for (const [domain, evidences] of evidencesByDomain.entries()) {
    const isTrigger = causeDomain === domain;
    const activeCause = isTrigger && topCause ? topCause : null;
    
    const cap = calibrateDomainCapability(childAge, domain, evidences, activeCause);
    
    // Remplissage rétrocompatible pour `ProgressionTarget`
    targets.push({
      domain,
      lastLevelAge: cap.stableLevelAge,
      targetLevelAge: cap.exploratoryLevelAge,
      cause: activeCause,
      stableLevelAge: cap.stableLevelAge,
      exploratoryLevelAge: cap.exploratoryLevelAge,
      peakLevelAge: cap.peakLevelAge,
      confidence: cap.confidence,
      evidenceCount: cap.evidenceCount,
      hasUnconsolidatedCollectivePeak: cap.hasUnconsolidatedCollectivePeak,
    });
  }

  return targets;
}

export function formatProgressionInstruction(targets: ProgressionTarget[]): string {
  // L'ancienne instruction +1 est remplacée par le formateur dynamique ZPD !
  return formatDynamicCapabilityInstruction(targets);
}

// — GENIZIO_PRINCIPLES, SAFETY_INSTRUCTION, PROOF_MODE_INSTRUCTION,
// ACADEMIC_REFERENTIAL_INSTRUCTION, ACADEMIC_SECRET_INSTRUCTION,
// AGE_DEVELOPMENT_GUIDANCE, MATERIAL_TAGS_INSTRUCTION, INTELLIGENCES_FIELD_INSTRUCTION,
// TRAIT_SUBFORM_INSTRUCTION, STEPS_INSTRUCTION et buildAvoidRepeatsInstruction sont
// désormais centralisées dans src/lib/naya-prompts.ts (chantier 1 « Naya 3.0 »),
// importées ci-dessus et ré-exportées telles quelles. Historiquement dupliquées dans
// chaque prompt de génération, elles avaient déjà dérivé à plusieurs reprises
// (cf. genizio-decisions #35, commentaires d'origine supprimés ici).

// V1 "sous-formes de talent" (2026-07-22, cf. genizio-decisions #40, étendu aux 9 domaines le
// même jour) : savoir qu'un défi sollicite l'intelligence "corporelle" ne dit rien de la
// sous-forme physique où le potentiel s'exprime le mieux (endurance ≠ explosivité ≠
// coordination) — même logique pour les 8 autres intelligences. Pilote initialement restreint à
// corporelle le temps de valider le mécanisme en direct (défi "30 secondes de sauts" →
// trait_subform: "explosivite", confirmé) ; étendu aux 8 autres dès la validation obtenue,
// aucune raison technique de faire autrement une fois le garde-fou éprouvé — contrairement au
// référentiel académique (décision #39), ce contenu n'est pas une recherche sourcée mais une
// construction raisonnable de l'agent, donc l'argument "aller lentement pour sourcer chaque
// domaine" ne s'applique pas ici. Dépend de INTELLIGENCES_FIELD_INSTRUCTION (une sous-forme
// n'est acceptée que si son intelligence parente est déjà choisie), donc placée juste après.
export const TALENT_SUBFORMS: Record<string, readonly string[]> = {
  corporelle: [
    "endurance",
    "explosivite",
    "coordination_fine",
    "coordination_collective",
    "precision",
  ],
  spatial: ["orientation", "visualisation_3d", "representation_graphique", "organisation_espace"],
  sociale: ["leadership", "mediation", "collaboration", "ecoute_empathique"],
  entrepreneuriale: ["negociation", "prise_de_risque", "sens_du_client", "gestion_ressources"],
  creative: ["invention_visuelle", "narration", "improvisation", "detournement"],
  artisanale: ["dexterite_fine", "assemblage", "reparation", "finition_esthetique"],
  emotionnelle: ["autoregulation", "expression", "empathie", "resilience"],
  logico_mathematique: [
    "raisonnement_abstrait",
    "calcul",
    "resolution_problemes",
    "reconnaissance_motifs",
  ],
  linguistique: ["expression_ecrite", "expression_orale", "argumentation", "memorisation_lexicale"],
};

export const TALENT_SUBFORM_LABELS: Record<string, string> = {
  endurance: "Endurance",
  explosivite: "Explosivité",
  coordination_fine: "Coordination fine",
  coordination_collective: "Coordination collective",
  precision: "Précision",
  orientation: "Orientation",
  visualisation_3d: "Visualisation 3D",
  representation_graphique: "Représentation graphique",
  organisation_espace: "Organisation de l'espace",
  leadership: "Leadership",
  mediation: "Médiation",
  collaboration: "Collaboration",
  ecoute_empathique: "Écoute empathique",
  negociation: "Négociation",
  prise_de_risque: "Prise de risque",
  sens_du_client: "Sens du client",
  gestion_ressources: "Gestion des ressources",
  invention_visuelle: "Invention visuelle",
  narration: "Narration",
  improvisation: "Improvisation",
  detournement: "Détournement",
  dexterite_fine: "Dextérité fine",
  assemblage: "Assemblage",
  reparation: "Réparation",
  finition_esthetique: "Finition esthétique",
  autoregulation: "Autorégulation",
  expression: "Expression émotionnelle",
  empathie: "Empathie",
  resilience: "Résilience",
  raisonnement_abstrait: "Raisonnement abstrait",
  calcul: "Calcul",
  resolution_problemes: "Résolution de problèmes",
  reconnaissance_motifs: "Reconnaissance de motifs",
  expression_ecrite: "Expression écrite",
  expression_orale: "Expression orale",
  argumentation: "Argumentation",
  memorisation_lexicale: "Mémorisation lexicale",
};

// Lookup inverse (sous-forme → domaine parent) — construit une fois, utilisé par l'UI pour
// grouper les défis complétés par domaine sans dupliquer la structure de TALENT_SUBFORMS.
export const TALENT_SUBFORM_TO_DOMAIN: Record<string, string> = Object.fromEntries(
  Object.entries(TALENT_SUBFORMS).flatMap(([domain, forms]) => forms.map((f) => [f, domain])),
);
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
  let trimmed = (raw ?? "").trim();
  if (!trimmed) return trimmed;

  // 0. Si le modèle génère son raisonnement dans le texte brut (ex: DeepSeek ou un proxy),
  // on retire tout le bloc <think>...</think> avant de chercher le JSON, car il
  // peut contenir des accolades qui cassent le RegExp ci-dessous.
  trimmed = trimmed.replace(/<think>[\s\S]*?<\/think>\s*/gi, "");

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
//
// "deepseek-chat" ci-dessous est un nom LOGIQUE interne (résolu vers le modèle
// réel dans callDeepSeekText, cf. son propre commentaire) — pas le nom d'API
// littéral, qui lui est déprécié le 2026-07-24 en faveur de deepseek-v4-flash.
const DEEPSEEK_CHAT_MODEL = "deepseek-chat";

async function callAnthropicVision(
  prompt: string,
  jsonMode: boolean,
  imageUrl: string | undefined,
  imageData: { base64: string; mediaType: string } | undefined,
  maxOutputTokens: number,
  maxRetries: number,
  model: string,
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

  // Identité experte Naya branchée comme vrai rôle system (chantier 1 « Naya 3.0 ») :
  // l'ancien placeholder « Tu es un assistant IA précis… » ne portait aucune expertise.
  // La constitution dense (GENIZIO_PRINCIPLES etc.) reste dans le contexte utilisateur
  // au lancement (modèle léger DeepSeek v4-flash). Côté Anthropic, le bloc system est
  // marqué cache_control ephemeral (chantier 4, C4.2) : la constante NAYA_SYSTEM_PROMPT_JSON
  // étant byte-identique à chaque appel vision, ce préfixe est mis en cache de contexte
  // Anthropic (tarif réduit sur les appels suivants). Le mode vision non-JSON garde son
  // ancien comportement (pas de system du tout) — seule la sortie contrainte reçoit
  // l'identité et le cache.
  const systemPrompt = jsonMode ? NAYA_SYSTEM_PROMPT_JSON : undefined;
  const systemBlock = systemPrompt
    ? [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]
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
          system: systemBlock,
          messages: [
            {
              role: "user",
              content: contentBlocks,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API Error Response (Attempt ${attempt + 1}):`, errorText);

        if (response.status === 429) {
          throw new Error(
            "Quota Anthropic atteint (429). Veuillez patienter une minute avant de réessayer.",
          );
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
          textContent = textContent
            .replace(/^```[a-z]*\n/, "")
            .replace(/\n```$/, "")
            .trim();
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
      await new Promise((res) => setTimeout(res, delay));
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
  model: string,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API DeepSeek non configurée dans .env (DEEPSEEK_API_KEY)");
  }

  // Identité experte Naya en rôle system (chantier 1 « Naya 3.0 ») : remplace le
  // placeholder générique (« Tu es un assistant IA précis et utile ») par le persona
  // mentor d'éveil des talents — le modèle (deepseek-v4-flash par défaut) reçoit
  // désormais une posture et une expertise explicites en plus des règles de contenu
  // du message utilisateur. En mode JSON, NAYA_SYSTEM_PROMPT_JSON ajoute la contrainte
  // de format brut que le paramètre response_format json_object exige côté système.
  const systemPrompt = jsonMode ? NAYA_SYSTEM_PROMPT_JSON : NAYA_SYSTEM_PROMPT;

  // deepseek-chat / deepseek-reasoner sont dépréciés le 2026-07-24 15:59 UTC — on
  // traduit donc ici nos anciens noms logiques ("model" reçu du routage de
  // callClaude) vers le nouveau format plutôt que de laisser filer des alias qui
  // cesseront de fonctionner à la date de coupure. Décision produit (2026-07-22) :
  // deepseek-v4-flash (rapide/économique) reste le modèle par défaut pour tout le
  // texte à fort volume (défis, interactions utilisateur) ; le rôle de
  // raisonnement NAYA (diagnostic bayésien, seul site d'appel = generateHypotheses,
  // volume faible) monte en gamme sur deepseek-v4-pro, le modèle le plus avancé de
  // DeepSeek, cohérent avec la decision #27 ("réserver le premium quand le système
  // doit vraiment réfléchir").
  //
  // "thinking" réactivé pour le raisonnement (2026-07-22, révision same-day) : le
  // moteur bayésien alimente maintenant aussi le calcul de la cible de progression
  // académique (cf. computeProgressionTargets plus bas — la cause diagnostiquée ici
  // détermine le delta appliqué au prochain défi), un rôle plus déterminant qu'avant
  // pour la qualité perçue de l'app. Le surcoût en tokens/latence reste réel mais
  // acceptable vu le volume faible de ce site d'appel (une diagnose par écart
  // détecté, pas par défi généré).
  const isReasoning = model === "deepseek-reasoner";
  const resolvedModel = isReasoning ? "deepseek-v4-pro" : "deepseek-v4-flash";
  const thinking = isReasoning
    ? { type: "enabled" as const, reasoning_effort: "high" as const }
    : { type: "enabled" as const, reasoning_effort: "medium" as const };

  let attempt = 0;
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: maxOutputTokens,
          thinking,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          // Le nouveau v4-flash supporte json_object même en mode "thinking", tant
          // que le prompt système exige explicitement du JSON (fait ci-dessus) —
          // contrairement à l'ancien deepseek-reasoner qui refusait ce paramètre.
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepSeek API Error Response (Attempt ${attempt + 1}):`, errorText);

        if (response.status === 429) {
          throw new Error(
            "Quota DeepSeek atteint (429). Veuillez patienter une minute avant de réessayer.",
          );
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
          textContent = textContent
            .replace(/^```[a-z]*\n/, "")
            .replace(/\n```$/, "")
            .trim();
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
      await new Promise((res) => setTimeout(res, delay));
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
  modelOverride?: string,
): Promise<string> {
  const hasImage = !!(imageData || imageUrl);
  if (hasImage) {
    // DeepSeek n'a pas de vision — toute analyse d'image reste sur Claude,
    // quel que soit modelOverride (qui ne s'applique qu'au routage texte).
    return callAnthropicVision(
      prompt,
      jsonMode,
      imageUrl,
      imageData,
      maxOutputTokens,
      maxRetries,
      "claude-sonnet-5",
    );
  }
  return callDeepSeekText(
    prompt,
    jsonMode,
    maxOutputTokens,
    maxRetries,
    modelOverride ?? DEEPSEEK_CHAT_MODEL,
  );
}

// Gate "accès mensuel expiré" (décision 2026-08-05) : à l'expiration, la génération de
// NOUVEAUX défis est bloquée — le portfolio, l'historique et le passeport restent
// accessibles. child_access_periods n'a aucune policy RLS : le statut se lit donc via le
// service-role (même pattern d'import dynamique que le reste du fichier).
async function assertChildAccessActive(userId: string, childId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const access = await getChildAccessStatus(supabaseAdmin as any, userId, childId);
  if (access.kind !== "expired") return;
  throw new Error(
    access.endsAt
      ? `L'accès mensuel de cet enfant a expiré le ${new Date(access.endsAt).toLocaleDateString("fr-FR")}. Renouvelez pour générer de nouveaux défis.`
      : "L'accès de cet enfant n'est pas actif. Renouvelez pour générer de nouveaux défis.",
  );
}

const GenerateInput = z.object({
  childId: z.string().uuid(),
  count: z.number().int().min(1).max(6).default(4),
});

// Cœur partagé de la génération bulk (Mentor Copilote, décision #74) : la chaîne
// IA est identique pour le parent et le mentor — seul l'auteur change. `ownerUserId`
// EST TOUJOURS le parent (challenges.user_id reste la clé d'ownership) ; `createdByUserId`
// est le mentor quand il génère (attribution, jamais ownership). `child` est passé
// DÉJÀ chargé et autorisé (parent : ownership + assertChildAccessActive ; mentor :
// assertMentorOperator). Les lectures passent par `db` (context.supabase côté parent,
// supabaseAdmin côté mentor).
export async function generateChallengesCore(params: {
  db: any;
  child: any;
  childId: string;
  count: number;
  ownerUserId: string;
  createdByUserId?: string | null;
}) {
  const { db, child, childId, count, ownerUserId, createdByUserId } = params;

  // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
  // confiance est dérivée à la lecture (complétions vs abandons, par groupe de
  // talents). Échec → null → formatage brut, la génération ne casse jamais.
  const interestHypotheses = await getInterestHypothesesSnapshot(db as any, childId).catch(
    () => null,
  );

  // Domains repeatedly generated but never even started are a real signal
  // that's currently thrown away: the prompt only ever sees *completed*
  // challenges (below), so a domain the child ignores keeps coming back
  // just because the rotation/least-explored logic doesn't know it was
  // ignored. 14 days is long enough that "todo" genuinely means ignored,
  // not "hasn't gotten to it yet this week".
  const STALE_DOMAIN_CUTOFF = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: existing },
    { data: completedChallenges },
    { data: staleChallenges },
    { data: domainCounts },
    progressionTargets,
    // Question formulée par l'enfant lui-même (chantier « Deuxième colonne
    // vertébrale », 2026-08-15) : le dernier défi portant une child_question non
    // nulle fournit le fil conducteur de la prochaine génération — l'enfant
    // devient l'auteur de la question, pas le spectateur. `db` étant `any`, le
    // retour du maybeSingle est casté comme le reste.
    latestChildQuestion,
    // `db` est `any` (client parent OU service role) → Promise.all ne peut pas inférer
    // un tuple typé à partir d'éléments `any` mélangés à Promise<ProgressionTarget[]> ;
    // le cast est explicite (l'original typé via le client supabase inférait tout seul).
  ] = (await Promise.all([
    db
      .from("challenges")
      .select("title")
      .eq("child_id", childId)
      // Unbounded before: for a long-tenured family this list could grow
      // into a huge block of text sitting right before the safety
      // instruction later in the prompt, risking the "lost in the middle"
      // effect where instructions buried in a long context get followed
      // less reliably. The 30 most recent titles are enough to avoid
      // repeats without letting the prompt grow indefinitely.
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("challenges")
      .select("title, domain, ai_observations")
      .eq("child_id", childId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(6),
    db
      .from("challenges")
      .select("domain")
      .eq("child_id", childId)
      .eq("status", "todo")
      .lt("created_at", STALE_DOMAIN_CUTOFF),
    // Comptage SÉPARÉ non tronqué des complétions par domaine (avis GPT Codex P2) :
    // completedChallenges ci-dessus est limité à 6 pour le contexte du prompt — s'il
    // servait aussi au comptage, la réduction du guidage (completedInDomain) serait
    // sous-estimée pour les enfants avec beaucoup d'historique.
    db.from("challenges").select("domain").eq("child_id", childId).eq("status", "completed"),
    computeProgressionTargets(db, childId),
    db
      .from("challenges")
      .select("child_question")
      .eq("child_id", childId)
      .not("child_question", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])) as any;
  const existingTitles = ((existing ?? []) as any[]).map((c) => c.title);
  const childQuestionNote = ((latestChildQuestion as any)?.child_question ?? "").trim();
  const completedSummary = ((completedChallenges ?? []) as any[])
    .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ""}"`)
    .join("\n");

  // Autonomie progressive (analyse §28) : compteur de défis complétés par domaine,
  // injecté dans finalizeChallenge pour réduire le guidage à mesure que l'enfant
  // progresse dans son domaine. Comptage réel (non tronqué), cf. commentaire ci-dessus.
  const completedByDomain: Record<string, number> = {};
  for (const c of (domainCounts ?? []) as any[]) {
    completedByDomain[c.domain] = (completedByDomain[c.domain] ?? 0) + 1;
  }

  // A single unstarted challenge in a domain proves nothing (parents get
  // busy) — only flag a domain once it's happened at least twice, so this
  // is a real repeated pattern rather than noise from one busy week.
  const staleDomainCounts = ((staleChallenges ?? []) as any[]).reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.domain] = (acc[r.domain] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const ignoredDomains = Object.entries(staleDomainCounts)
    .filter(([, count]) => count >= 2)
    .map(([domain]) => domain);

  const leastExplored = getLeastExploredTalentLabels(
    child.talents as Record<string, number> | null,
  );

  // Progression and capabilities logic
  let hasUnconsolidatedCollectivePeak = false;
  let diagnosticDomain = "";
  for (const t of progressionTargets) {
    if (t.hasUnconsolidatedCollectivePeak) {
      hasUnconsolidatedCollectivePeak = true;
      diagnosticDomain = t.domain;
      break;
    }
  }

  let diagnosticIntentNote = "";
  if (hasUnconsolidatedCollectivePeak) {
    // Si un pic collectif non consolidé existe, on forge une intention diagnostique pour Naya
    diagnosticIntentNote = `Vérifier son autonomie réelle en ${diagnosticDomain} suite à une performance de groupe.`;
  } else {
    const targetWithCause = progressionTargets.find((t: any) => t.cause);
    if (targetWithCause?.cause) {
      diagnosticIntentNote = `Accompagner la cause observée en ${targetWithCause.domain} (${targetWithCause.cause}).`;
    }
  }

  // Assemblage délégué au builder pur buildChallengePrompt (chantier 1 « Naya 3.0 ») :
  // le template string vivait ici et pouvait dériver des rubriques partagées — la
  // couverture des rubriques est désormais testée unitairement dans naya-prompts.test.ts.
  const prompt = buildChallengePrompt({
    count,
    childName: child.name,
    childAge: child.age,
    location: [child.city, child.country].filter(Boolean).join(", ") || "non précisé",
    interestsPayload: formatChildInterestsPayload(child.interests, interestHypotheses),
    talentsJson: JSON.stringify(child.talents || {}),
    completedSummary,
    progressionInstruction: formatProgressionInstruction(progressionTargets),
    leastExplored,
    domainsText: shuffle(DOMAINS).join(", "),
    ignoredDomains,
    existingTitles,
    timePressureNote: formatTimePressureNote(
      child.time_pressure as TimePressure | null | undefined,
    ),
    profileContextNote: formatChildProfileContext(child as any),
    childQuestionNote,
    diagnosticIntentNote,
  });

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
    const snippet = content ? content.substring(0, 150).replace(/\n/g, " ") : "EMPTY_CONTENT";
    throw new Error(`Réponse IA invalide (extrait: ${snippet}...)`);
  }

  // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute
  // (avant finalizeChallenge — on audite ce que l'IA a réellement produit).
  void verifyAndLog({
    kind: "challenge_bulk",
    output: parsed,
    context: { childAge: child.age, childName: child.name, existingTitles },
    sourceFunction: "generateChallenges",
    childId,
    model: "deepseek-v4-flash",
  });

  let list: z.infer<typeof ChallengeSchema>[];
  try {
    list = z.array(ChallengeSchema).parse(parsed.challenges ?? []);
  } catch (err: any) {
    console.error("Zod validation failed for generateChallenges:", err);
    throw new Error(`Réponse IA invalide (structure incorrecte: ${err.message?.substring(0, 100)})`);
  }

  const rows = list.map((c) => ({
    // Décision #74 (Mentor Copilote) : user_id EST TOUJOURS le parent — l'ownership
    // et la RLS restent intacts ; created_by_user_id trace l'auteur réel (mentor).
    user_id: ownerUserId,
    created_by_user_id: createdByUserId ?? null,
    child_id: childId,
    domain: c.domain,
    description: c.description,
    duration: c.duration,
    steps: c.steps,
    materials: c.materials,
    pedagogical_context: c.pedagogical_context || null,
    // Demandé au prompt (ACADEMIC_SECRET_INSTRUCTION) et validé par ChallengeSchema,
    // mais jamais recopié jusqu'ici dans la ligne insérée — la carte "Avantage Secret
    // de Naya" retombait donc systématiquement sur son texte générique par défaut.
    academic_secret: c.academic_secret || null,
    // target_intelligences vient de finalizeChallenge (resolveTargetIntelligences),
    // qui filtre le champ "intelligences" du JSON contre VALID_TALENT_KEYS — plus
    // de fallback silencieux vers [c.domain], le prompt demande maintenant
    // explicitement les 9 clés exactes (cf. INTELLIGENCES_FIELD_INSTRUCTION).
    ...finalizeChallenge(c, child.age, { completedInDomain: completedByDomain[c.domain] ?? 0 }),
  }));

  const { data: inserted, error: insErr } = await db.from("challenges").insert(rows).select("*");
  if (insErr) throw new Error(insErr.message);
  void trackMaterialSuggestions(
    ((inserted ?? []) as any[]).map((c) => ({
      material_tags: c.material_tags ?? [],
      title: c.title,
    })),
  );
  return inserted;
}

export const generateChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Décision #81 : le mentor agit comme le parent sur ses enfants assignés —
    // assertChildActor (owner OU mentor assigné actif), lectures service role
    // dans le chemin mentor (la RLS ne rend pas les défis non-complétés).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const query = db
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true);
    if (actor === "owner") query.eq("user_id", userId);
    const { data: child, error: childErr } = await query.maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    // Gate d'accès payant : vaut pour le parent (l'ownership). Le mentor assigné
    // n'a pas de position dans le quota famille — son assignation est la preuve
    // d'accompagnement, la génération ne dépend pas de la facturation famille.
    if (actor === "owner") await assertChildAccessActive(userId, data.childId);

    return generateChallengesCore({
      db,
      child,
      childId: data.childId,
      count: data.count,
      ownerUserId: child.user_id,
      createdByUserId: actor === "mentor" ? userId : null,
    });
  });

export const UpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
  // Question formulée par l'enfant lui-même (chantier « Deuxième colonne
  // vertébrale », 2026-08-15) : sauvegardée depuis le mode quête, réinjectée
  // dans les prompts de génération suivants.
  child_question: z.string().max(500).nullable().optional(),
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
      time_limit_minutes?: number | null;
      child_question?: string | null;
    } = {};
    if (data.status === "completed") {
      throw new Error(
        "Un défi ne peut pas être terminé manuellement sans preuve. Utilisez le mode enfant pour soumettre une preuve (photo ou déclarative).",
      );
    }

    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "todo") {
        patch.progress = 0;
        patch.completed_at = null;
      } else {
        patch.completed_at = null;
      }
    }
    if (data.progress !== undefined) {
      patch.progress = data.progress;
      if (data.progress > 0) {
        patch.status = "in_progress";
        patch.completed_at = null;
      }
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.child_question !== undefined) patch.child_question = data.child_question;

    // Verrouillage (2026-07-30) : cette mutation touche directement `challenges`, pas
    // `child_profiles` — donc pas de colonne access_locked_at à filtrer dans l'update lui-même,
    // d'où ce pré-check explicite plutôt qu'un .eq() supplémentaire comme pour les autres.
    let existing: any = null;
    let db: any = context.supabase;
    let actor: "owner" | "mentor" | null = null;

    const { data: mine } = await context.supabase
      .from("challenges")
      .select(
        "child_id, time_limit_minutes, difficulty, estimated_duration_minutes, child_profiles(access_locked_at, is_active, age, time_pressure)",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mine) {
      existing = mine;
      actor = "owner";
    } else {
      // Chemin mentor (décision #81) : la RLS ne rend pas les défis non-complétés
      // aux mentors — lecture service role, puis assertChildActor (owner OU mentor
      // assigné actif non banni/suspendu) fait office de garde d'autorisation.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      db = supabaseAdmin as any;
      const { data: viaAdmin } = await db
        .from("challenges")
        .select(
          "child_id, time_limit_minutes, difficulty, estimated_duration_minutes, child_profiles(access_locked_at, is_active, age, time_pressure)",
        )
        .eq("id", data.id)
        .maybeSingle();
      if (!viaAdmin) throw new Error("Défi introuvable");
      actor = await assertChildActor(db, context.userId, viaAdmin.child_id);
      existing = viaAdmin;
    }
    if ((existing as any)?.child_profiles?.access_locked_at) {
      throw new Error("Ce profil est verrouillé.");
    }
    if ((existing as any)?.child_profiles?.is_active === false) {
      throw new Error("Ce profil est désactivé par l'administrateur.");
    }

    // Temps adaptatif (2026-08-12) : repli au démarrage — un défi assigné sans
    // estimation (ex. génération en lot) n'a pas de time_limit_minutes à l'insertion ;
    // au premier passage en cours, on en calcule un (repli par difficulté × âge ×
    // pression temporelle) pour que le chrono existe aussi sur ce chemin. `none` → NULL.
    if (
      patch.status === "in_progress" &&
      existing &&
      !existing.time_limit_minutes &&
      (existing.child_profiles as any)?.time_pressure !== "none"
    ) {
      patch.time_limit_minutes = resolveTimeLimitMinutes({
        estimatedMinutes: existing.estimated_duration_minutes,
        age: (existing.child_profiles as any)?.age ?? 10,
        timePressure: (existing.child_profiles as any)?.time_pressure ?? "standard",
        difficulty: existing.difficulty,
      });
    }

    // Ownership is enforced by RLS too, but every other mutation in this file
    // checks it explicitly — do the same here instead of relying solely on RLS.
    // (Chemin mentor : le filtre .eq(user_id) est retiré — l'assignation active a
    // déjà été prouvée par assertChildActor.)
    const updateQuery = db.from("challenges").update(patch).eq("id", data.id);
    if (actor === "owner") updateQuery.eq("user_id", context.userId);
    const { data: row, error } = await updateQuery.select("*").single();
    if (error) throw new Error(error.message);

    return row;
  });

// Temps adaptatif (2026-08-12) : le chrono a expiré → événement TIME_OVER journalisé
// (append-only, source 'app'). Jamais punitif : l'enfant peut continuer ; ce signal
// alimente le driver time_awareness du Jumeau Pédagogique (même canal que
// CHALLENGE_COMPLETED/ABANDONED). Émis UNE fois par défi (idempotent).
const TimeOverInput = z.object({ challengeId: z.string().uuid() });

export const recordChallengeTimeOver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => TimeOverInput.parse(input))
  .handler(async ({ data, context }) => {
    // Chemin mentor (décision #81) : la RLS ne rend pas les défis non-complétés
    // aux mentors — on tente d'abord la lecture owner, puis le repli service role
    // avec assertChildActor (idempotent : aucun enregistrement si défi inconnu).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sup = supabaseAdmin as any;
    let existing: any = null;
    const { data: mine } = await context.supabase
      .from("challenges")
      .select("id, child_id, user_id, time_limit_minutes, domain, title")
      .eq("id", data.challengeId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mine) {
      existing = mine;
    } else {
      const { data: viaAdmin } = await sup
        .from("challenges")
        .select("id, child_id, user_id, time_limit_minutes, domain, title")
        .eq("id", data.challengeId)
        .maybeSingle();
      if (!viaAdmin) return { ok: true }; // Défi inconnu ou déjà supprimé — idempotent.
      await assertChildActor(sup, context.userId, viaAdmin.child_id);
      existing = viaAdmin;
    }

    const { data: already } = await supabaseAdmin
      .from("observation_events")
      .select("id")
      .eq("child_id", existing.child_id)
      .eq("type", "TIME_OVER")
      .eq("payload->>challenge_id", existing.id)
      .limit(1);
    if (already && already.length > 0) return { ok: true };

    const { error } = await supabaseAdmin.from("observation_events").insert({
      child_id: existing.child_id,
      user_id: context.userId,
      type: "TIME_OVER",
      source: "app",
      payload: {
        challenge_id: existing.id,
        domain: existing.domain,
        title: existing.title,
        time_limit_minutes: existing.time_limit_minutes,
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteChallengeInput = z.object({
  id: z.string().uuid(),
  /** Code du chip de raison (Décision #58) : pas_le_bon_moment | deja_fait_autrement | pas_interesse | doublon. */
  reason: z.string().min(1).max(40).optional(),
  /** Note libre optionnelle. */
  note: z.string().max(500).optional(),
});

/**
 * Journalise en arrière-plan le signal d'issue (Décision #58) dans
 * challenge_outcomes — la trace que le Loup agrège pour apprendre des abandons.
 * Jamais bloquant pour l'appelant (pattern verifyAndLog).
 */
async function logChallengeOutcome(params: {
  challengeId: string;
  childId: string;
  kind: "deleted_uncompleted" | "deleted_completed";
  reason: string | null;
  note: string | null;
  domain: string;
  statusWhenDeleted: string;
  pendingDays: number;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("challenge_outcomes").insert({
      challenge_id: params.challengeId,
      child_id: params.childId,
      kind: params.kind,
      reason_chip: params.reason,
      reason_note: params.note,
      domain: params.domain,
      status_when_deleted: params.statusWhenDeleted,
      pending_duration_days: params.pendingDays,
    });
  } catch (err) {
    console.error("Naya challenge_outcomes log failed (non-fatal):", err);
  }
}

export const deleteChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => DeleteChallengeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("challenges")
      .select(
        "id, child_id, domain, title, status, created_at, child_profiles(access_locked_at, is_active)",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!existing) return { ok: true }; // Déjà supprimé ou inexistant — idempotent.
    if ((existing as any)?.child_profiles?.access_locked_at) {
      throw new Error("Ce profil est verrouillé.");
    }
    if ((existing as any)?.child_profiles?.is_active === false) {
      throw new Error("Ce profil est désactivé par l'administrateur.");
    }

    // Soft-delete (Décision #58) : la ligne reste en base (deleted_at) — elle
    // devient invisible à toutes les lectures via RLS et conserve la preuve
    // (proof_image_url) ; seules les traces d'apprentissage la survivent.
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("challenges")
      .update({ deleted_at: now })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    void logChallengeOutcome({
      challengeId: existing.id,
      childId: existing.child_id,
      kind: existing.status === "completed" ? "deleted_completed" : "deleted_uncompleted",
      reason: data.reason ?? null,
      note: data.note ?? null,
      domain: existing.domain,
      statusWhenDeleted: existing.status,
      pendingDays:
        Math.round(((Date.now() - Date.parse(existing.created_at)) / 86400000) * 100) / 100,
    });
    return { ok: true };
  });

// Étape 1 — "preuve visuelle obligatoire" (brainstorm produit, 2026-08-02) : avant ce
// changement, un commentaire texte seul suffisait à valider un défi et à obtenir
// XP/badges/points, exactement comme une photo — aucune distinction. Les défis
// proof_mode="declarative" (ex: "combien de fois as-tu jonglé") ne passent jamais par
// validateChallengeProof (voir submitDeclarativeProof plus bas), donc aucun cas
// particulier à gérer ici : toute soumission qui arrive dans cette fonction doit
// apporter une photo pour pouvoir être notée.
export function hasSufficientProof(proofImageBase64: string | undefined): boolean {
  return !!proofImageBase64;
}

const ValidateInput = z.object({
  id: z.string().uuid(),
  proofText: z.string().max(2000).optional(),
  // Raw bytes instead of a pre-uploaded Storage URL — the image is only
  // persisted to Storage after the AI confirms it's actually relevant (see
  // below), instead of on every submission attempt regardless of outcome.
  proofImageBase64: z.string().optional(),
  proofImageMediaType: z.string().optional(),
});

// Cœur partagé de la validation de preuve photo (Mentor Copilote, décision #74) :
// la chaîne IA est STRICTEMENT la même pour le parent et pour le mentor — seul
// l'acteur qui soumet change (le mentor prend la photo en séance et la soumet,
// c'est lui l'adulte présent). `db` est le client d'écriture : context.supabase côté
// parent (RLS + increment_child_talents re-vérifie auth.uid()), supabaseAdmin côté
// mentor APRÈS assertMentorOperator. Le challenge est passé DÉJÀ chargé et
// DÉJÀ autorisé par l'appelant — jamais d'ownership dans le cœur.
export async function validateChallengeProofCore(params: {
  db: any;
  challenge: any;
  /** Identité qui soumet (pour l'événement observation) — le parent ou le mentor. */
  actingUserId: string;
  id: string;
  proofText?: string;
  proofImageBase64?: string;
  proofImageMediaType?: string;
}) {
  const { db, challenge, actingUserId, id } = params;

  // Étape 1 — preuve visuelle obligatoire (2026-08-02) : refusé avant l'appel IA (pas
  // seulement côté UI, sinon contournable) — aucun coût IA pour une soumission qui ne
  // peut de toute façon rien rapporter. Même event de friction que le rejet IA plus bas
  // (PROOF_REJECTED) pour que le Jumeau Pédagogique voie ce signal lui aussi.
  if (!hasSufficientProof(params.proofImageBase64)) {
    try {
      const { error: evtErr } = await db.from("observation_events").insert({
        child_id: challenge.child_id,
        user_id: actingUserId,
        type: "PROOF_REJECTED",
        source: "app",
        payload: {
          challenge_id: challenge.id,
          domain: challenge.domain,
          had_image: false,
          image_analyzed: false,
          reason: "no_image",
        },
      });
      if (evtErr) console.error("PROOF_REJECTED event insert failed (non-fatal):", evtErr);
    } catch (err) {
      console.error("PROOF_REJECTED event insert failed (non-fatal):", err);
    }

    return {
      challenge,
      observations:
        "Pour valider ce défi et débloquer les points, il me faut une photo qui montre ce qui a été fait ! Ajoute une photo et soumets à nouveau.",
      awarded_points: {},
      imageAnalyzed: false,
      relevant: false,
      levelUp: null,
      badgeUnlocked: null,
    };
  }

  const prompt = `Tu es un mentor pédagogique et un expert en psychologie de l'enfant (Inspiré par Howard Gardner et les intelligences multiples).
L'enfant (Prénom: ${challenge.child_profiles.name}, Âge: ${challenge.child_profiles.age}) vient de terminer le défi : "${challenge.title}".
Domaine : ${challenge.domain}
Description du défi : ${challenge.description}

Le parent a soumis cette preuve de réalisation :
${params.proofText ? `Texte/Notes : "${params.proofText}"` : ""}
${params.proofImageBase64 ? `Une image a également été fournie (vérifie l'image si possible).` : ""}

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
  // D-07 : filet serveur — le client convertit déjà HEIC→JPEG (heic2any, image-proof.ts),
  // mais une preuve HEIC peut arriver ici (client ancien, WASM indisponible, type non
  // reconnu). Import dynamique : le module de conversion (~1,7 Mo de WASM embarqué) ne
  // doit jamais entrer dans le bundle client des server functions. Échec de conversion
  // → analyse texte seul (imageAnalyzed=false), même repli que l'ancien fallback vision
  // mais sans l'appel Claude gaspillé sur des octets HEIC relabelés JPEG.
  let imageData = params.proofImageBase64
    ? { base64: params.proofImageBase64, mediaType: params.proofImageMediaType ?? "image/jpeg" }
    : undefined;
  if (imageData && !ALLOWED_IMAGE_MEDIA_TYPES.includes(imageData.mediaType)) {
    const { convertHeicProofBase64ToJpeg, isHeifProof } = await import("@/lib/server-heic");
    if (isHeifProof(imageData.base64, imageData.mediaType)) {
      const converted = await convertHeicProofBase64ToJpeg(imageData.base64);
      if (converted) {
        imageData = { base64: converted, mediaType: "image/jpeg" };
      } else {
        console.warn("Preuve HEIC non convertible côté serveur — analyse texte seul.");
        imageData = undefined;
      }
    }
  }
  // let : le fallback vision ci-dessous (échec de l'appel Claude) le passe à false.
  let imageAnalyzed = !!imageData;
  // A short observation + a small talents_awarded object — nowhere near
  // the 4000-token default sized for a batch of full défis. Reserving
  // that much per call was the main way this endpoint could exhaust the
  // org's per-minute output-token budget on a single request.
  try {
    aiContent = await callClaude(prompt, true, undefined, 500, 3, imageData);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("429") ||
        err.message.includes("rate_limit") ||
        err.message.includes("quota"))
    ) {
      console.error("Vision model rate limited / quota exceeded:", err);
      throw new Error(
        "Service IA temporairement surchargé (limite de débit atteinte). Veuillez réessayer dans un instant.",
      );
    }
    console.warn("Vision model call failed, falling back to text only:", err);
    imageAnalyzed = false;
    try {
      aiContent = await callClaude(prompt, true, undefined, 1500);
    } catch (fallbackErr) {
      console.error("Text-only fallback model call failed:", fallbackErr);
      if (
        fallbackErr instanceof Error &&
        (fallbackErr.message.includes("429") ||
          fallbackErr.message.includes("rate_limit") ||
          fallbackErr.message.includes("quota"))
      ) {
        throw new Error(
          "Service IA temporairement surchargé (limite de débit atteinte). Veuillez réessayer dans un instant.",
        );
      }
      throw new Error(
        `Erreur d'analyse par l'IA : ${fallbackErr instanceof Error ? fallbackErr.message : "Erreur inconnue"}`,
      );
    }
  }

  let parsed: { observations?: string; talents_awarded?: Record<string, number> };
  try {
    parsed = JSON.parse(extractJsonFromLLMResponse(aiContent));
  } catch (parseErr) {
    console.error("Error parsing vision/text AI response JSON:", parseErr, "Content:", aiContent);
    throw new Error("Réponse IA invalide — réessayez dans quelques instants.");
  }

  // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
  void verifyAndLog({
    kind: "proof_validation",
    output: parsed,
    context: { childAge: challenge.child_profiles?.age, childName: challenge.child_profiles?.name },
    sourceFunction: "validateChallengeProof",
    childId: challenge.child_profiles?.id,
    model: imageAnalyzed ? "claude-sonnet-5" : "deepseek-v4-flash",
  });

  const observations = parsed.observations ?? "Bravo pour cette belle réalisation !";
  const awarded = parsed.talents_awarded ?? {};

  const validTalentKeys = new Set(VALID_TALENT_KEYS);
  const deltas: Record<string, number> = {};
  let intelligenceKeys: string[] = [];
  for (const [key, points] of Object.entries(awarded)) {
    // Drop anything the AI returns outside the 9 known intelligences — a
    // hallucinated or misspelled key would otherwise pollute talents forever.
    if (typeof points === "number" && validTalentKeys.has(key)) {
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
    const { error: talentsError } = await db.rpc("increment_child_talents", {
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
      const { error: evtErr } = await db.from("observation_events").insert({
        child_id: challenge.child_id,
        user_id: actingUserId,
        type: "PROOF_REJECTED",
        source: "app",
        payload: {
          challenge_id: challenge.id,
          domain: challenge.domain,
          had_image: !!params.proofImageBase64,
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
    // D-07 : on stocke la version normalisée (JPEG converti le cas échéant) — un HEIC
    // brut ne serait de toute façon pas affichable par les navigateurs du flux.
    if (imageData) {
      const mediaType = imageData.mediaType;
      const ext = mediaType.split("/")[1] ?? "jpg";
      const fileName = `${challenge.child_id}/${challenge.id}-${Math.random()}.${ext}`;
      const { error: uploadError } = await db.storage
        .from("proofs")
        .upload(fileName, Buffer.from(imageData.base64, "base64"), {
          contentType: mediaType,
        });
      if (uploadError) {
        console.error("Erreur d'upload de la preuve (non bloquant):", uploadError);
      } else {
        // Chantier preuves privées : on stocke le PATH (`proofs/{childId}/{file}`),
        // plus d'URL publique — l'affichage passe par une URL signée (proof-image.ts).
        proofImageUrl = `proofs/${fileName}`;
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

    const { data: updated, error } = await db
      .from("challenges")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    updatedChallenge = updated;

    levelUp = await awardCompletionXP(db, challenge.child_id);
    badgeUnlocked = await checkAndAwardBadge(db, challenge.child_id, challenge.domain);

    // NAYA 2.0 Phase 3b : si ce défi était un défi discriminant, met à jour la boucle bayésienne
    try {
      const { processDiscriminantResult } = await import("@/lib/hypotheses.functions");
      void processDiscriminantResult(id, "COMPLETED", relevant);
    } catch (err) {
      console.error("Non-fatal: processDiscriminantResult failed", err);
    }

    // Étape 4 : si ce défi était un défi de retest de soutien renforcé, met à jour
    // hypothesis_cycles.support_active — no-op sûr si ce n'en est pas un.
    try {
      const { processSupportRetestResult } = await import("@/lib/hypotheses.functions");
      void processSupportRetestResult(id, "COMPLETED");
    } catch (err) {
      console.error("Non-fatal: processSupportRetestResult failed", err);
    }

    // Pré-génération de la prochaine mission (2026-07-26, review produit) : sans ça, le
    // parent retrouve "aucun défi en cours" à sa prochaine visite et attend l'appel IA à ce
    // moment-là. Fire-and-forget, même pattern que processDiscriminantResult ci-dessus —
    // import dynamique pour éviter le cycle d'imports (recommendations.functions.ts importe
    // déjà challenges.functions.ts statiquement). Idempotent par construction :
    // recommendChallengesForChild ne génère que si l'enfant n'a plus aucun défi en attente.
    try {
      const { recommendChallengesForChild } = await import("@/lib/recommendations.functions");
      void recommendChallengesForChild({ data: { childId: challenge.child_id } });
    } catch (err) {
      console.error("Non-fatal: pré-génération de la prochaine mission a échoué", err);
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
}

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
    if (challenge.child_profiles?.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (challenge.child_profiles?.is_active === false)
      throw new Error("Ce profil est désactivé par l'administrateur.");

    return validateChallengeProofCore({
      db: supabase,
      challenge,
      actingUserId: userId,
      id: data.id,
      proofText: data.proofText,
      proofImageBase64: data.proofImageBase64,
      proofImageMediaType: data.proofImageMediaType,
    });
  });

// Étape 3 — "classer automatiquement le commentaire du parent" (brainstorm produit,
// 2026-08-02). Réutilise EXACTEMENT le vocabulaire de causes du moteur de diagnostic NAYA
// (cf. hypotheses.functions.ts, ALLOWED_CAUSES) — READY_FOR_MORE exclu, il ne s'applique
// qu'à un écart "en avance", jamais à un défi non réussi. Un classement individuel ne
// déclenche jamais rien seul : c'est ensureHypothesesForChild qui décide si un motif
// répété (même cause, même domaine, plusieurs fois) mérite d'ouvrir un cycle.
export const NOT_COMPLETED_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
  "OTHER",
] as const;
export type NotCompletedCause = (typeof NOT_COMPLETED_CAUSES)[number];

export async function classifyNotCompletedReason(
  reason: string,
): Promise<NotCompletedCause | null> {
  const prompt = `Un parent explique pourquoi un défi pédagogique pour enfant n'a pas pu être terminé. Classe cette explication dans EXACTEMENT une des catégories suivantes :
- METHOD_MISMATCH : l'enfant a probablement les capacités, mais la présentation/le format du défi ne lui convenait pas (ex : consigne trop scolaire/théorique pour lui).
- PERFORMANCE_ANXIETY : l'enfant a montré du stress, une peur de mal faire, une pression ressentie.
- LACK_OF_ENGAGEMENT : l'enfant n'était pas intéressé, a refusé d'essayer, s'est vite désintéressé.
- CONCEPTUAL_GAP : l'enfant a essayé mais une notion de base lui manquait pour réussir.
- OTHER : raison externe à l'enfant et aux consignes (fatigue, matériel manquant, parent absent, manque de temps, imprévu).

Explication du parent : "${reason.slice(0, 2000)}"

Réponds EXCLUSIVEMENT avec un JSON de cette forme, sans texte autour : {"cause": "UNE_DES_5_ETIQUETTES"}`;

  try {
    const raw = await callClaude(prompt, true, undefined, 1000, 2);
    const parsed = JSON.parse(extractJsonFromLLMResponse(raw));
    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la classification.
    void verifyAndLog({
      kind: "not_completed_classification",
      output: parsed,
      sourceFunction: "classifyNotCompletedReason",
      model: "deepseek-v4-flash",
    });
    const cause = parsed?.cause;
    return (NOT_COMPLETED_CAUSES as readonly string[]).includes(cause)
      ? (cause as NotCompletedCause)
      : null;
  } catch (err) {
    // Non-fatal par conception, comme narrateForParent : une classification manquée
    // laisse simplement not_completed_cause à null, jamais d'échec de la soumission.
    console.error("classifyNotCompletedReason failed (non-fatal):", err);
    return null;
  }
}

// raison : note libre du parent (journal), au moins 1 caractère — la carte envoie
// "Sans raison précisée" quand le journal est vide, donc la contrainte reste.
// reasonChip : chip structuré du dialog (Décision #58, même vocabulaire que la
// suppression) — signal exploitable par le Loup sans classification IA.
export const NOT_COMPLETED_CHIPS = [
  "pas_le_bon_moment",
  "deja_fait_autrement",
  "pas_interesse",
  "doublon",
] as const;
type NotCompletedChip = (typeof NOT_COMPLETED_CHIPS)[number];

export const NotCompletedInput = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
  reasonChip: z.enum(NOT_COMPLETED_CHIPS).optional(),
});

// Étape 2 — "un vrai statut non réussi" (brainstorm produit, 2026-08-02) : jusqu'ici,
// aucun chemin ne permettait de dire "l'enfant n'a pas pu faire ce défi" — le défi
// restait à todo/in_progress indéfiniment, ou obtenait des points via un texte seul
// (corrigé à l'étape 1). Cette fonction ne donne jamais aucun point/XP/badge — c'est
// tout son rôle : acter honnêtement un non-aboutissement plutôt que de le déguiser.
export const submitChallengeNotCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => NotCompletedInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Décision #81 : lecture service role (la RLS ne rend pas les défis
    // non-complétés aux mentors) + assertChildActor — owner OU mentor assigné
    // actif. La suppression, elle, reste owner-only (deleteChallenge).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sup = supabaseAdmin as any;

    const { data: challenge, error: challengeErr } = await sup
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.id)
      .single();

    if (challengeErr || !challenge) throw new Error("Défi introuvable");
    await assertChildActor(sup, userId, challenge.child_id);
    if (challenge.child_profiles?.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (challenge.child_profiles?.is_active === false)
      throw new Error("Ce profil est désactivé par l'administrateur.");

    // Garde de statut (review 2026-08-12, P1) : un re-clic, une race ou un client
    // obsolète ne doit jamais faire basculer un défi déjà completed en not_completed
    // (perte de complétion, XP/badges déjà attribués), ni re-déclencher la chaîne de
    // post-traitement (reformulation, discriminants) sur un défi déjà abandonné.
    if (challenge.status === "completed") {
      throw new Error("Ce défi est déjà terminé — il ne peut pas être marqué non réussi.");
    }
    if (challenge.status === "not_completed") {
      throw new Error("Ce défi est déjà marqué non réussi.");
    }

    const { data: updated, error } = await sup
      .from("challenges")
      .update({
        status: "not_completed" as const,
        not_completed_reason: data.reason,
        not_completed_reason_chip: data.reasonChip ?? null,
        not_completed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    // Étape 3 : classification en arrière-plan, après la réponse au parent — pas de latence
    // supplémentaire pour lui, et un échec de classification ne doit jamais faire échouer la
    // soumission elle-même (déjà enregistrée ci-dessus).
    (async () => {
      const cause = await classifyNotCompletedReason(data.reason);
      if (cause) {
        const { error: causeErr } = await sup
          .from("challenges")
          .update({ not_completed_cause: cause })
          .eq("id", data.id);
        if (causeErr) console.error("Non-fatal: écriture de not_completed_cause échouée", causeErr);
      }

      // Même intégration que validateChallengeProof pour un défi discriminant, avec l'issue
      // opposée — processDiscriminantResult gère déjà "ABANDONED" depuis sa création (cf.
      // hypotheses.functions.ts) et ne fait rien si le défi n'est pas discriminant (no-op sûr).
      try {
        const { processDiscriminantResult } = await import("@/lib/hypotheses.functions");
        void processDiscriminantResult(data.id, "ABANDONED");
      } catch (err) {
        console.error("Non-fatal: processDiscriminantResult failed", err);
      }

      // Étape 4 : si ce défi était un défi de retest de soutien renforcé et qu'il n'a pas
      // été réussi, on redémarre le compteur plutôt que de conclure que le soutien n'est
      // plus nécessaire (cf. processSupportRetestResult) — no-op sûr si ce n'en est pas un.
      try {
        const { processSupportRetestResult } = await import("@/lib/hypotheses.functions");
        void processSupportRetestResult(data.id, "ABANDONED");
      } catch (err) {
        console.error("Non-fatal: processSupportRetestResult failed", err);
      }

      // Étape 5 — boucle de réévaluation des modalités (chantier 3, §22-26) : si la cause
      // est accommodable, la PROCHAINE mission est une reformulation du MÊME objectif
      // pédagogique dans une autre modalité (jamais une conclusion — jusqu'à 3 essais).
      // Sinon (cause absente ou OTHER), ou si la reformulation est impossible, on retombe
      // sur la recommandation classique pour que le parent ne reste jamais sans mission.
      const { canReformulate } = await import("@/lib/modalities.functions");
      if (canReformulate(cause)) {
        try {
          const { processModalityReformulation } = await import("@/lib/modalities.functions");
          const outcome = await processModalityReformulation(sup, userId, data.id);
          if (outcome.ok) return; // la reformulation devient la mission suivante
          console.error(
            `Non-fatal: reformulation impossible (${outcome.reason}) — repli sur la recommandation`,
          );
        } catch (err) {
          console.error("Non-fatal: reformulation failed", err);
        }
      }

      // Même pré-génération que validateChallengeProof/submitDeclarativeProof — sans ça, le
      // parent retrouve "aucun défi en cours" à sa prochaine visite.
      try {
        const { recommendChallengesForChild } = await import("@/lib/recommendations.functions");
        void recommendChallengesForChild({ data: { childId: challenge.child_id } });
      } catch (err) {
        console.error("Non-fatal: pré-génération de la prochaine mission a échoué", err);
      }
    })().catch((err) => console.error("Non-fatal: traitement post-échec failed", err));

    return { challenge: updated };
  });

const SubmitDeclarativeInput = z.object({
  id: z.string().uuid(),
  reportedValue: z.number().finite(),
});

// Cœur partagé de la preuve déclarative (décision #36 + Mentor Copilote #74) : 0
// appel IA par design — on compare la déclaration à la cible fixée à la génération. Même
// principe que validateChallengeProofCore : `db` = client d'écriture (parent | mentor
// après assertMentorOperator), challenge DÉJÀ chargé et autorisé par l'appelant.
export async function submitDeclarativeProofCore(params: {
  db: any;
  challenge: any;
  actingUserId: string;
  id: string;
  reportedValue: number;
}) {
  const { db, challenge, actingUserId, id, reportedValue } = params;

  if (challenge.proof_mode !== "declarative") {
    throw new Error("Ce défi ne se valide pas par déclaration.");
  }

  const target = challenge.proof_target as { metric?: string; value?: number } | null;
  if (!target?.metric || typeof target.value !== "number") {
    throw new Error("Cible de déclaration manquante pour ce défi.");
  }

  const childName = challenge.child_profiles.name as string;
  const relevant = reportedValue >= target.value;

  if (!relevant) {
    // Même logique que le rejet côté photo (PROOF_REJECTED) : rien n'est modifié
    // en base pour le défi, mais c'est un vrai signal de friction pour le Jumeau
    // Pédagogique — journalisation best-effort, jamais bloquante.
    try {
      const { error: evtErr } = await db.from("observation_events").insert({
        child_id: challenge.child_id,
        user_id: actingUserId,
        type: "PROOF_REJECTED",
        source: "app",
        payload: {
          challenge_id: challenge.id,
          domain: challenge.domain,
          declarative: true,
          reported_value: reportedValue,
          target_value: target.value,
        },
      });
      if (evtErr) console.error("PROOF_REJECTED event insert failed (non-fatal):", evtErr);
    } catch (err) {
      console.error("PROOF_REJECTED event insert failed (non-fatal):", err);
    }

    return {
      challenge,
      observations: `Pas encore atteint cette fois (${reportedValue}/${target.value} ${target.metric}) — ce n'est pas grave, ${childName} peut retenter dès que prêt·e !`,
      awarded_points: {},
      imageAnalyzed: false,
      relevant: false,
      levelUp: null,
      badgeUnlocked: null,
    };
  }

  const award = (challenge.declarative_award as Record<string, number> | null) ?? {};
  if (Object.keys(award).length > 0) {
    const { error: talentsError } = await db.rpc("increment_child_talents", {
      p_child_id: challenge.child_id,
      p_deltas: award,
    });
    if (talentsError) throw new Error(talentsError.message);
  }

  const observations = `Bravo ! ${childName} a réussi ${reportedValue} ${target.metric} (objectif : ${target.value}). Une belle preuve de persévérance.`;

  const { data: updated, error } = await db
    .from("challenges")
    .update({
      status: "completed" as const,
      progress: 100,
      completed_at: new Date().toISOString(),
      ai_observations: observations,
      target_intelligences: Object.keys(award),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Manquait ici jusqu'à présent : validateChallengeProof et updateChallenge
  // l'appellent déjà toutes les deux — un défi validé par déclaration (jongles,
  // minutes de course...) est une complétion tout aussi réelle et doit compter
  // pour l'XP/la série au même titre qu'une preuve photo.
  const levelUp = await awardCompletionXP(db, challenge.child_id);
  const badgeUnlocked = await checkAndAwardBadge(db, challenge.child_id, challenge.domain);

  // NAYA 2.0 Phase 3b : si ce défi déclaratif était le défi discriminant d'un
  // cycle d'hypothèses, met à jour la boucle bayésienne — même point d'entrée
  // que validateChallengeProof, l'origine de la preuve ne doit pas changer le
  // fonctionnement du moteur bayésien en aval.
  try {
    const { processDiscriminantResult } = await import("@/lib/hypotheses.functions");
    void processDiscriminantResult(id, "COMPLETED", true);
  } catch (err) {
    console.error("Non-fatal: processDiscriminantResult failed", err);
  }

  // Étape 4 : même point d'entrée que validateChallengeProof pour un éventuel défi de
  // retest de soutien renforcé — no-op sûr si ce n'en est pas un.
  try {
    const { processSupportRetestResult } = await import("@/lib/hypotheses.functions");
    void processSupportRetestResult(id, "COMPLETED");
  } catch (err) {
    console.error("Non-fatal: processSupportRetestResult failed", err);
  }

  // Pré-génération de la prochaine mission — même mécanisme que validateChallengeProof,
  // même raison de ne pas dupliquer davantage : fire-and-forget, idempotent côté
  // recommendChallengesForChild (ne se déclenche que si plus aucun défi en attente).
  try {
    const { recommendChallengesForChild } = await import("@/lib/recommendations.functions");
    void recommendChallengesForChild({ data: { childId: challenge.child_id } });
  } catch (err) {
    console.error("Non-fatal: pré-génération de la prochaine mission a échoué", err);
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
}

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
    if (challenge.child_profiles?.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (challenge.child_profiles?.is_active === false)
      throw new Error("Ce profil est désactivé par l'administrateur.");

    return submitDeclarativeProofCore({
      db: supabase,
      challenge,
      actingUserId: userId,
      id: data.id,
      reportedValue: data.reportedValue,
    });
  });

export const AssignTemplateInput = z.object({
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

// Cœur partagé de l'assignation de template (Mentor Copilote, décision #74) : même
// principe que generateChallengesCore — `ownerUserId` EST TOUJOURS le parent (ownership),
// `createdByUserId` est le mentor quand il assigne (attribution). `child` passé DÉJÀ
// chargé et autorisé.
export async function assignTemplateChallengeCore(params: {
  db: any;
  child: { id: string; age: number; time_pressure: string | null };
  childId: string;
  template: z.infer<typeof ChallengeSchema> & {
    intelligences?: string[];
    pedagogical_context?: string;
  };
  estimatedDurationMinutes?: number;
  ownerUserId: string;
  createdByUserId?: string | null;
}) {
  const { db, child, childId, template, estimatedDurationMinutes, ownerUserId, createdByUserId } =
    params;

  // Re-run the deterministic checks here rather than trusting
  // template.requires_supervision/supervision_warning/difficulty as-is:
  // this is a client-supplied value (round-tripped from
  // generateSingleChallenge's preview) and this insert is the actual
  // point of truth in the DB.
  const { data: inserted, error } = await db
    .from("challenges")
    .insert({
      // Décision #74 : user_id = parent, created_by_user_id = auteur réel (mentor).
      user_id: ownerUserId,
      created_by_user_id: createdByUserId ?? null,
      child_id: childId,
      domain: template.domain,
      description: template.description,
      duration: template.duration,
      steps: template.steps,
      materials: template.materials,
      status: "todo",
      progress: 0,
      pedagogical_context: template.pedagogical_context ?? null,
      // Même bug que dans generateChallenges : demandé au prompt, validé par le
      // schéma, mais jamais recopié dans l'insertion réelle — voir le commentaire
      // équivalent là-bas.
      academic_secret: template.academic_secret ?? null,
      estimated_duration_minutes: estimatedDurationMinutes ?? null,
      // Temps adaptatif (2026-08-12) : limite calculée à l'assignation à partir de
      // l'estimation (ou repli par difficulté), facteurs d'âge et de pression
      // temporelle du profil. `none` → NULL → pas de chrono.
      time_limit_minutes: resolveTimeLimitMinutes({
        estimatedMinutes: estimatedDurationMinutes,
        age: child.age,
        timePressure: (child.time_pressure as TimePressure) ?? "standard",
        difficulty: template.difficulty,
      }),
      academic_subject: template.academic_subject ?? null,
      academic_grade_level: template.academic_grade_level ?? null,
      homework_instruction: template.homework_instruction ?? null,
      behavioral_driver: template.behavioral_driver ?? null,
      zpa_level: template.zpa_level ?? null,
      // target_intelligences vient de finalizeChallenge (resolveTargetIntelligences)
      // plutôt que directement de template.intelligences, non filtré.
      ...finalizeChallenge(template, child.age),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  void trackMaterialSuggestions([
    { material_tags: inserted.material_tags ?? [], title: inserted.title },
  ]);
  return inserted;
}

export const assignTemplateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AssignTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Décision #81 : le mentor assigne des défis catalogue comme le parent.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const query = db
      .from("child_profiles")
      .select("id, user_id, age, time_pressure")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true);
    if (actor === "owner") query.eq("user_id", userId);
    const { data: child, error: childErr } = await query.maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    return assignTemplateChallengeCore({
      db,
      child,
      childId: data.childId,
      template: data.template,
      estimatedDurationMinutes: data.estimated_duration_minutes,
      ownerUserId: child.user_id,
      createdByUserId: actor === "mentor" ? userId : null,
    });
  });

// Correctif (2026-07-22, audit de la branche feat/naya-academic-homework-fusion) :
// masteryScore/hypothesisCauses/anxietyProb/currentLevel étaient fournis par le CLIENT, qui ne
// les transmettait en réalité jamais (AcademicHomeworkInput.tsx n'exposait même pas ces champs)
// — le "moteur ZPA bayésien" tournait donc systématiquement sur les valeurs par défaut
// (masteryScore=3, anxietyProb=0.1), jamais sur un signal réel. Retirés du schéma client :
// computeHomeworkZPAContext calcule maintenant ces valeurs côté serveur à partir des vraies
// données de l'enfant (academic_level_age mesuré, hypothesis_cycles ouvert), même philosophie
// que resolveTargetIntelligences — ne jamais faire confiance à ce qu'un client pourrait fournir
// quand la donnée doit venir d'un signal mesuré.
const GenerateAcademicHomeworkInput = z.object({
  childId: z.string().uuid(),
  subject: z.enum(["maths", "francais", "sciences", "histoire_geo", "anglais"]),
  gradeLevel: z.enum(["CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]),
  homeworkInstruction: z.string().min(2).max(500),
  suggestedTopicId: z.string().optional().nullable(),
  behavioralDriver: z
    .enum(["deconstruire", "schematiser", "simuler", "enqueter", "optimiser"])
    .optional()
    .nullable(),
  timeAvailable: z.string().optional(),
  homeMaterials: z.string().optional().nullable(),
});

// Mapping partiel : les 5 matières scolaires (academic-homework.functions.ts) ne couvrent pas
// exactement les 9 domaines du référentiel académique (decision #39). "anglais" partage
// "langage" avec "francais" (simplification assumée — pas de sous-domaine "langue étrangère"
// distinct dans le référentiel) ; "histoire_geo" n'a aucun équivalent, reste non mappé.
const SUBJECT_TO_ACADEMIC_DOMAIN: Record<string, string | null> = {
  maths: "mathematiques",
  francais: "langage",
  anglais: "langage",
  sciences: "sciences",
  histoire_geo: null,
};

// Calcule les vrais paramètres du moteur ZPA à partir de l'historique de l'enfant, plutôt que
// de faire confiance à des valeurs fournies par le client (cf. commentaire sur
// GenerateAcademicHomeworkInput ci-dessus). Même source de données que computeProgressionTargets
// (academic_level_age des défis complétés, hypothesis_cycles ouvert), pas une nouvelle
// heuristique — juste appliquée au périmètre "devoir" plutôt qu'à tous les domaines.
export async function computeHomeworkZPAContext(
  supabase: any,
  childId: string,
  subject: string,
  targetGradeAge: number,
): Promise<{
  masteryScore: number;
  hypothesisCauses: string[];
  anxietyProb: number;
  currentLevel?: number;
}> {
  const domain = SUBJECT_TO_ACADEMIC_DOMAIN[subject] ?? null;

  const [{ data: lastAcademic }, { data: openCycle }, { data: lastHomework }] = await Promise.all([
    domain
      ? supabase
          .from("challenges")
          .select("academic_level_age")
          .eq("child_id", childId)
          .eq("status", "completed")
          .eq("academic_domain", domain)
          .not("academic_level_age", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("hypothesis_cycles")
      .select("hypotheses, trigger_domain")
      .eq("child_id", childId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("challenges")
      .select("zpa_level")
      .eq("child_id", childId)
      .eq("academic_subject", subject)
      .not("zpa_level", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Score 1-5 dérivé de l'écart entre le dernier niveau académique mesuré dans ce domaine et
  // le niveau académique cible de la classe visée par ce devoir précis (pas l'âge chronologique
  // de l'enfant) — 0 défi mesuré ou domaine non mappé (histoire_geo) : repli neutre à 3.
  let masteryScore = 3;
  if (typeof lastAcademic?.academic_level_age === "number") {
    masteryScore = Math.max(1, Math.min(5, 3 + (lastAcademic.academic_level_age - targetGradeAge)));
  }

  const hypotheses =
    (openCycle?.hypotheses as { cause: string; current_probability: number }[] | null) || [];
  const causeApplies = Boolean(domain) && openCycle?.trigger_domain === domain;
  const hypothesisCauses = causeApplies ? hypotheses.map((h) => h.cause) : [];
  const anxietyProb = causeApplies
    ? (hypotheses.find((h) => h.cause === "PERFORMANCE_ANXIETY")?.current_probability ?? 0)
    : 0;

  return {
    masteryScore,
    hypothesisCauses,
    anxietyProb,
    currentLevel: typeof lastHomework?.zpa_level === "number" ? lastHomework.zpa_level : undefined,
  };
}

// Inverse partiel de SUBJECT_TO_ACADEMIC_DOMAIN — "langage" est mappé sur "francais" par
// défaut ici (simplification assumée, cf. commentaire sur SUBJECT_TO_ACADEMIC_DOMAIN : le
// référentiel académique n'a pas de sous-domaine "langue étrangère" distinct de "anglais").
const ACADEMIC_DOMAIN_TO_SUBJECT: Record<string, string> = {
  mathematiques: "maths",
  langage: "francais",
  sciences: "sciences",
};

// Correctif (2026-07-22) : AcademicHomeworkInput.tsx accepte une prop `detectedGaps` (affiche
// un badge "Lacune détectée" + l'âge cible par matière), mais la route ne la lui fournissait
// jamais — la prop utilisait toujours son défaut `{}`, donc ce badge n'apparaissait jamais.
// Réutilise computeProgressionTargets (même donnée que le moteur de progression général),
// projetée sur les matières scolaires plutôt que sur les 9 domaines Gardner.
const GetAcademicGapsInput = z.object({ childId: z.string().uuid() });

export const getAcademicGapsForChild = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GetAcademicGapsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Décision #81 : le mentor voit les lacunes scolaires de ses enfants assignés.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const targets = await computeProgressionTargets(db, data.childId);

    const gaps: Record<string, number> = {};
    for (const t of targets) {
      const subject = ACADEMIC_DOMAIN_TO_SUBJECT[t.domain];
      if (subject && t.cause) {
        gaps[subject] = t.targetLevelAge;
      }
    }
    return gaps;
  });

export const generateAcademicHomeworkChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateAcademicHomeworkInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Décision #81 : le mentor génère des devoirs comme le parent.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const query = db
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true);
    if (actor === "owner") query.eq("user_id", userId);
    const { data: child, error: childErr } = await query.maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    if (actor === "owner") await assertChildAccessActive(userId, data.childId);

    // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
    // confiance est dérivée à la lecture (complétions vs abandons, par groupe de talents).
    const interestHypotheses = await getInterestHypothesesSnapshot(db as any, data.childId).catch(
      () => null,
    );

    const { data: existing } = await db
      .from("challenges")
      .select("title")
      .eq("child_id", data.childId)
      .order("created_at", { ascending: false })
      .limit(30);

    const existingTitles = ((existing ?? []) as any[]).map((c) => c.title);

    const gradeInfo = GRADE_LEVEL_METADATA[data.gradeLevel];
    const targetAge = gradeInfo.nominalAge;
    const timeAvailable = data.timeAvailable || "30 min";

    const zpaContext = await computeHomeworkZPAContext(db, data.childId, data.subject, targetAge);
    const zpaResult = calculateZPADifficulty(
      zpaContext.masteryScore,
      zpaContext.hypothesisCauses,
      zpaContext.anxietyProb,
      zpaContext.currentLevel,
    );

    const selectedDriver: BehavioralDriver = data.behavioralDriver || "deconstruire";
    const driverGuidance = DRIVER_FUSION_GUIDANCE[selectedDriver];
    const subjectLabel = ACADEMIC_SUBJECT_LABELS[data.subject];

    const topic = data.suggestedTopicId
      ? findCurriculumTopic(data.gradeLevel, data.subject, data.suggestedTopicId)
      : undefined;
    const topicContext = topic
      ? `- Thème de programme suggéré : "${topic.name}" (Accroche : ${topic.hook})`
      : "";

    const prompt = buildHomeworkPrompt({
      childName: child.name,
      childAge: child.age,
      gradeInfoLabel: gradeInfo.label,
      gradeInfoCycle: gradeInfo.cycle,
      profileLocation: [child.city, child.country].filter(Boolean).join(", ") || "non précisé",
      interestsPayload: formatChildInterestsPayload(child.interests, interestHypotheses),
      subjectLabel,
      subject: data.subject,
      gradeLevelKey: data.gradeLevel,
      targetAge,
      homeworkInstruction: data.homeworkInstruction,
      topicContext,
      timeAvailable,
      homeMaterialsLine: data.homeMaterials
        ? `- Matériaux disponibles à la maison : ${data.homeMaterials}`
        : "",
      zpaLevel: zpaResult.level,
      zpaSupportMode: zpaResult.supportMode,
      zpaRationale: zpaResult.rationale,
      anxietyLine: zpaResult.isAnxietyDamped
        ? "- CONTEXTE D'ANXIÉTÉ DÉTECTÉ : Propose un soutien renforcé, rassurant et très guidé (mode HIGH_SUPPORT)."
        : "",
      driverGuidance,
      selectedDriver,
      existingTitles,
    });

    const content = await callClaude(prompt, true, undefined, 3000);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonFromLLMResponse(content));
    } catch (err) {
      console.error(
        "Error parsing generateAcademicHomeworkChallenge LLM response:",
        err,
        "Raw:",
        content,
      );
      throw new Error("Réponse IA invalide");
    }

    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
    void verifyAndLog({
      kind: "homework",
      output: parsed,
      context: {
        childAge: child.age,
        childName: child.name,
        anxietyDamped: zpaResult.isAnxietyDamped,
        existingTitles,
      },
      sourceFunction: "generateAcademicHomeworkChallenge",
      childId: data.childId,
      model: "deepseek-v4-flash",
    });

    let c: z.infer<typeof ChallengeSchema>;
    try {
      c = ChallengeSchema.parse(parsed);
    } catch (err) {
      console.error("Schema validation failed for academic challenge:", err);
      throw new Error("Réponse IA invalide — structure non conforme.");
    }

    const finalized = finalizeChallenge(c, child.age);

    try {
      await db.from("observation_events").insert({
        child_id: data.childId,
        user_id: userId,
        type: "ACADEMIC_HOMEWORK_GENERATED",
        source: "app",
        payload: {
          subject: data.subject,
          grade_level: data.gradeLevel,
          behavioral_driver: selectedDriver,
          zpa_level: zpaResult.level,
          is_anxiety_damped: zpaResult.isAnxietyDamped,
        },
      });
    } catch (err) {
      console.error("Telemetry event insert failed (non-fatal):", err);
    }

    return {
      ...c,
      ...finalized,
      academic_subject: data.subject,
      academic_grade_level: data.gradeLevel,
      homework_instruction: data.homeworkInstruction,
      behavioral_driver: selectedDriver,
      zpa_level: zpaResult.level,
    };
  });

const GenerateSingleInput = z.object({
  childId: z.string().uuid(),
  timeAvailable: z.string().optional(),
  location: z.string().optional(),
  homeMaterials: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  materialScope: z.enum(["home", "outdoor", "buy", "mixed"]).optional().default("mixed"),
});

export const generateSingleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateSingleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Décision #81 : le mentor compose un défi ciblé comme le parent.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const query = db
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true);
    if (actor === "owner") query.eq("user_id", userId);
    const { data: child, error: childErr } = await query.maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    if (actor === "owner") await assertChildAccessActive(userId, data.childId);

    // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
    // confiance est dérivée à la lecture (complétions vs abandons, par groupe de talents).
    const interestHypotheses = await getInterestHypothesesSnapshot(db as any, data.childId).catch(
      () => null,
    );

    // Unlike generateChallenges (the batch generator), this on-demand single-défi
    // path never checked recent titles at all — a parent clicking "Composer un défi
    // ciblé" repeatedly could get literal duplicates. Fetching both in parallel
    // matches generateChallenges' existing pattern instead of inventing a new one.
    const [
      { data: completedChallenges },
      { data: existing },
      progressionTargets,
      { data: latestChildQuestion },
    ] = await Promise.all([
      db
        .from("challenges")
        .select("title, domain, ai_observations")
        .eq("child_id", data.childId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(6),
      db
        .from("challenges")
        .select("title")
        .eq("child_id", data.childId)
        .order("created_at", { ascending: false })
        .limit(30),
      computeProgressionTargets(db, data.childId),
      // Question formulée par l'enfant lui-même (chantier « Deuxième colonne
      // vertébrale », 2026-08-15) — fil conducteur de la génération ciblée.
      db
        .from("challenges")
        .select("child_question")
        .eq("child_id", data.childId)
        .not("child_question", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const completedSummary = ((completedChallenges ?? []) as any[])
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ""}"`)
      .join("\n");
    const existingTitles = ((existing ?? []) as any[]).map((c) => c.title);
    const childQuestionNote = (latestChildQuestion?.child_question ?? "").trim();

    const timeAvailable = data.timeAvailable || "30 min";
    const location = data.location || "Maison (Intérieur)";
    const targetDomain = data.domain && data.domain !== "all" ? data.domain : null;

    const domainInstruction = targetDomain
      ? `3. Tu DOIS générer un défi spécifiquement dans le domaine d'intelligence ou la catégorie suivante : "${targetDomain}". Adapte l'activité pour cibler ce domaine précis.`
      : `3. Les intelligences actuellement les moins explorées chez cet enfant sont ${getLeastExploredTalentLabels(child.talents as Record<string, number> | null).join(" et ")}. Sauf si le temps/lieu disponible les rend peu réalistes, choisis un domaine d'intelligence qui cible l'une de ces intelligences plutôt que de renforcer un talent déjà confirmé. Tu peux créer des défis "hybrides" (ex: utiliser l'art pour comprendre les mathématiques).`;

    const materialScopeInstruction =
      data.materialScope === "home"
        ? "5. MATÉRIEL (MAISON) : Le défi doit être réalisable avec les objets trouvés à la maison (intérieur) ou dans la chambre."
        : data.materialScope === "outdoor"
          ? "5. MATÉRIEL (NATURE/EXTÉRIEUR) : Le défi doit utiliser principalement des éléments trouvés dans la nature, à l'extérieur (jardin, parc, rue) ou récupérés dehors."
          : data.materialScope === "buy"
            ? "5. MATÉRIEL (À ACHETER) : Le défi peut impliquer d'aller acheter du petit matériel en grande surface, quincaillerie ou papeterie (abordable)."
            : "5. MATÉRIEL (MIXTE) : Libre à toi ! Tu peux mixer du matériel de maison, des éléments trouvés dehors dans la nature, ou du petit matériel abordable à acheter (ex: colle spéciale, peinture).";

    const prompt = buildSingleChallengePrompt({
      childName: child.name,
      childAge: child.age,
      profileLocation: [child.city, child.country].filter(Boolean).join(", ") || "non précisé",
      interestsPayload: formatChildInterestsPayload(child.interests, interestHypotheses),
      talentsJson: JSON.stringify(child.talents || {}),
      completedSummary,
      existingTitles,
      timeAvailable,
      immediateLocation: location,
      homeMaterialsLine: data.homeMaterials
        ? `- Matériaux/objets disponibles à la maison : ${data.homeMaterials}`
        : "",
      progressionInstruction: formatProgressionInstruction(progressionTargets),
      domainInstruction,
      materialScopeInstruction,
      homeMaterialsUseLine: data.homeMaterials
        ? `6. UTILISATION DES MATÉRIAUX MENTIONNÉS : Tu DOIS concevoir un défi qui utilise en priorité ou exclusivement les matériaux indiqués par le parent ("${data.homeMaterials}"). Si ces matériaux ne suffisent pas, tu PEUX inclure d'autres ustensiles en fonction de la consigne (MAISON/EXTÉRIEUR/ACHAT/MIXTE).`
        : "",
      timePressureNote: formatTimePressureNote(
        child.time_pressure as TimePressure | null | undefined,
      ),
      profileContextNote: formatChildProfileContext(child as any),
      childQuestionNote,
    });

    // A single défi, not a batch — the 4000 default (sized for up to 6 défis
    // in generateChallenges) would needlessly reserve most of the org's
    // per-minute output-token budget for a response that only needs a
    // fraction of that.
    const content = await callClaude(prompt, true, undefined, 3000);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonFromLLMResponse(content));
    } catch (err) {
      console.error("Error parsing generateSingleChallenge LLM response:", err, "Raw:", content);
      throw new Error("Réponse IA invalide");
    }

    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
    void verifyAndLog({
      kind: "challenge_single",
      output: parsed,
      context: { childAge: child.age, childName: child.name, existingTitles },
      sourceFunction: "generateSingleChallenge",
      childId: data.childId,
      model: "deepseek-v4-flash",
    });

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

    // Décision #81 : le mentor (remplaçant du parent) lit aussi la synthèse Naya
    // de ses enfants assignés — assertChildActor, lectures service role si mentor
    // (la RLS ne rend pas les défis non-complétés).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const query = db
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .is("access_locked_at", null)
      .eq("is_active", true);
    if (actor === "owner") query.eq("user_id", userId);
    const { data: child } = await query.single();

    if (!child) throw new Error("Profil introuvable");

    const { data: completed } = await db
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
    const lastGeneratedAt = child.ai_synthesis_generated_at
      ? new Date(child.ai_synthesis_generated_at).getTime()
      : 0;
    if (child.ai_synthesis && Date.now() - lastGeneratedAt < ONE_WEEK_MS) {
      return child.ai_synthesis;
    }

    const completedSummary = ((completed ?? []) as any[])
      .map(
        (c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? "Pas d'observation"}"`,
      )
      .join("\n");

    // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
    // confiance est dérivée à la lecture (complétions vs abandons, par groupe de talents).
    const interestHypotheses = await getInterestHypothesesSnapshot(db as any, data.childId).catch(
      () => null,
    );
    const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);

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
      const synthesis = await callClaude(prompt, false, undefined, 2000);
      // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant.
      void verifyAndLog({
        kind: "synthesis",
        output: synthesis,
        sourceFunction: "getChildAISynthesis",
        childId: data.childId,
        model: "deepseek-v4-flash",
      });
      // Only refresh the cache on a genuine success — a transient
      // quota/API failure must not lock in the fallback message as "the"
      // synthesis for the next 7 days.
      await db
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
      .is("access_locked_at", null)
      .eq("is_active", true)
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
    const lastGeneratedAt = child.passport_letter_generated_at
      ? new Date(child.passport_letter_generated_at).getTime()
      : 0;
    if (child.passport_letter && Date.now() - lastGeneratedAt < ONE_WEEK_MS) {
      return child.passport_letter;
    }

    const domainCounts: Record<string, number> = {};
    for (const c of completed) domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([d]) => d);

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
      const letter = await callClaude(prompt, false, undefined, 1500);
      // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant.
      void verifyAndLog({
        kind: "letter",
        output: letter,
        sourceFunction: "getPassportLetter",
        childId: data.childId,
        model: "deepseek-v4-flash",
      });
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
Le parent a indiqué que cette activité était liée au domaine : ${data.domain || "Non spécifié"}.
Ton but est de valider cette preuve et d'y apposer ton "Tampon pédagogique".
Réponds STRICTEMENT en une seule phrase courte, chaleureuse et valorisante. Ta phrase DOIT mentionner l'intelligence principale que l'enfant a dû utiliser dans cette scène (ex: spatiale, créative, kinesthésique, logico-mathématique, naturaliste, etc.).
Exemple: "Naya détecte une forte intelligence spatiale et créative dans cette magnifique construction !"
NE mets PAS de guillemets autour de ta réponse.`;

    // One short sentence, capped at 150 chars below — 4000 was ~25x more
    // budget than this could ever use.
    const tag = await callClaude(prompt, false, data.imageUrl, 200);
    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant.
    void verifyAndLog({
      kind: "proof_tampon",
      output: { tampon: tag },
      sourceFunction: "analyzePostProof",
      model: "claude-sonnet-5",
    });
    return tag.trim().slice(0, 150); // safety cap
  });

// ── Découverte d'intérêt (décision #81) ────────────────────────────────────
// Le portfolio propose au parent de confirmer un centre d'intérêt détecté par
// Naya (écriture child_profiles.interests). Le mentor — remplaçant du parent —
// peut valider la même découverte sur ses enfants assignés (assertChildActor).
// Le write passait auparavant par le client (RLS) ; ici il passe par le serveur
// pour couvrir les deux acteurs sans dépendre de la RLS.
const AcceptInterestInput = z.object({
  childId: z.string().uuid(),
  label: z.string().min(1).max(80),
});

export const acceptChildInterestDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AcceptInterestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await assertChildActor(supabaseAdmin as any, userId, data.childId);
    const db: any = actor === "mentor" ? (supabaseAdmin as any) : supabase;

    const { data: child } = await db
      .from("child_profiles")
      .select("id, interests")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child) throw new Error("Profil enfant introuvable.");

    const interests = Array.from(new Set<string>([...(child.interests ?? []), data.label]));
    const { data: updated, error } = await db
      .from("child_profiles")
      .update({ interests })
      .eq("id", data.childId)
      .select("interests")
      .single();
    if (error) throw new Error(error.message);
    return { interests: updated.interests };
  });
