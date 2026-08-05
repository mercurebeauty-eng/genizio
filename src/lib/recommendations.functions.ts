import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateDiscriminantChallenge, generateSupportRetestChallenge } from "@/lib/hypotheses.functions";
import { getChildAccessStatus } from "@/lib/child-access";
import { getInterestHypothesesSnapshot } from "@/lib/interest-confidence";
import { callClaude, finalizeChallenge, PROOF_MODE_INSTRUCTION, ACADEMIC_REFERENTIAL_INSTRUCTION, ACADEMIC_SECRET_INSTRUCTION, ACADEMIC_DOMAIN_LABELS, STEPS_INSTRUCTION, INTELLIGENCES_FIELD_INSTRUCTION, TRAIT_SUBFORM_INSTRUCTION, formatChildInterestsPayload, extractJsonFromLLMResponse, getLeastExploredTalentLabels } from "@/lib/challenges.functions";
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
      .is("access_locked_at", null)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable.");

    // Gate silencieux (décision 2026-08-05) : cette prégénération est déclenchée en
    // fire-and-forget après complétion d'un défi — si l'accès mensuel a expiré, on ne
    // crée pas de nouveaux défis (le flux de complétion, lui, n'est jamais bloqué :
    // portfolio/acquis restent accessibles). Retour null = la recommandation est
    // simplement absente, jamais une erreur qui ferait échouer la complétion.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const access = await getChildAccessStatus(supabaseAdmin as any, userId, data.childId);
    if (access.kind === "expired") return null;

    // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
    // confiance est dérivée à la lecture (complétions vs abandons, par groupe de talents).
    // Un seul snapshot pour les 4 branches de recommandation ci-dessous.
    const interestHypotheses = await getInterestHypothesesSnapshot(supabase as any, data.childId).catch(() => null);

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

    // 2.5. Étape 4 — Soutien renforcé actif suite à une cause confirmée (brainstorm produit,
    // 2026-08-02). Différence avec l'Investigation ci-dessus : ici la cause est déjà résolue
    // ("resolved", plus "open"), mais l'accompagnement reste utile un moment avant de retester
    // — cf. ACCOMMODATION_CAUSES et processDiscriminantResult dans hypotheses.functions.ts.
    const { data: supportCycle } = await supabase
      .from("hypothesis_cycles")
      .select("id, trigger_domain, final_diagnosis, support_checkpoint_at, resolved_at")
      .eq("child_id", data.childId)
      .eq("status", "resolved")
      .eq("support_active", true)
      .order("resolved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (supportCycle?.trigger_domain) {
      const since = supportCycle.support_checkpoint_at ?? supportCycle.resolved_at;
      const { count: completedSince } = await supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("child_id", data.childId)
        .eq("status", "completed")
        .or(`domain.eq.${supportCycle.trigger_domain},academic_domain.eq.${supportCycle.trigger_domain}`)
        .gt("completed_at", since);

      // 5 défis réussis en mode soutenu avant de retester (décision utilisateur explicite,
      // cf. brainstorm étape 4 — assez pour laisser l'accompagnement porter ses fruits, pas
      // assez pour devenir une béquille permanente).
      const SUPPORT_RETEST_AFTER = 5;

      if ((completedSince ?? 0) >= SUPPORT_RETEST_AFTER) {
        const retestResult = await generateSupportRetestChallenge({
          data: { childId: data.childId, cycleId: supportCycle.id },
        });
        if (retestResult.ok && retestResult.challenge) {
          return {
            recommendationType: "INVESTIGATION",
            badgeLabel: "🔎 Mission d'investigation Naya",
            pedagogicalReason: "Naya vérifie discrètement si l'accompagnement renforcé récent est encore nécessaire.",
            challenge: retestResult.challenge,
          };
        }
      } else {
        const subject = ACADEMIC_DOMAIN_LABELS[supportCycle.trigger_domain] ?? supportCycle.trigger_domain;
        const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
        const prompt = `Tu es Naya, mentore IA. Conçois un micro-défi de STABILISATION pour ${child.name}, ${child.age} ans, spécifiquement en ${subject} — un défi "doudou" au succès quasi garanti.

Principe : ${child.name} bénéficie actuellement d'un accompagnement renforcé en ${subject} suite à une observation récente de Naya. Ce défi doit RASSURER, pas challenger : structure très détaillée, étapes ultra-simples et peu nombreuses, aucune surprise, dans ce domaine précis. La réussite doit être quasi certaine.

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${INTELLIGENCES_FIELD_INSTRUCTION}

${TRAIT_SUBFORM_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}
Pour ce défi de stabilisation en particulier, une cible "declarative" doit rester trivialement atteignable (ex: 5 répétitions, pas 20) — le but est une réussite garantie, pas un défi physique.

${ACADEMIC_REFERENTIAL_INSTRUCTION}

${ACADEMIC_SECRET_INSTRUCTION}

Format JSON strict :
{
  "title": "Titre chaleureux et rassurant",
  "domain": "${subject}",
  "description": "Consigne très simple et encourageante",
  "duration": "10 min",
  "steps": ["Étape 1 très simple", "Étape 2 très simple"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "intelligences": ["creative"],
  "trait_subform": "..." (voir liste par intelligence ci-dessus) ou null,
  "difficulty": "facile",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 5} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null),
  "academic_secret": "Explication stimulante du secret scientifique/académique avec niveau d'avance..."
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
              domain: parsed.domain || subject,
              description: safeDescription,
              duration: parsed.duration || "10 min",
              steps: safeSteps,
              materials: safeMaterials,
              status: "todo",
              progress: 0,
              pedagogical_context: JSON.stringify({ is_recommendation: true, type: "STABILISATION" }),
              // Même trou que les autres générateurs de recommandation (Essaimage/Stabilisation/
              // Exploration) : demandé au prompt mais jamais recopié dans l'insertion directe.
              academic_secret: parsed.academic_secret ?? null,
              ...finalizeChallenge(
                {
                  title: safeTitle,
                  description: safeDescription,
                  steps: safeSteps,
                  materials: safeMaterials,
                  material_tags: parsed.material_tags,
                  intelligences: parsed.intelligences,
                  trait_subform: parsed.trait_subform,
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
              pedagogicalReason: `Un défi rassurant, ciblé sur ${subject} où Naya a récemment observé une difficulté, pour consolider la confiance avant de reprendre normalement.`,
              challenge,
            };
          }
        } catch (err) {
          console.error("Error generating cause-targeted stabilisation challenge:", err);
        }
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
      const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
      const prompt = `Tu es Naya, mentore IA. Conçois un micro-défi d'ESSAIMAGE pour ${child.name}, ${child.age} ans.
Principe : Utiliser sa FORCE (${strengthEntry[0]}) et ses leviers comportementaux / postures d'action préférentielles pour développer doucement sa compétence en progression (${weaknessEntry[0]}).

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${INTELLIGENCES_FIELD_INSTRUCTION}

${TRAIT_SUBFORM_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}

${ACADEMIC_REFERENTIAL_INSTRUCTION}

${ACADEMIC_SECRET_INSTRUCTION}

Format JSON strict :
{
  "title": "Titre motivant",
  "domain": "Domaine lié",
  "description": "Consigne très motivante",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "intelligences": ["creative"],
  "trait_subform": "..." (voir liste par intelligence ci-dessus) ou null,
  "difficulty": "facile",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null),
  "academic_secret": "Explication stimulante du secret scientifique/académique avec niveau d'avance..."
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
            // Même trou que les autres générateurs de recommandation — voir le commentaire
            // équivalent sur la branche Stabilisation ci-dessus.
            academic_secret: parsed.academic_secret ?? null,
            ...finalizeChallenge(
              {
                title: safeTitle,
                description: safeDescription,
                steps: safeSteps,
                materials: safeMaterials,
                material_tags: parsed.material_tags,
                intelligences: parsed.intelligences,
                trait_subform: parsed.trait_subform,
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
      const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
      const prompt = `Tu es Naya, mentore IA. Conçois un micro-défi de STABILISATION pour ${child.name}, ${child.age} ans — un défi "doudou" au succès quasi garanti.

Principe : ${child.name} traverse une phase instable sur une compétence (résultats en dents de scie). Ce défi doit RASSURER, pas challenger : structure très détaillée, étapes ultra-simples et peu nombreuses, aucune surprise, appuyé sur ${strengthEntry ? `sa force reconnue (${comfortSkill})` : "quelque chose de familier et confortable"} et ses leviers comportementaux d'action habituels. La réussite doit être quasi certaine.

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${INTELLIGENCES_FIELD_INSTRUCTION}

${TRAIT_SUBFORM_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}
Pour ce défi de stabilisation en particulier, une cible "declarative" doit rester trivialement atteignable (ex: 5 répétitions, pas 20) — le but est une réussite garantie, pas un défi physique.

${ACADEMIC_REFERENTIAL_INSTRUCTION}

${ACADEMIC_SECRET_INSTRUCTION}

Format JSON strict :
{
  "title": "Titre chaleureux et rassurant",
  "domain": "Domaine lié",
  "description": "Consigne très simple et encourageante",
  "duration": "10 min",
  "steps": ["Étape 1 très simple", "Étape 2 très simple"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "intelligences": ["creative"],
  "trait_subform": "..." (voir liste par intelligence ci-dessus) ou null,
  "difficulty": "facile",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 5} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null),
  "academic_secret": "Explication stimulante du secret scientifique/académique avec niveau d'avance..."
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
            // Même trou que les autres générateurs de recommandation — voir le commentaire
            // équivalent sur la branche Essaimage ci-dessus.
            academic_secret: parsed.academic_secret ?? null,
            ...finalizeChallenge(
              {
                title: safeTitle,
                description: safeDescription,
                steps: safeSteps,
                materials: safeMaterials,
                material_tags: parsed.material_tags,
                intelligences: parsed.intelligences,
                trait_subform: parsed.trait_subform,
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

    // 4. EXPLORATION — fallback par défaut (2026-07-26, review produit) : jusqu'ici,
    // quand aucune des 3 recommandations spéciales ci-dessus ne se déclenchait, le parent
    // retombait sur "Suggérer 4 défis" et devait choisir lui-même lequel développe le mieux
    // son enfant — précisément le jugement qu'il n'est pas équipé pour porter (c'est pour ça
    // qu'il a acheté le produit). "EXPLORATION" existait déjà dans RecommendationType mais
    // n'était jamais produite. Ne se déclenche QUE si l'enfant n'a AUCUN défi en attente —
    // sinon getActiveChallenge() en affiche déjà un sur le tableau de bord, pas besoin d'en
    // générer un second (pas de vérification d'idempotence séparée nécessaire : zéro défi
    // todo/in_progress est déjà, par construction, la condition d'idempotence).
    const { data: pending } = await supabase
      .from("challenges")
      .select("id")
      .eq("child_id", data.childId)
      .in("status", ["todo", "in_progress"])
      .limit(1);

    if (!pending || pending.length === 0) {
      const targetLabels = getLeastExploredTalentLabels(child.talents as Record<string, number> | null, 1);
      const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
      const prompt = `Tu es Naya, mentore IA. Conçois LE prochain défi d'EXPLORATION pour ${child.name}, ${child.age} ans — un défi terrain concret (pas un exercice abstrait), qui donne à l'enfant l'occasion de révéler un talent encore peu exploré.

Cible en priorité l'intelligence "${targetLabels[0] ?? "polyvalente"}", encore peu explorée dans son profil actuel.

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${INTELLIGENCES_FIELD_INSTRUCTION}

${TRAIT_SUBFORM_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}

${ACADEMIC_REFERENTIAL_INSTRUCTION}

${ACADEMIC_SECRET_INSTRUCTION}

Format JSON strict :
{
  "title": "Titre motivant",
  "domain": "Domaine lié",
  "description": "Consigne concrète et motivante",
  "duration": "30 min",
  "steps": ["Étape 1", "Étape 2"],
  "materials": ["Matériel 1"],
  "material_tags": ["tag1"],
  "intelligences": ["creative"],
  "trait_subform": "..." (voir liste par intelligence ci-dessus) ou null,
  "difficulty": "moyen",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null),
  "academic_secret": "Explication stimulante du secret scientifique/académique avec niveau d'avance..."
}`;

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        const safeTitle = (parsed.title || "Prochaine exploration Naya") as string;
        const safeDescription = (parsed.description || "") as string;
        const safeSteps = (parsed.steps || []) as string[];
        const safeMaterials = (parsed.materials || []) as string[];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: challenge } = await supabaseAdmin
          .from("challenges")
          .insert({
            child_id: data.childId,
            user_id: userId,
            domain: parsed.domain || "Exploration",
            description: safeDescription,
            duration: parsed.duration || "30 min",
            steps: safeSteps,
            materials: safeMaterials,
            status: "todo",
            progress: 0,
            pedagogical_context: JSON.stringify({ is_recommendation: true, type: "EXPLORATION" }),
            // Même trou que les autres générateurs de recommandation — voir le commentaire
            // équivalent sur la branche Essaimage ci-dessus.
            academic_secret: parsed.academic_secret ?? null,
            ...finalizeChallenge(
              {
                title: safeTitle,
                description: safeDescription,
                steps: safeSteps,
                materials: safeMaterials,
                material_tags: parsed.material_tags,
                intelligences: parsed.intelligences,
                trait_subform: parsed.trait_subform,
                difficulty: parsed.difficulty || "moyen",
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
            recommendationType: "EXPLORATION",
            badgeLabel: "🧭 Prochaine exploration Naya",
            pedagogicalReason: targetLabels[0]
              ? `Naya a choisi ce défi pour donner à ${child.name} l'occasion de révéler son talent en ${targetLabels[0]}, encore peu exploré.`
              : `Naya a choisi ce défi pour ${child.name} — une nouvelle occasion de révéler un talent caché.`,
            challenge,
          };
        }
      } catch (err) {
        console.error("Error generating exploration recommendation challenge:", err);
        // Pas de recommandation dégradée si la génération échoue — le parent retombe sur le
        // flux manuel existant (Suggérer 4 défis / Composer un défi ciblé), pas une carte cassée.
      }
    }

    // 5. Rien à ajouter : l'enfant a déjà un défi en attente, ou la génération a échoué.
    return null;
  });
