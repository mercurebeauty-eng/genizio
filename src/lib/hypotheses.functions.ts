import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude, finalizeChallenge, PROOF_MODE_INSTRUCTION } from "@/lib/challenges.functions";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { z } from "zod";

// NAYA 2.0 Phase 3a — moteur de génération d'hypothèses causales (cf. genizio-decisions #32).
// Premier point IA du pipeline NAYA. Rôle *raisonnement* → Sonnet (décision #27 : on paie le
// modèle premium quand le système doit réfléchir, ici uniquement sur anomalie détectée, volume
// faible). Résout la question ouverte sync/async du plan §7 en faveur du synchrone : server
// function TanStack réutilisant callClaude (pattern déjà éprouvé pour generateChallenges/
// validateChallengeProof), aucune nouvelle infra Edge Function, latence hors du chemin critique
// (déclenché en fire-and-forget au chargement du Portfolio, pas sur une action urgente).

const ALLOWED_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
  "OTHER",
] as const;

// ensureHypothesesForChild + narrateForParent + SUBJECT_TO_TALENT/relatedTalentKey
// retirés (cf. genizio-decisions #37) : les notes scolaires étaient l'unique source
// d'anomalie qui amorçait un cycle d'hypothèses — supprimées, sans référentiel stable
// (programme/tranche d'âge/pays inconnus du système). ALLOWED_CAUSES, generateDiscriminantChallenge
// et processDiscriminantResult restent : le moteur bayésien lui-même n'est pas spécifique
// aux notes, prêt à redémarrer sur un futur déclencheur (écart au référentiel académique,
// cf. genizio_referentiel_academique.md) qui insérera dans hypothesis_cycles de la même
// façon.

// ── NAYA 2.0 Phase 3b — Génération de Défi Discriminant & Boucle Bayésienne ──

const DiscriminantInput = z.object({
  childId: z.string().uuid(),
});

export const generateDiscriminantChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => DiscriminantInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Ownership & profil enfant
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, interests, talents")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable.");

    // 2. Récupère le cycle ouvert le plus récent
    const { data: cycle, error: cycleErr } = await supabase
      .from("hypothesis_cycles")
      .select("id, hypotheses")
      .eq("child_id", data.childId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycleErr || !cycle) {
      return { ok: false as const, reason: "NO_OPEN_CYCLE" as const };
    }

    const hypotheses = (cycle.hypotheses as { cause: string; current_probability: number }[]) || [];
    if (hypotheses.length === 0) return { ok: false as const, reason: "NO_HYPOTHESES" as const };

    // Hypothèse prioritaire (celle avec la plus grande probabilité actuelle)
    const topHypothesis = hypotheses[0];

    // Matière concernée — plus de source d'anomalie depuis le retrait des notes scolaires
    // (cf. genizio-decisions #37) ; générique en attendant le futur déclencheur.
    const subject = "apprentissage";

    // 3. Prompt d'IA pour concevoir le défi discriminant
    const interestsStr = (child.interests || []).join(", ") || "expérimentation, création";
    const prompt = `Tu es Naya, la mentore IA. Tu dois concevoir un DÉFI DISCRIMINANT sur mesure pour ${child.name}, ${child.age} ans.
Objectif pédagogique : tester l'hypothèse causale "${topHypothesis.cause}" concernant des difficultés récentes en ${subject}.

Centres d'intérêt de l'enfant : ${interestsStr}

Règles de conception selon l'hypothèse à tester :
- Si METHOD_MISMATCH : Propose un défi hautement pratique, visuel ou manipulatoire en ${subject} qui contourne la présentation scolaire théorique habituelle.
- Si PERFORMANCE_ANXIETY : Propose un défi ludique, décontracté et sans pression de temps ni d'évaluation, axé uniquement sur le plaisir d'essayer.
- Si LACK_OF_ENGAGEMENT : Ancre le défi à 100% sur un des centres d'intérêt de l'enfant (${interestsStr}) pour raviver la curiosité.
- Si CONCEPTUAL_GAP : Propose une micro-activité fondamentale pas-à-pas très accessible pour vérifier les bases de manière amusante.

${PROOF_MODE_INSTRUCTION}

Réponds EXCLUSIVEMENT avec un objet JSON strict au format suivant :
{
  "title": "Titre stimulant et captivant",
  "domain": "Domaine (ex: Logique, Créativité, Sciences, etc.)",
  "description": "Consigne claire, encourageante et adaptée à l'âge de l'enfant",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2", "Étape 3"],
  "materials": ["Matériel 1", "Matériel 2"],
  "material_tags": ["tag1", "tag2"],
  "difficulty": "moyen",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative)
}`;

    const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error("Erreur de génération du défi discriminant.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pedagogicalContext = JSON.stringify({
      cycle_id: cycle.id,
      target_cause: topHypothesis.cause,
      is_discriminant: true,
      subject,
    });

    // Correctif (2026-07-20, décision #34) : cette insertion contournait entièrement
    // finalizeChallenge (filet de sécurité + difficulté + material_tags) — un défi
    // discriminant généré par IA pouvait donc partir sans requires_supervision même
    // s'il impliquait feu/objets tranchants/etc. Même point de passage obligé que
    // tous les autres générateurs de défis de l'app (cf. assignTemplateChallenge).
    const safeTitle = (parsed.title || `Mission spéciale Naya : ${subject}`) as string;
    const safeDescription = (parsed.description || "") as string;
    const safeSteps = (parsed.steps || []) as string[];
    const safeMaterials = (parsed.materials || []) as string[];

    const { data: challenge, error: insertErr } = await supabaseAdmin
      .from("challenges")
      .insert({
        child_id: data.childId,
        user_id: userId,
        domain: parsed.domain || "Exploration",
        description: safeDescription,
        duration: parsed.duration || "15 min",
        steps: safeSteps,
        materials: safeMaterials,
        status: "todo",
        progress: 0,
        pedagogical_context: pedagogicalContext,
        ...finalizeChallenge(
          {
            title: safeTitle,
            description: safeDescription,
            steps: safeSteps,
            materials: safeMaterials,
            material_tags: parsed.material_tags,
            difficulty: parsed.difficulty,
            proof_mode: parsed.proof_mode,
            proof_target: parsed.proof_target,
            declarative_award: parsed.declarative_award,
          },
          child.age
        ),
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return { ok: true as const, challenge, targetCause: topHypothesis.cause };
  });

// ── Fonction interne de mise à jour bayésienne lors du résultat d'un défi discriminant ──

export async function processDiscriminantResult(
  challengeId: string,
  action: "COMPLETED" | "ABANDONED",
  aiValidated: boolean = true
): Promise<{ processed: boolean; resolved?: boolean; finalDiagnosis?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Récupère le défi et son contexte pédagogique
  const { data: challenge } = await supabaseAdmin
    .from("challenges")
    .select("id, pedagogical_context")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge?.pedagogical_context) return { processed: false };

  let context: any;
  try {
    context = JSON.parse(challenge.pedagogical_context);
  } catch {
    return { processed: false };
  }

  if (!context?.is_discriminant || !context?.cycle_id || !context?.target_cause) {
    return { processed: false };
  }

  // 2. Récupère le cycle d'hypothèses
  const { data: cycle } = await supabaseAdmin
    .from("hypothesis_cycles")
    .select("id, hypotheses, status")
    .eq("id", context.cycle_id)
    .maybeSingle();

  if (!cycle || cycle.status !== "open") return { processed: false };

  const hypotheses = (cycle.hypotheses as { cause: string; current_probability: number; prior_probability: number }[]) || [];
  if (hypotheses.length === 0) return { processed: false };

  const targetCause = context.target_cause;

  // 3. Mise à jour bayésienne des probabilités
  const updated = hypotheses.map((h) => {
    let mult = 1.0;
    if (h.cause === targetCause) {
      if (action === "COMPLETED" && aiValidated) {
        mult = 1.8; // Succès au défi discriminant -> fort renforcement de la piste
      } else if (action === "ABANDONED") {
        mult = (h.cause === "PERFORMANCE_ANXIETY" || h.cause === "LACK_OF_ENGAGEMENT") ? 1.5 : 0.6;
      }
    } else if (targetCause === "METHOD_MISMATCH" && h.cause === "CONCEPTUAL_GAP" && action === "COMPLETED") {
      mult = 0.4; // Réussite sur méthode alternative dément un manque de capacités réelles
    }
    return { ...h, current_probability: h.current_probability * mult };
  });

  // Renormalisation somme = 1.0
  const total = updated.reduce((s, h) => s + h.current_probability, 0);
  const normalized = updated
    .map((h) => ({
      ...h,
      current_probability: Number((h.current_probability / (total || 1)).toFixed(4)),
    }))
    .sort((a, b) => b.current_probability - a.current_probability);

  const topHypothesis = normalized[0];

  // Seuil de convergence : probabilité >= 0.65
  const isResolved = topHypothesis.current_probability >= 0.65;

  const updatePayload: any = {
    hypotheses: normalized,
    updated_at: new Date().toISOString(),
  };

  if (isResolved) {
    updatePayload.status = "resolved";
    updatePayload.final_diagnosis = topHypothesis.cause;
    // Manquait dans la version d'origine : resolved_at existe dans le schéma
    // (Phase 3a) précisément pour marquer ce moment, jamais renseigné jusqu'ici.
    updatePayload.resolved_at = new Date().toISOString();
  }

  // Correctif (2026-07-20, décision #34) : cet update échouait silencieusement sur
  // TOUTE mise à jour bayésienne — updated_at n'existait pas encore sur
  // hypothesis_cycles (PGRST204, confirmé en direct avant correctif) et l'erreur
  // n'était jamais vérifiée. La colonne a été ajoutée (migration
  // 20260720170000) ; on vérifie maintenant explicitement l'erreur en plus, pour
  // qu'un futur problème similaire ne redevienne pas silencieux.
  const { error: updateErr } = await supabaseAdmin
    .from("hypothesis_cycles")
    .update(updatePayload)
    .eq("id", cycle.id);

  if (updateErr) {
    console.error("processDiscriminantResult: échec de la mise à jour bayésienne:", updateErr);
    return { processed: false };
  }

  return { processed: true, resolved: isResolved, finalDiagnosis: topHypothesis.cause };
}

