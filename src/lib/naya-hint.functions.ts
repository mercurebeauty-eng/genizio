// Indice juste-à-temps (chantier « Deuxième colonne vertébrale », 2026-08-15).
//
// Quand l'enfant bute pendant un défi (bouton « Naya, je suis bloqué·e »), cette
// fonction génère UNIQUEMENT le concept minimal qui débloque l'étape — jamais la
// solution. Le principe : la connaissance est livrée au moment du besoin, pas
// après coup. La reformulation de modalité (modalities.functions.ts) reste le
// filet final après échec ; l'indice s'insère AVANT, pour éviter l'échec.
//
// L'indice est stocké sur challenges.naya_hint : l'enfant peut le relire, et le
// défi déjà complété garde la trace de ce qui l'a débloqué (trace utile pour le
// Jumeau Pédagogique — un indice demandé puis réussi est un signal de blocage
// fécond, pas d'un manque de capacité).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude, formatChildInterestsPayload } from "@/lib/challenges.functions";
import { buildJustInTimeHintPrompt } from "@/lib/naya-prompts";
import { verifyAndLog } from "@/lib/naya-verifier.functions";
import { z } from "zod";

const HintInput = z.object({
  challengeId: z.string().uuid(),
});

export const generateJustInTimeHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => HintInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ownership explicite + profil enfant (même gating que les autres mutations de
    // challenges — on ne se fie jamais qu'à la RLS).
    const { data: challenge, error } = await supabase
      .from("challenges")
      .select("*, child_profiles(id, name, age, interests, access_locked_at, is_active)")
      .eq("id", data.challengeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !challenge) throw new Error("Défi introuvable ou accès refusé.");

    const child = challenge.child_profiles as any;
    if (!child) throw new Error("Profil enfant introuvable.");
    if (child.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (child.is_active === false) throw new Error("Ce profil est désactivé par l'administrateur.");

    // L'indice n'a de sens que sur un défi non terminé.
    if (challenge.status === "completed" || challenge.status === "not_completed") {
      throw new Error("Ce défi est déjà terminé.");
    }

    // Étapes du défi (le champ peut être un tableau ou un JSON encodé en chaîne).
    let steps: string[] = [];
    const rawSteps = challenge.steps;
    if (Array.isArray(rawSteps)) steps = rawSteps as string[];
    else if (typeof rawSteps === "string") {
      try {
        const parsed = JSON.parse(rawSteps);
        if (Array.isArray(parsed)) steps = parsed as string[];
      } catch {
        /* étapes illisibles — on génère quand même avec ce qu'on a */
      }
    }

    // Étape courante : l'enfant bloque en général sur la première étape non
    // cochée. La progression (0..100) ne dit pas laquelle — on prend la plus
    // avancée possible via progress/étapes, faute de mieux. Le prompt lui-même
    // demande un indice sur l'ensemble du défi pour couvrir ce cas.
    const currentStep =
      steps[
        Math.min(
          steps.length - 1,
          Math.max(0, Math.floor(challenge.progress / (100 / Math.max(steps.length, 1)))),
        )
      ] ??
      steps[0] ??
      challenge.description ??
      "l'étape en cours";

    const prompt = buildJustInTimeHintPrompt({
      childName: child.name,
      childAge: child.age,
      challengeTitle: challenge.title,
      currentStep,
      steps,
      interestsPayload: formatChildInterestsPayload(child.interests),
    });

    let hint: string;
    try {
      const raw = await callClaude(prompt, false, undefined, 1000, 2);
      hint = raw.trim();
      if (!hint) throw new Error("Réponse IA vide.");
    } catch (err) {
      console.error("generateJustInTimeHint: échec de génération:", err);
      throw new Error(
        "Naya n'a pas pu trouver d'indice pour le moment. Réessaie dans quelques secondes.",
      );
    }

    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de l'indice livré
    // (jamais la solution, toujours un concept).
    void verifyAndLog({
      kind: "just_in_time_hint",
      output: hint,
      context: { childAge: child.age, childName: child.name, challengeTitle: challenge.title },
      sourceFunction: "generateJustInTimeHint",
      childId: child.id,
      model: "deepseek-v4-flash",
    });

    // Persistance pour relecture (et trace pour le Jumeau). Non bloquant : si
    // l'update échoue, l'enfant reçoit quand même son indice.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("challenges")
      .update({ naya_hint: hint, updated_at: new Date().toISOString() })
      .eq("id", challenge.id);

    return { hint };
  });
