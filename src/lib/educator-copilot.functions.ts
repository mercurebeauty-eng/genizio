// Server functions du Copilote Professeur (Phase 2) — pipeline complet :
// auth → profil éducateur → quota journalier → segmentation de classe
// (agrégats talents si disponibles, répartition par défaut sinon) →
// génération GLM 5.3 Flash (fallback Claude en cas d'échec/vision refusée) →
// parse déterministe avec retry correctif → audit Loup → persistance.
//
// Privacy : la segmentation ne manipule que des agrégats (distribution des 4
// canaux) ; aucune donnée individuelle d'élève n'entre dans une fiche.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRateLimit } from "@/lib/rate-limit.middleware";
import {
  buildLessonDeconstructionPrompt,
  defaultGroupSizes,
  distributionFromTalents,
  extractOutOfScope,
  FicheParseError,
  groupSizesFromDistribution,
  parseLessonFiche,
  type ClassAcademicContext,
  type CopilotSource,
  type LessonFiche,
} from "@/lib/educator-copilot";
import { callGLM, GlmVisionUnsupportedError } from "@/lib/glm.server";
import { verifyAndLog } from "@/lib/naya-verifier.functions";
import {
  consumeAiFeatureQuota,
  resolveAiDailyLimit,
} from "@/lib/ai-usage.server";

// ── Validation des entrées ──────────────────────────────────────────────────

const SourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    subject: z.string().min(1).max(120),
    theme: z.string().min(2).max(300),
    chapter: z.string().max(300).optional(),
    objectives: z.string().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("photo"),
    imageBase64: z.string().min(50).max(8_000_000),
    mediaType: z.enum(["image/webp", "image/jpeg", "image/png"]),
    hint: z.string().max(300).optional(),
  }),
  z.object({
    kind: z.literal("voice"),
    transcript: z.string().min(2).max(2000),
    subject: z.string().max(120).optional(),
  }),
]);

const GenerateInputSchema = z.object({
  classCode: z.string().min(1).max(40),
  gradeLevel: z.string().min(1).max(40),
  headcount: z.number().int().min(1).max(120),
  countryContext: z.string().min(1).max(60),
  source: SourceSchema,
});

export interface LessonFicheResult {
  ficheId: string;
  fiche: LessonFiche;
  warnings: string[];
  provider: "glm" | "claude-fallback";
  quotaRemaining: number;
}

// ── Segmentation : agrégats talents de l'établissement ──────────────────────

/**
 * Tailles de groupes par canal [manipulatif, visuo_spatial, logico_abstrait,
 * narratif] sommant EXACTEMENT headcount. Échantillon talents de l'établissement
 * (≥ 5 profils) → scaling proportionnel ; sinon répartition par défaut 25/25/25/25.
 * Toute panne de lecture → dégradation silencieuse (une classe ne doit pas
 * attendre la disponibilité d'une jointure pour préparer son cours).
 */
async function resolveClassGroupSizes(
  db: any,
  schoolId: string | null,
  headcount: number,
): Promise<number[]> {
  if (!schoolId) return defaultGroupSizes(headcount);
  try {
    const { data: rows, error } = await db
      .from("child_schools")
      .select("child_id, child_profiles(talents)")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .limit(500);
    if (error) return defaultGroupSizes(headcount);
    const children = (rows ?? [])
      .map((r: any) => ({ talents: r.child_profiles?.talents ?? {} }))
      .filter((c: { talents: Record<string, number> }) => Object.keys(c.talents).length > 0);
    if (children.length < 5) return defaultGroupSizes(headcount);
    return groupSizesFromDistribution(distributionFromTalents(children), headcount);
  } catch (err) {
    console.error("resolveClassGroupSizes degraded to default split:", err);
    return defaultGroupSizes(headcount);
  }
}

/**
 * Synthèse des observations académiques récentes de l'établissement (moyenne agrégée,
 * tendance et axes de progrès formulés par les enseignants).
 */
async function resolveClassAcademicContext(
  db: any,
  schoolId: string | null,
): Promise<ClassAcademicContext | undefined> {
  if (!schoolId) return undefined;
  try {
    const { data: rows, error } = await db
      .from("child_academic_observations")
      .select("current_average, previous_average, teacher_report_notes")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !rows || rows.length === 0) return undefined;

    const grades = rows
      .map((r: any) => Number(r.current_average))
      .filter((g: number) => !isNaN(g) && g > 0);

    if (grades.length === 0) return undefined;

    const avg = Math.round((grades.reduce((a: number, b: number) => a + b, 0) / grades.length) * 10) / 10;
    const notes = rows
      .map((r: any) => (typeof r.teacher_report_notes === "string" ? r.teacher_report_notes.trim() : ""))
      .filter((n: string) => n.length > 3)
      .slice(0, 3);

    return {
      averageGrade: avg,
      gradeTrend: avg >= 13 ? "progression" : avg >= 10 ? "stable" : "fragile",
      teacherObservations: notes.length > 0 ? notes : undefined,
    };
  } catch (err) {
    console.error("resolveClassAcademicContext degraded:", err);
    return undefined;
  }
}

/** Fusionne les text-parts d'un message multimodal pour le fallback texte Claude. */
function contentPartsToText(user: string | Array<{ type: string; text?: string }>): string {
  if (typeof user === "string") return user;
  return user
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n\n");
}

// ── Génération de fiche ─────────────────────────────────────────────────────

const MAX_ATTEMPTS = 2; // 1 tentative + 1 retry correctif sur parse invalide

const SCOPE_CHECK_SYSTEM = `Tu es le filtre de périmètre du Copilote Professeur de Génizio (spécialisé pédagogie, PAS un assistant généraliste). Détermine si la demande du professeur relève de la préparation de cours : discipline scolaire, notion à expliquer, exercice, leçon, évaluation, différenciation, gestion de classe, orientation scolaire.
Hors périmètre : demandes personnelles ou commerciales (lettres, e-mails, CV, business), génération de code informatique sans contexte scolaire, devoirs à la place des élèves, questions générales sans lien avec l'enseignement, contenu inapproprié.
Réponds STRICTEMENT en JSON : {"in_scope": true} ou {"in_scope": false, "reason": "<courte raison en français>"}.`;

function scopeCheckInput(source: CopilotSource): string | null {
  if (source.kind === "text") {
    return [
      `Discipline : ${source.subject}`,
      `Thème : ${source.theme}`,
      source.chapter ? `Chapitre : ${source.chapter}` : null,
      source.objectives ? `Objectifs : ${source.objectives}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (source.kind === "voice") return `Dictée du professeur : ${source.transcript}`;
  // Photo : page de manuel / exercice par défaut du flux de préparation —
  // l'indication texte du professeur est le seul signal de hors-périmètre.
  return source.hint ? `Indication du professeur (photo jointe) : ${source.hint}` : null;
}

function outOfScopeError(reason: string): Error {
  return new Error(
    `Hors périmètre pédagogique — le Copilote ne traite que la préparation de cours (${reason}). ` +
      `Un assistant généraliste comme ChatGPT ou Gemini sera plus adapté pour cette demande.`,
  );
}

/**
 * Double barrière de périmètre (§16 doc refonte pro) :
 *  1. pré-check léger GLM (~120 tokens) AVANT consommation de quota — un refus
 *     ne brûle pas une fiche ;
 *  2. détection du contrat « out_of_scope » dans la réponse du modèle de
 *     génération (fail-open : sans JSON exploitable, on tente le parse normal).
 * Panne du filtre → fail-open : la génération elle-même reste contrainte par
 * le contrat de périmètre du prompt système.
 */
async function assertPedagogicalScope(source: CopilotSource): Promise<void> {
  const input = scopeCheckInput(source);
  if (!input) return; // photo sans indication → périmètre assumé
  try {
    const res = await callGLM(
      [
        { role: "system", content: SCOPE_CHECK_SYSTEM },
        { role: "user", content: input },
      ],
      { jsonMode: true, maxTokens: 150 },
    );
    const verdict = extractOutOfScope(res.text) ?? null;
    // in_scope:false arrive sous la même forme de refus ; sinon le JSON lu dit
    // in_scope:true (ou est illisible) → on laisse passer.
    if (verdict) throw outOfScopeError(verdict);
    try {
      const parsed = JSON.parse(res.text) as { in_scope?: boolean; reason?: string };
      if (parsed.in_scope === false) throw outOfScopeError(parsed.reason ?? "demande hors cours");
    } catch (scopeErr) {
      if (scopeErr instanceof Error && scopeErr.message.startsWith("Hors périmètre")) throw scopeErr;
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Hors périmètre")) throw err;
    console.warn("Filtre de périmètre indisponible (fail-open) :", (err as Error).message);
  }
}

export const generateClassLessonDeconstruction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => GenerateInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<LessonFicheResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    // 1. Profil éducateur (vérifié ? établissement ?)
    const { data: profile } = await db
      .from("educator_profiles")
      .select("id, is_verified, school_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) {
      throw new Error("Profil éducateur requis : créez votre profil professionnel avant d'utiliser le Copilote.");
    }
    const verified = profile.is_verified === true;

    // 2. Périmètre pédagogique (§16 — refus AVANT consommation de quota)
    await assertPedagogicalScope(data.source);

    // 3. Quota journalier persistant (incrément atomique SQL, fail-open tracé)
    const limit = resolveAiDailyLimit("educator_copilot", verified);
    const quota = await consumeAiFeatureQuota(db, userId, "educator_copilot", limit);
    if (!quota.allowed) {
      throw new Error(
        `Quota journalier du Copilote atteint (${limit} fiches/jour${verified ? "" : ", profil non vérifié"}). Réessayez demain.`,
      );
    }

    // 4. Segmentation (agrégats, jamais de données individuelles)
    const [groupSizes, academicContext] = await Promise.all([
      resolveClassGroupSizes(db, profile.school_id ?? null, data.headcount),
      resolveClassAcademicContext(db, profile.school_id ?? null),
    ]);
    const segmentation = {
      headcount: data.headcount,
      gradeLevel: data.gradeLevel,
      countryContext: data.countryContext,
      academicContext,
    };

    // 5. Génération GLM (fallback Claude) + parse avec retry correctif
    const source: CopilotSource = data.source;
    let provider: "glm" | "claude-fallback" = "glm";
    let lastRaw: string | null = null;
    let repairNote: string | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const prompt = buildLessonDeconstructionPrompt({
        source,
        segmentation,
        groupSizes,
      });
      const userText =
        (typeof prompt.user === "string" ? prompt.user : contentPartsToText(prompt.user)) +
        (repairNote ? `\n\nNOTE CORRECTIVE : ${repairNote}` : "");

      let raw: string;
      try {
        const glmRes = await callGLM(
          [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          { jsonMode: true, maxTokens: 4000 },
        );
        raw = glmRes.text;
        provider = "glm";
      } catch (glmErr) {
        // Fallback Claude : vision refusée par l'endpoint B AI, quota GLM,
        // panne 5xx persistante — le copilote ne tombe jamais en panne sèche.
        console.warn("GLM indisponible, bascule Claude :", (glmErr as Error).message);
        provider = "claude-fallback";
        if (source.kind === "photo") {
          raw = await callClaudeFallback(userText, true, {
            base64: source.imageBase64,
            mediaType: source.mediaType,
          });
        } else {
          raw = await callClaudeFallback(`${prompt.system}\n\n${userText}`, true, undefined);
        }
      }

      try {
        // 2e barrière de périmètre : le modèle de génération peut exercer son
        // propre auto-refus (contrat « out_of_scope » du prompt système).
        const scopeRefusal = extractOutOfScope(raw);
        if (scopeRefusal) throw outOfScopeError(scopeRefusal);

        const { fiche, warnings } = parseLessonFiche(raw, data.headcount);

        // 6. Audit Loup (déterministe + sémantique échantillonnée) — jamais bloquant.
        try {
          await verifyAndLog({
            kind: "educator_lesson_fiche",
            output: fiche,
            sourceFunction: "generateClassLessonDeconstruction",
            context: { headcount: data.headcount, subject: fiche.subject },
          });
        } catch (auditErr) {
          console.error("verifyAndLog (non bloquant) :", auditErr);
        }

        // 7. Photo source conservée (bucket privé) uniquement pour une fiche valide.
        let sourceImagePath: string | null = null;
        if (source.kind === "photo") {
          try {
            const ext = source.mediaType === "image/jpeg" ? "jpg" : source.mediaType.split("/")[1];
            sourceImagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
            await db.storage
              .from("educator-copilot")
              .upload(sourceImagePath, Buffer.from(source.imageBase64, "base64"), {
                contentType: source.mediaType,
              });
          } catch (uploadErr) {
            // La fiche reste valable même si l'archivage de la photo échoue.
            console.error("Upload photo source (non bloquant) :", uploadErr);
            sourceImagePath = null;
          }
        }

        // 7. Persistance
        const { data: inserted, error: insertErr } = await db
          .from("educator_lesson_fiches")
          .insert({
            educator_user_id: userId,
            school_id: profile.school_id ?? null,
            class_code: data.classCode,
            subject: fiche.subject,
            topic: fiche.topic,
            source_kind: source.kind,
            source_image_path: sourceImagePath,
            fiche,
            provider,
          })
          .select("id")
          .single();
        if (insertErr) throw new Error(`Échec de l'enregistrement de la fiche : ${insertErr.message}`);

        return {
          ficheId: inserted.id,
          fiche,
          warnings,
          provider,
          quotaRemaining: quota.remaining,
        };
      } catch (parseErr) {
        // Un auto-refus de périmètre n'est pas une fiche invalide : il ne
        // déclenche pas de retry et remonte tel quel à l'enseignant.
        if (parseErr instanceof Error && parseErr.message.startsWith("Hors périmètre")) {
          throw parseErr;
        }
        lastRaw = raw;
        lastError = parseErr as Error;
        if (parseErr instanceof FicheParseError && attempt < MAX_ATTEMPTS - 1) {
          repairNote = `ta réponse précédente était inutilisable (${parseErr.message}). Régénère la fiche COMPLÈTE en respectant scrupuleusement le schéma JSON demandé (4 canaux, 3 niveaux d'exercices, tailles sommant l'effectif).`;
          continue;
        }
        break;
      }
    }

    throw new Error(
      `La fiche générée n'a pas pu être validée (${lastError?.message}). Reformulez votre demande ou réessayez — le premier jet commençait par : ${lastRaw?.slice(0, 80) ?? "?"}…`,
    );
  });

/**
 * Fallback Claude via la passerelle existante (challenges.functions) :
 * vision Sonnet pour les photos, DeepSeek pour le texte. Import dynamique pour
 * ne pas charger le gros module challenges au démarrage du copilote.
 */
async function callClaudeFallback(
  prompt: string,
  jsonMode: boolean,
  imageData?: { base64: string; mediaType: string },
): Promise<string> {
  const { callClaude } = await import("@/lib/challenges.functions");
  return callClaude(prompt, jsonMode, undefined, 4000, 2, imageData);
}

// Ré-export pour que le module reste la seule surface d'import du copilote.
export { GlmVisionUnsupportedError };

// ── Historique des fiches ───────────────────────────────────────────────────

export const listMyLessonFiches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Array<{ id: string; fiche: LessonFiche; provider: string; createdAt: string }>> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    const { data, error } = await db
      .from("educator_lesson_fiches")
      .select("id, fiche, provider, created_at")
      .eq("educator_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(`Lecture de l'historique impossible : ${error.message}`);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      fiche: row.fiche as LessonFiche,
      provider: row.provider,
      createdAt: row.created_at,
    }));
  });

export const deleteMyLessonFiche = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ ficheId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).claims?.sub as string;

    const { data: row } = await db
      .from("educator_lesson_fiches")
      .select("id, source_image_path")
      .eq("id", data.ficheId)
      .eq("educator_user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Fiche introuvable ou non autorisée.");

    await db.from("educator_lesson_fiches").delete().eq("id", data.ficheId);
    if (row.source_image_path) {
      await db.storage.from("educator-copilot").remove([row.source_image_path]);
    }
    return { ok: true };
  });
