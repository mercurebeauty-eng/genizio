// Moteur pur du Copilote Professeur (Phase 2) — préparation de cours différenciée
// en 30 secondes. SANS dépendance réseau ni serveur : le prompt, le parse
// déterministe et la segmentation de classe sont testables unitairement.
//
// Contrat JSON de la fiche (snake_case, tel que stocké en base et vérifié par le
// Loup — GenerationKind "educator_lesson_fiche") : local_anchor, channel_groups
// (4 canaux obligatoires), exercises (3 niveaux), board_plan, timing.
//
// Privacy by design : ce moteur ne manipule QUE des agrégats de classe
// (distribution des canaux, tailles de groupes). Jamais de noms d'enfants,
// jamais de dossiers psychométriques individuels — l'attribution des élèves aux
// groupes reste un geste humain du professeur.

import { z } from "zod";
import type { GlmContentPart } from "@/lib/glm.server";

// ── Canaux cognitifs (vocabulaire fermé) ────────────────────────────────────

export type CognitiveChannel = "manipulatif" | "visuo_spatial" | "logico_abstrait" | "narratif";

export const COGNITIVE_CHANNELS: readonly CognitiveChannel[] = [
  "manipulatif",
  "visuo_spatial",
  "logico_abstrait",
  "narratif",
];

export const COGNITIVE_CHANNEL_LABEL: Record<CognitiveChannel, string> = {
  manipulatif: "✋ Manipulatifs / Kinesthésiques",
  visuo_spatial: "👁️ Visuo-Spatiaux",
  logico_abstrait: "🧠 Logico-Abstraits",
  narratif: "📖 Narratifs / Linguistiques",
};

// Miroir de PRESENTATION_MODES (modalities.functions.ts) — copié localement pour
// garder ce module pur (modalities.functions importe le serveur au chargement).
// Le test educator-copilot.test.ts verrouille l'égalité stricte avec la source.
export const LESSON_PRESENTATION_MODES = [
  "texte",
  "image",
  "demonstration",
  "manipulation",
  "histoire",
  "analogie",
  "conversation",
  "projet",
  "situation_concrete",
] as const;

export type LessonPresentationMode = (typeof LESSON_PRESENTATION_MODES)[number];

export const COGNITIVE_CHANNEL_BY_MODE: Record<LessonPresentationMode, CognitiveChannel> = {
  manipulation: "manipulatif",
  situation_concrete: "manipulatif",
  projet: "manipulatif",
  image: "visuo_spatial",
  analogie: "visuo_spatial",
  demonstration: "logico_abstrait",
  texte: "logico_abstrait",
  histoire: "narratif",
  conversation: "narratif",
};

// Miroir des 9 clés Gardner (gardner.ts) → canal dominant. Copie locale verrouillée
// par test (pattern naya-verifier : VALID_TALENT_KEYS).
export const GARDNER_KEYS = [
  "logico_mathematique",
  "creative",
  "corporelle",
  "linguistique",
  "spatial",
  "sociale",
  "emotionnelle",
  "artisanale",
  "entrepreneuriale",
] as const;

export type GardnerKeyMirror = (typeof GARDNER_KEYS)[number];

export const GARDNER_KEY_TO_CHANNEL: Record<GardnerKeyMirror, CognitiveChannel> = {
  corporelle: "manipulatif",
  artisanale: "manipulatif",
  spatial: "visuo_spatial",
  creative: "visuo_spatial",
  logico_mathematique: "logico_abstrait",
  linguistique: "narratif",
  sociale: "narratif",
  emotionnelle: "narratif",
  entrepreneuriale: "manipulatif",
};

// ── Entrées du copilote ─────────────────────────────────────────────────────

export type CopilotSource =
  | { kind: "text"; subject: string; theme: string; chapter?: string; objectives?: string }
  | { kind: "photo"; imageBase64: string; mediaType: string; hint?: string }
  | { kind: "voice"; transcript: string; subject?: string };

export interface ClassAcademicContext {
  averageGrade?: number;
  gradeTrend?: "progression" | "stable" | "fragile";
  teacherObservations?: string[];
}

export interface ClassSegmentation {
  /** Effectif réel saisi par le professeur (40–70 dans les classes cibles). */
  headcount: number;
  /** Ex. "6e", "CM2", "3ème". */
  gradeLevel: string;
  /** Contexte géographique pour l'ancrage métier local, ex. "Côte d'Ivoire". */
  countryContext: string;
  /** Données et observations académiques réelles de la classe pour calibrer l'étayage. */
  academicContext?: ClassAcademicContext;
}

// ── Fiche (contrat JSON, snake_case) ────────────────────────────────────────

export interface LessonFiche {
  subject: string;
  topic: string;
  grade_level: string;
  local_anchor: {
    /** Métier local réel (artisanat, commerce, urbanisme, énergie, numérique…). */
    trade: string;
    /** Explication concrète de l'utilité de la leçon dans ce métier. */
    explanation: string;
    /** La question d'accroche qui répond à « À quoi ça sert ? ». */
    hook_question: string;
  };
  channel_groups: Array<{
    channel: CognitiveChannel;
    presentation_modes: LessonPresentationMode[];
    group_size: number;
    activity: {
      title: string;
      materials: string[];
      steps: string[];
      duration_min: number;
    };
  }>;
  exercises: Array<{
    level: 1 | 2 | 3;
    label: string;
    statement: string;
    expected_answer: string;
    common_mistake?: string;
  }>;
  board_plan: string[];
  timing: Array<{ phase: string; minutes: number }>;
}

export const LessonFicheSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  grade_level: z.string().min(1),
  local_anchor: z.object({
    trade: z.string().min(1),
    explanation: z.string().min(1),
    hook_question: z.string().min(1),
  }),
  channel_groups: z
    .array(
      z.object({
        channel: z.string(),
        presentation_modes: z.array(z.string()).default([]),
        group_size: z.number(),
        activity: z.object({
          title: z.string().min(1),
          materials: z.array(z.string()).default([]),
          steps: z.array(z.string()).default([]),
          duration_min: z.number().default(10),
        }),
      }),
    )
    .min(1),
  exercises: z
    .array(
      z.object({
        level: z.number(),
        label: z.string().default(""),
        statement: z.string().min(1),
        expected_answer: z.string().min(1),
        common_mistake: z.string().optional(),
      }),
    )
    .min(1),
  board_plan: z.array(z.string()).default([]),
  timing: z.array(z.object({ phase: z.string(), minutes: z.number() })).default([]),
});

// ── Erreurs typées ──────────────────────────────────────────────────────────

export class FicheParseError extends Error {
  constructor(
    readonly reason:
      | "no_json"
      | "invalid_json"
      | "schema_mismatch"
      | "missing_channel"
      | "missing_exercise_level",
    detail?: string,
  ) {
    super(`Fiche copilote invalide (${reason})${detail ? ` : ${detail}` : ""}`);
    this.name = "FicheParseError";
  }
}

// ── Prompt structuré ────────────────────────────────────────────────────────

const FICHE_JSON_SPEC = `Réponds UNIQUEMENT avec le JSON brut de la fiche (aucun texte autour, aucun bloc markdown), avec EXACTEMENT ces clés :
{
  "subject": "<discipline, ex: Mathématiques>",
  "topic": "<thème précis de la séance>",
  "grade_level": "<niveau repris de l'entrée>",
  "local_anchor": { "trade": "<métier local>", "explanation": "<2-3 phrases concrètes : ce que fait le professionnel, et comment la notion du jour sert dans son travail>", "hook_question": "<1 question d'accroche pour ouvrir la séance>" },
  "channel_groups": [ 4 objets, UN PAR CANAL, dans l'ordre: manipulatif, visuo_spatial, logico_abstrait, narratif,
    { "channel": "<canal>", "presentation_modes": ["<modalités de ce canal>"], "group_size": <nombre d'élèves du groupe, la somme des 4 = effectif>, "activity": { "title": "...", "materials": ["<objets simples du quotidien local>"], "steps": ["3 à 5 étapes exploitables telles quelles"], "duration_min": <nombre> } } ],
  "exercises": [ 3 objets, niveaux 1 puis 2 puis 3,
    { "level": 1, "label": "Socle", "statement": "<énoncé complet prêt à dicter>", "expected_answer": "<réponse attendue>", "common_mistake": "<erreur fréquente, optionnel>" } ],
  "board_plan": ["<ligne 1 au tableau>", "<ligne 2>", ...],
  "timing": [ { "phase": "<phase>", "minutes": <nombre> }, ... ]
}`;

const COPILOT_PRINCIPLES = `PRINCIPES GÉNIZIO POUR LES FICHES PROFESSEUR (stricts) :
- ZÉRO ÉCRAN POUR L'ÉLÈVE : aucune activité ne doit demander à un élève d'utiliser un téléphone, un ordinateur ou une tablette. Le matériel est physique, le tableau est le seul support visuel collectif.
- ANCRAGE LOCAL RÉEL : le métier de "local_anchor" doit exister dans le contexte géographique indiqué (urbanisme, artisanat, commerce, énergie, agriculture, numérique) — jamais un exemple générique importé.
- MATÉRIEL ACCESSIBLE : chaque activité doit être réalisable avec des objets du quotidien local (ficelle, papier, bouteilles, tissus, cailloux, craie, marché) — rien de coûteux ni introuvable.
- CHIFFRES ET MESURES RÉELS : les énoncés d'exercices contiennent des valeurs exactes (pas "un peu de", "plein de") alignées sur le niveau scolaire indiqué.
- 4 CANAUX DISTINCTS : chaque groupe reçoit une activité réellement différente selon son canal (manipulatif = gestes concrets ; visuo_spatial = schémas, codes couleurs, analogies géométriques ; logico_abstrait = démonstrations formelles, algèbre, défis d'algorithmique ; narratif = récit, énigme textuelle, contextualisation romancée). Ne reformule jamais la même activité 4 fois.
- DIFFÉRENCIATION RÉELLE : niveau 1 (Socle) = ancrage sans piège, pour redonner confiance ; niveau 2 (Standard) = application directe du programme ; niveau 3 (Dépassement) = énigme complexe pour les élèves en avance.
- FICHE ENSEIGNABLE TELLE QUELLE : le professeur doit pouvoir mener la séance en lisant la fiche — étapes formulées en consignes prêtes à dire, durées réalistes, chronométrage sommant une séance standard.
- AUCUNE syntaxe Markdown dans les champs texte. Relecture obligatoire : zéro faute d'orthographe ou de grammaire.
- CONFIDENTIALITÉ : la fiche ne mentionne JAMAIS de nom d'élève ni de données individuelles — uniquement des groupes et des agrégats.`;

/**
 * Construit le prompt de déconstruction de sens. Retourne un message system
 * (posture + principes + contrat JSON) et un user (source multimodale +
 * segmentation de classe). La répartition des groupes est DÉJÀ fixée côté
 * déterministe (coerce/default) : le modèle ne décide pas des tailles, il les
 * respecte — la cohérence arithmétique ne se délègue pas à un LLM.
 */
export function buildLessonDeconstructionPrompt(params: {
  source: CopilotSource;
  segmentation: ClassSegmentation;
  groupSizes: number[]; // ordre : [manipulatif, visuo_spatial, logico_abstrait, narratif]
}): { system: string; user: string | GlmContentPart[] } {
  const { source, segmentation, groupSizes } = params;

  const sizesByChannel = COGNITIVE_CHANNELS.map((c, i) => `${c} : ${groupSizes[i] ?? 0} élèves`).join(
    ", ",
  );
  let segmentationBlock = `CONTEXTE CLASSE :
- Effectif total : ${segmentation.headcount} élèves — la somme des "group_size" doit être EXACTEMENT ${segmentation.headcount}.
- Répartition imposée par canal (déjà calculée, à respecter scrupuleusement) : ${sizesByChannel}.
- Niveau scolaire : ${segmentation.gradeLevel}.
- Contexte géographique de l'établissement : ${segmentation.countryContext} — l'ancrage métier et le matériel en découlent.`;

  if (segmentation.academicContext) {
    const ac = segmentation.academicContext;
    const details: string[] = [];
    if (ac.averageGrade != null) {
      details.push(`Moyenne académique observée de la cohorte : ${ac.averageGrade}/20 (${ac.gradeTrend === "fragile" ? "Consolidation socle prioritaire" : ac.gradeTrend === "progression" ? "Bonne dynamique d'acquisition" : "Niveau moyen standard"})`);
    }
    if (ac.teacherObservations && ac.teacherObservations.length > 0) {
      details.push(`Observations réelles des enseignants : "${ac.teacherObservations.join('", "')}"`);
    }
    if (details.length > 0) {
      segmentationBlock += `\n- PROFIL ACADÉMIQUE DE LA CLASSE (SOURCE RÉELLE) :\n  ${details.map((d) => `* ${d}`).join("\n  ")}\n  * Directive de calibration : adapte la progressivité des exercices et le niveau d'étayage des activités en tenant compte de ces forces et fragilités réelles.`;
    }
  }

  const system = `Tu es le Copilote Professeur de Génizio, l'assistant de préparation de cours pour enseignants d'Afrique francophone et de la diaspora. Ta mission : transformer une entrée (texte, photo d'exercice ou dictée) en une FICHE DE PRÉPARATION complète, différenciée en 4 canaux cognitifs, enseignable immédiatement avec des effectifs de 40 à 70 élèves et ZÉRO écran pour l'élève.

${COPILOT_PRINCIPLES}

${FICHE_JSON_SPEC}`;

  let sourceBlock: string;
  const parts: GlmContentPart[] = [];
  if (source.kind === "photo") {
    parts.push({
      type: "text",
      text: `SOURCE : photo d'une page de manuel ou d'un exercice, fournie en image. Extrait fidèlement le contenu (discipline, notion, énoncés) puis construis la fiche à partir de CE contenu.${source.hint ? ` Indication du professeur : ${source.hint}` : ""}`,
    });
    parts.push({
      type: "image_url",
      image_url: { url: `data:${source.mediaType};base64,${source.imageBase64}` },
    });
    parts.push({ type: "text", text: segmentationBlock });
    return { system, user: parts };
  }
  if (source.kind === "voice") {
    sourceBlock = `SOURCE : dictée vocale du professeur, transcrite mot à mot :
"""${source.transcript}"""`;
  } else {
    sourceBlock = `SOURCE : saisie texte du professeur.
- Discipline : ${source.subject}
- Thème / leçon : ${source.theme}
- Chapitre du programme : ${source.chapter ?? "(non précisé)"}
- Objectifs pédagogiques : ${source.objectives ?? "(non précisés)"}`;
  }
  return { system, user: `${sourceBlock}\n\n${segmentationBlock}` };
}

// ── Extraction & parse déterministes ────────────────────────────────────────

/** Extrait le premier objet JSON d'une réponse LLM (gère les fences ```json). */
export function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new FicheParseError("no_json");
  return candidate.slice(start, end + 1);
}

/**
 * Répare déterministement les tailles de groupes pour que la somme égale
 * l'effectif : négatifs clampés à 0, delta réparti en tour de table (1 par 1,
 * rotation équitable entre groupes — jamais un groupe drainé seul), retrait
 * sans jamais passer sous 0. La cohérence arithmétique ne se délègue pas au LLM.
 */
export function coerceGroupSizes(sizes: number[], headcount: number): number[] {
  const out = sizes.map((s) => (Number.isFinite(s) && s > 0 ? Math.floor(s) : 0));
  const target = Math.max(0, Math.floor(headcount));
  let delta = target - out.reduce((a, b) => a + b, 0);
  const n = out.length;
  if (n === 0) return out;

  let cursor = 0;
  let guard = 0;
  while (delta > 0 && guard < 100_000) {
    out[cursor % n] += 1;
    cursor += 1;
    delta -= 1;
    guard += 1;
  }
  // Retrait : tour de table en sautant les groupes déjà à 0.
  while (delta < 0 && guard < 100_000) {
    const idx = cursor % n;
    if (out[idx] > 0) {
      out[idx] -= 1;
      delta += 1;
    }
    cursor += 1;
    guard += 1;
  }
  return out;
}

/** Répartition de repli 25/25/25/25 arrondie (sans profil talents disponible). */
export function defaultGroupSizes(headcount: number): number[] {
  const base = Math.floor(Math.max(0, headcount) / 4);
  const remainder = headcount - base * 4;
  return [0, 1, 2, 3].map((i) => base + (i < remainder ? 1 : 0));
}

/**
 * Agrège des profils talents (9 clés Gardner, scores) en compte d'enfants par
 * canal cognitif — à partir du talent DOMINANT de chaque enfant. Agrégat pur :
 * aucune donnée individuelle ne traverse cette fonction vers la fiche.
 */
export function distributionFromTalents(children: Array<{
  talents: Record<string, number>;
}>): Record<CognitiveChannel, number> {
  const dist: Record<CognitiveChannel, number> = {
    manipulatif: 0,
    visuo_spatial: 0,
    logico_abstrait: 0,
    narratif: 0,
  };
  for (const child of children) {
    // Clés inconnues et scores invalides ignorés AVANT la recherche du dominant :
    // une clé parasite ne doit pas masquer le vrai talent dominant.
    let bestKey: string | null = null;
    let bestScore = -Infinity;
    for (const [key, score] of Object.entries(child.talents ?? {})) {
      if (!(key in GARDNER_KEY_TO_CHANNEL)) continue;
      if (typeof score !== "number" || Number.isNaN(score)) continue;
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
    if (bestKey) {
      dist[GARDNER_KEY_TO_CHANNEL[bestKey as GardnerKeyMirror]] += 1;
    }
  }
  return dist;
}

/** Échelle une distribution (échantillon talents) vers l'effectif réel de la classe. */
export function groupSizesFromDistribution(
  dist: Partial<Record<CognitiveChannel, number>>,
  headcount: number,
): number[] {
  const counts = COGNITIVE_CHANNELS.map((c) => Math.max(0, Math.floor(dist[c] ?? 0)));
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return defaultGroupSizes(headcount);
  const scaled = counts.map((c) => (c / total) * headcount);
  // Arrondi à la plus grande fraction (méthode des restes, simple : floor + reste
  // aux plus grandes décimales) pour minimiser la déviation.
  const floors = scaled.map(Math.floor);
  let remainder = headcount - floors.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let k = 0;
  while (remainder > 0 && order.length > 0) {
    floors[order[k % order.length].i] += 1;
    remainder -= 1;
    k += 1;
  }
  return coerceGroupSizes(floors, headcount);
}

/**
 * Parse la réponse du LLM en fiche validée : extraction JSON, schéma zod,
 * contrôle des 4 canaux et des 3 niveaux (on ne sait pas les inventer — erreur
 * typée pour régénération), coercion des tailles de groupes sur l'effectif.
 * Retourne les réparations appliquées dans `warnings` (affichées au prof).
 */
export function parseLessonFiche(
  raw: string,
  headcount: number,
): { fiche: LessonFiche; warnings: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonBlock(raw));
  } catch (err) {
    if (err instanceof FicheParseError) throw err;
    throw new FicheParseError("invalid_json", err instanceof Error ? err.message : undefined);
  }

  const check = LessonFicheSchema.safeParse(parsed);
  if (!check.success) {
    const firstIssue = check.error.issues[0];
    throw new FicheParseError(
      "schema_mismatch",
      `${firstIssue?.path.join(".")} : ${firstIssue?.message}`,
    );
  }
  const data = check.data;
  const warnings: string[] = [];

  // Canaux : déduplication (premier groupe gagne), exhaustivité obligatoire.
  const byChannel = new Map<string, (typeof data.channel_groups)[number]>();
  for (const g of data.channel_groups) {
    if (!byChannel.has(g.channel)) byChannel.set(g.channel, g);
  }
  const missing = COGNITIVE_CHANNELS.filter((c) => !byChannel.has(c));
  if (missing.length > 0) {
    throw new FicheParseError("missing_channel", missing.join(", "));
  }
  const groups = COGNITIVE_CHANNELS.map((c) => byChannel.get(c)!);

  // Exercices : un et un seul par niveau, 3 niveaux obligatoires.
  const byLevel = new Map<number, (typeof data.exercises)[number]>();
  for (const e of data.exercises) {
    if ([1, 2, 3].includes(e.level) && !byLevel.has(e.level)) byLevel.set(e.level, e);
  }
  const missingLevels = [1, 2, 3].filter((l) => !byLevel.has(l));
  if (missingLevels.length > 0) {
    throw new FicheParseError("missing_exercise_level", `niveaux ${missingLevels.join(", ")}`);
  }

  // Coercion des tailles sur l'effectif réel.
  const rawSizes = groups.map((g) => g.group_size);
  const coerced = coerceGroupSizes(rawSizes, headcount);
  if (coerced.some((s, i) => s !== rawSizes[i])) {
    warnings.push(
      `Tailles de groupes ajustées à l'effectif (${rawSizes.join(" + ")} → ${coerced.join(" + ")} = ${headcount}).`,
    );
  }

  const fiche: LessonFiche = {
    subject: data.subject,
    topic: data.topic,
    grade_level: data.grade_level,
    local_anchor: data.local_anchor,
    channel_groups: groups.map((g, i) => ({
      channel: g.channel as CognitiveChannel,
      presentation_modes: g.presentation_modes.filter((m): m is LessonPresentationMode =>
        (LESSON_PRESENTATION_MODES as readonly string[]).includes(m),
      ),
      group_size: coerced[i],
      activity: g.activity,
    })),
    exercises: [1, 2, 3].map((level) => byLevel.get(level)!) as LessonFiche["exercises"],
    board_plan: data.board_plan,
    timing: data.timing,
  };

  return { fiche, warnings };
}
