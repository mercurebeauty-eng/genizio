import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateDiscriminantChallenge } from "@/lib/hypotheses.functions";
import { callClaude } from "@/lib/challenges.functions";
import { z } from "zod";

const RecommendInput = z.object({
  childId: z.string().uuid(),
});

export type RecommendationType = "INVESTIGATION" | "ESSAIMAGE" | "STABILISATION" | "EXPLORATION";

export type RecommendedChallengeResult = {
  recommendationType: RecommendationType;
  badgeLabel: string;
  pedagogicalReason: string;
  challenge: any;
};

export const recommendChallengesForChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => RecommendInput.parse(input))
  .handler(async ({ data, context }): Promise<RecommendedChallengeResult | null> => {
    const { supabase, userId } = context;

    // 1. Profil Enfant
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, interests, talents")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable.");

    // 2. NAYA 2.0 Phase 3b : Récupération d'un cycle d'hypothèses ouvert (Priorité 1 — Investigation)
    const { data: openCycle } = await supabase
      .from("hypothesis_cycles")
      .select("id, hypotheses, parent_narrative")
      .eq("child_id", data.childId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openCycle) {
      // Vérifie s'il existe déjà un défi discriminant non terminé pour ce cycle
      const { data: existingDiscriminant } = await supabase
        .from("challenges")
        .select("*")
        .eq("child_id", data.childId)
        .eq("status", "todo")
        .like("pedagogical_context", `%"cycle_id":"${openCycle.id}"%`)
        .maybeSingle();

      if (existingDiscriminant) {
        return {
          recommendationType: "INVESTIGATION",
          badgeLabel: "🔎 Mission d'investigation Naya",
          pedagogicalReason: "Ce défi a été conçu par Naya pour comprendre précisément la façon dont l'enfant appréhende cet apprentissage.",
          challenge: existingDiscriminant,
        };
      }

      // Si pas encore de défi discriminant généré pour ce cycle, on le génère
      const discResult = await generateDiscriminantChallenge({ data: { childId: data.childId } });
      if (discResult.ok && discResult.challenge) {
        return {
          recommendationType: "INVESTIGATION",
          badgeLabel: "🔎 Mission d'investigation Naya",
          pedagogicalReason: "Naya a conçu ce défi spécialement pour tester une hypothèse d'apprentissage adaptée à l'enfant.",
          challenge: discResult.challenge,
        };
      }
    }

    // 3. NAYA 2.0 Phase 1 : Jumeau Pédagogique (Priorité 2 & 3 — Essaimage & Stabilisation)
    const { data: twin } = await supabase
      .from("pedagogical_twins")
      .select("competencies, drivers")
      .eq("child_id", data.childId)
      .maybeSingle();

    const competencies = (twin?.competencies as Record<string, { level: number; category: string }>) || {};
    const entries = Object.entries(competencies);

    const weaknessEntry = entries.find(([, v]) => v.category === "RISQUE" || v.category === "FAIBLESSE");
    const strengthEntry = entries.find(([, v]) => v.category === "FORCE");
    const fragilityEntry = entries.find(([, v]) => v.category === "FRAGILITE");

    // 3A. Essaimage (Lever la faiblesse grâce à une force)
    if (weaknessEntry && strengthEntry) {
      const interestsStr = (child.interests || []).join(", ") || "création, jeux";
      const prompt = `Tu es Naya, mentore IA. Conçois un micro-défi d'ESSAIMAGE pour ${child.name}, ${child.age} ans.
Principe : Utiliser sa FORCE (${strengthEntry[0]}) et ses centres d'intérêt (${interestsStr}) pour développer doucement sa compétence en progression (${weaknessEntry[0]}).

Format JSON strict :
{
  "title": "Titre motivant",
  "domain": "Domaine lié",
  "description": "Consigne très motivante",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "difficulty": "facile"
}`;

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(rawJson);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .insert({
            child_id: data.childId,
            user_id: userId,
            title: parsed.title || "Mission d'Essaimage Naya",
            domain: parsed.domain || "Développement",
            description: parsed.description,
            duration: parsed.duration || "15 min",
            steps: parsed.steps || [],
            materials: parsed.materials || [],
            material_tags: parsed.material_tags || [],
            difficulty: "facile",
            status: "todo",
            pedagogical_context: JSON.stringify({ is_recommendation: true, type: "ESSAIMAGE" }),
          })
          .select("*")
          .single();

        if (challenge) {
          return {
            recommendationType: "ESSAIMAGE",
            badgeLabel: "⚡ Défi de renforcement Naya",
            pedagogicalReason: `Naya s'appuie sur la force naturelle de l'enfant (${strengthEntry[0]}) pour stimuler une compétence en cours d'émergence.`,
            challenge,
          };
        }
      } catch {
        // Fallback exploration
      }
    }

    // 3B. Stabilisation (Succès garanti)
    if (fragilityEntry) {
      return {
        recommendationType: "STABILISATION",
        badgeLabel: "🛡️ Défi d'ancrage Naya",
        pedagogicalReason: "Un défi rassurant pour ancrer la confiance et stabiliser la régularité.",
        challenge: null,
      };
    }

    // 4. Default : Pas de recommandation spéciale (Exploration classique)
    return null;
  });
