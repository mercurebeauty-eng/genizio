import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateDiscriminantChallenge } from "@/lib/hypotheses.functions";
import { callClaude, finalizeChallenge, PROOF_MODE_INSTRUCTION, ACADEMIC_REFERENTIAL_INSTRUCTION, STEPS_INSTRUCTION, formatChildInterestsPayload, extractJsonFromLLMResponse } from "@/lib/challenges.functions";
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

    // "level" corrigé en "value" (2026-07-20, décision #34) : le champ réel écrit par
    // Phase 1 (record_trait_point, migration 20260720110000) est "value", pas "level"
    // — n'était encore lu nulle part donc sans conséquence runtime, mais trompeur.
    const competencies = (twin?.competencies as Record<string, { value: number; category: string }>) || {};
    const entries = Object.entries(competencies);

    const weaknessEntry = entries.find(([, v]) => v.category === "RISQUE" || v.category === "FAIBLESSE");
    const strengthEntry = entries.find(([, v]) => v.category === "FORCE");
    const fragilityEntry = entries.find(([, v]) => v.category === "FRAGILITE");

    // 3A. Essaimage (Lever la faiblesse grâce à une force)
    if (weaknessEntry && strengthEntry) {
      const formattedInterests = formatChildInterestsPayload(child.interests);
      const prompt = `Tu es Naya, mentore IA. Conçois un micro-défi d'ESSAIMAGE pour ${child.name}, ${child.age} ans.
Principe : Utiliser sa FORCE (${strengthEntry[0]}) et ses leviers comportementaux / postures d'action préférentielles pour développer doucement sa compétence en progression (${weaknessEntry[0]}).

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}

${ACADEMIC_REFERENTIAL_INSTRUCTION}

Format JSON strict :
{
  "title": "Titre motivant",
  "domain": "Domaine lié",
  "description": "Consigne très motivante",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "difficulty": "facile",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null)
}`;

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        // Correctif (2026-07-20, décision #34) : contournait finalizeChallenge — même
        // problème que generateDiscriminantChallenge, même fix.
        const safeTitle = (parsed.title || "Mission d'Essaimage Naya") as string;
        const safeDescription = (parsed.description || "") as string;
        const safeSteps = (parsed.steps || []) as string[];
        const safeMaterials = (parsed.materials || []) as string[];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .insert({
            child_id: data.childId,
            user_id: userId,
            domain: parsed.domain || "Développement",
            description: safeDescription,
            duration: parsed.duration || "15 min",
            steps: safeSteps,
            materials: safeMaterials,
            status: "todo",
            progress: 0,
            pedagogical_context: JSON.stringify({ is_recommendation: true, type: "ESSAIMAGE" }),
            ...finalizeChallenge(
              {
                title: safeTitle,
                description: safeDescription,
                steps: safeSteps,
                materials: safeMaterials,
                material_tags: parsed.material_tags,
                difficulty: "facile",
                proof_mode: parsed.proof_mode,
                proof_target: parsed.proof_target,
                declarative_award: parsed.declarative_award,
                academic_domain: parsed.academic_domain,
                academic_level_age: parsed.academic_level_age,
                academic_reference_note: parsed.academic_reference_note,
              },
              child.age
            ),
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
      } catch (err) {
        console.error("Error generating essaimage recommendation challenge:", err);
      }
    }

    // 3B. Stabilisation — "défi doudou (force)" (plan NAYA §9.3 : environnement
    // hyper-structuré, succès quasi-certain, appuyé sur une force reconnue quand il y
    // en a une). Complété le 2026-07-20 (décision #34) : la version d'origine
    // retournait challenge:null, un chemin visiblement inachevé plutôt qu'une vraie
    // recommandation.
    if (fragilityEntry) {
      const comfortSkill = strengthEntry?.[0] ?? fragilityEntry[0];
      const formattedInterests = formatChildInterestsPayload(child.interests);
      const prompt = `Tu es Naya, mentore IA. Conçois un micro-défi de STABILISATION pour ${child.name}, ${child.age} ans — un défi "doudou" au succès quasi garanti.

Principe : ${child.name} traverse une phase instable sur une compétence (résultats en dents de scie). Ce défi doit RASSURER, pas challenger : structure très détaillée, étapes ultra-simples et peu nombreuses, aucune surprise, appuyé sur ${strengthEntry ? `sa force reconnue (${comfortSkill})` : "quelque chose de familier et confortable"} et ses leviers comportementaux d'action habituels. La réussite doit être quasi certaine.

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}
Pour ce défi de stabilisation en particulier, une cible "declarative" doit rester trivialement atteignable (ex: 5 répétitions, pas 20) — le but est une réussite garantie, pas un défi physique.

${ACADEMIC_REFERENTIAL_INSTRUCTION}

Format JSON strict :
{
  "title": "Titre chaleureux et rassurant",
  "domain": "Domaine lié",
  "description": "Consigne très simple et encourageante",
  "duration": "10 min",
  "steps": ["Étape 1 très simple", "Étape 2 très simple"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "difficulty": "facile",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 5} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null)
}`;

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        const safeTitle = (parsed.title || "Petit défi tranquille avec Naya") as string;
        const safeDescription = (parsed.description || "") as string;
        const safeSteps = (parsed.steps || []) as string[];
        const safeMaterials = (parsed.materials || []) as string[];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .insert({
            child_id: data.childId,
            user_id: userId,
            domain: parsed.domain || "Confiance",
            description: safeDescription,
            duration: parsed.duration || "10 min",
            steps: safeSteps,
            materials: safeMaterials,
            status: "todo",
            progress: 0,
            pedagogical_context: JSON.stringify({ is_recommendation: true, type: "STABILISATION" }),
            ...finalizeChallenge(
              {
                title: safeTitle,
                description: safeDescription,
                steps: safeSteps,
                materials: safeMaterials,
                material_tags: parsed.material_tags,
                difficulty: "facile",
                proof_mode: parsed.proof_mode,
                proof_target: parsed.proof_target,
                declarative_award: parsed.declarative_award,
                academic_domain: parsed.academic_domain,
                academic_level_age: parsed.academic_level_age,
                academic_reference_note: parsed.academic_reference_note,
              },
              child.age
            ),
          })
          .select("*")
          .single();

        if (challenge) {
          return {
            recommendationType: "STABILISATION",
            badgeLabel: "🛡️ Défi d'ancrage Naya",
            pedagogicalReason: "Un défi rassurant et structuré pour ancrer la confiance avant de reprendre l'exploration.",
            challenge,
          };
        }
      } catch (err) {
        console.error("Error generating stabilisation recommendation challenge:", err);
        // Pas de recommandation dégradée si la génération échoue — mieux vaut
        // aucune recommandation qu'une carte de stabilisation sans défi réel.
      }
    }

    // 4. Default : Pas de recommandation spéciale (Exploration classique)
    return null;
  });
