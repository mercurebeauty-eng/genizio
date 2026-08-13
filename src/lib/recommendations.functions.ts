import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateDiscriminantChallenge, generateSupportRetestChallenge } from "@/lib/hypotheses.functions";
import { getChildAccessStatus } from "@/lib/child-access";
import { getInterestHypothesesSnapshot } from "@/lib/interest-confidence";
import { callClaude, finalizeChallenge, PROOF_MODE_INSTRUCTION, ACADEMIC_REFERENTIAL_INSTRUCTION, ACADEMIC_SECRET_INSTRUCTION, ACADEMIC_DOMAIN_LABELS, STEPS_INSTRUCTION, INTELLIGENCES_FIELD_INSTRUCTION, TRAIT_SUBFORM_INSTRUCTION, formatChildInterestsPayload, extractJsonFromLLMResponse, getLeastExploredTalentLabels, computeProgressionTargets, formatProgressionInstruction } from "@/lib/challenges.functions";
import { buildRecommendationPrompt, buildAspirationBridgePrompt } from "@/lib/naya-prompts";
import { getAspirationHypothesesSnapshot } from "@/lib/aspiration-confidence";
import { formatChildProfileContext, VULNERABLE_LIFE_CONTEXTS } from "@/lib/profile-context";
import { formatTimePressureNote } from "@/lib/time-limit";
import { biasLabelsByDeclaredDifficulties, rankByDeclaredDifficulties } from "@/lib/difficulty-map";
import { z } from "zod";
// « Le Loup de Naya » (chantier 2, Naya 3.0) : audit shadow non-bloquant des
// recommandations (stabilisation, essaimage, exploration).
import { verifyAndLog } from "@/lib/naya-verifier.functions";

const RecommendInput = z.object({
  childId: z.string().uuid(),
});

export type RecommendationType = "INVESTIGATION" | "ASPIRATION" | "ESSAIMAGE" | "STABILISATION" | "EXPLORATION";

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
      .select("id, name, age, interests, talents, life_context, school_relation, ability_profile, aspirations, city, country, time_pressure, school_level, languages")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true)
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

    // 2.4. Chantier Naya V4 (2026-08-12, analyse §10-16) : PONT D'ASPIRATION — une
    // aspiration déclarée non encore testée (ou en cours d'exploration) ouvre un défi
    // scénarisé dans SON univers mais ciblant les compétences que cet univers exige
    // (ex. menuiserie → mesurer, compter, proportions — §11). L'aspiration reste une
    // HYPOTHÈSE à explorer, jamais un verdict (§10, §16). Idempotent : un seul
    // défi-pont en attente par aspiration, et pas de nouveau pont si un défi récent
    // (< 14 j) touche déjà ses domaines mappés.
    const aspirationSnapshot = await getAspirationHypothesesSnapshot(supabase as any, data.childId).catch(() => null);
    if (aspirationSnapshot) {
      const candidateLabel = [...aspirationSnapshot.untestedLabels, ...aspirationSnapshot.exploringLabels][0];
      if (candidateLabel) {
        const hypothesis = aspirationSnapshot.byLabel[candidateLabel];
        const STALE_CUTOFF = new Date(Date.now() - 14 * 86_400_000).toISOString();

        const [{ data: pendingBridge }, recentInDomains, completedRes, completedInDomainsCount, titlesRes, progressionTargets] = await Promise.all([
          supabase
            .from("challenges")
            .select("id")
            .eq("child_id", data.childId)
            // Avis GPT Codex P2 : un pont DÉMARRÉ (in_progress) est aussi un pont en
            // attente d'issue — sans lui, un second pont dupliqué pouvait être inséré
            // pour la même aspiration pendant que le premier est en cours.
            .in("status", ["todo", "in_progress"])
            .eq("aspiration_label", hypothesis.label)
            .limit(1)
            .maybeSingle(),
          hypothesis.bridge.domains.length > 0
            ? supabase
                .from("challenges")
                .select("id")
                .eq("child_id", data.childId)
                .gt("created_at", STALE_CUTOFF)
                .in("domain", hypothesis.bridge.domains)
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("challenges")
            .select("title, domain, ai_observations")
            .eq("child_id", data.childId)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(6),
          // Comptage DÉDIÉ non tronqué (review 2026-08-12, P2) : completedRes est limité
          // aux 6 derniers défis pour le résumé du prompt — s'en servir pour compter les
          // complétions du domaine plafonnait l'autonomie progressive à 6.
          supabase
            .from("challenges")
            .select("domain", { count: "exact", head: true })
            .eq("child_id", data.childId)
            .eq("status", "completed")
            .in("domain", hypothesis.bridge.domains),
          supabase
            .from("challenges")
            .select("title")
            .eq("child_id", data.childId)
            .order("created_at", { ascending: false })
            .limit(30),
          computeProgressionTargets(supabase, data.childId),
        ]);

        if (!pendingBridge && !recentInDomains?.data) {
          const vulnerable =
            ((child as any).life_context ?? []).some((c: string) => VULNERABLE_LIFE_CONTEXTS.includes(c)) ||
            (child as any).school_relation === "conflit" ||
            (child as any).school_relation === "non_scolarise";

          const completedSummary = (completedRes.data ?? [])
            .map((c: any) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ''}"`)
            .join("\n");
          const completedInAspirationDomains = completedInDomainsCount.count ?? 0;

          const prompt = buildAspirationBridgePrompt({
            childName: child.name,
            childAge: child.age,
            profileLocation: [child.city, child.country].filter(Boolean).join(", ") || "non précisé",
            interestsPayload: formatChildInterestsPayload(child.interests, interestHypotheses),
            talentsJson: JSON.stringify(child.talents || {}),
            completedSummary,
            existingTitles: (titlesRes.data ?? []).map((c: any) => c.title),
            progressionInstruction: formatProgressionInstruction(progressionTargets),
            timePressureNote: formatTimePressureNote((child as any).time_pressure),
            profileContextNote: formatChildProfileContext(child as any),
            aspirationLabel: hypothesis.label,
            bridge: hypothesis.bridge,
            source: hypothesis.source,
            vulnerable,
          });

          try {
            const rawJson = await callClaude(prompt, true, undefined, 1200, 2);
            const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

            // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
            void verifyAndLog({
              kind: "recommendation",
              output: parsed,
              context: { childAge: child.age, childName: child.name, aspirationLabel: hypothesis.label },
              sourceFunction: "recommendChallengesForChild/aspiration",
              childId: data.childId,
              model: "deepseek-v4-flash",
            });

            const safeTitle = (parsed.title || `Première mission ${hypothesis.label}`) as string;
            const safeDescription = (parsed.description || "") as string;
            const safeSteps = (parsed.steps || []) as string[];
            const safeMaterials = (parsed.materials || []) as string[];

            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: challenge } = await supabaseAdmin
              .from("challenges")
              .insert({
                child_id: data.childId,
                user_id: userId,
                domain: parsed.domain || hypothesis.bridge.domains[0] || "Exploration",
                description: safeDescription,
                duration: parsed.duration || "30 min",
                steps: safeSteps,
                materials: safeMaterials,
                status: "todo",
                progress: 0,
                pedagogical_context: JSON.stringify({ is_recommendation: true, type: "ASPIRATION" }),
                academic_secret: parsed.academic_secret ?? null,
                aspiration_label: hypothesis.label,
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
                    kind: parsed.kind,
                    guidance_level: parsed.guidance_level,
                  },
                  child.age,
                  { completedInDomain: completedInAspirationDomains }
                ),
              })
              .select("*")
              .single();

            if (challenge) {
              return {
                recommendationType: "ASPIRATION",
                badgeLabel: "🧭 Pont d'exploration Naya",
                pedagogicalReason: `${child.name} a dit vouloir ${hypothesis.label} — Naya explore cet univers avec lui, pour découvrir ce qu'il sait vraiment faire.`,
                challenge,
              };
            }
          } catch (err) {
            console.error("Error generating aspiration bridge challenge:", err);
            // Pas de recommandation dégradée si la génération échoue — les autres
            // branches (Essaimage/Exploration) prennent le relais au tour suivant.
          }
        }
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
        // Valeurs entre guillemets (review 2026-08-12, P2) : trigger_domain est un
        // libellé libre (ex. « Tech & IA ») — sans quoting, le filtre PostgREST .or()
        // cassait en 400 sur les &/espaces.
        .or(`domain.eq."${supportCycle.trigger_domain}",academic_domain.eq."${supportCycle.trigger_domain}"`)
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
        const prompt = buildRecommendationPrompt({
        mode: "stabilisation_cycle",
        childName: child.name,
        childAge: child.age,
        interestsPayload: formattedInterests,
        subject,
      });

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
        void verifyAndLog({
          kind: "recommendation",
          output: parsed,
          context: { childAge: child.age, childName: child.name, requiresStabilisation: true },
          sourceFunction: "recommendChallengesForChild/stabilisation_cycle",
          childId: data.childId,
          model: "deepseek-v4-flash",
        });

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
                  // Avis GPT Codex P2 : kind/guidance_level étaient demandés au prompt
                  // mais jamais passés à finalizeChallenge dans ces branches — le défi
                  // retombait toujours sur micro/3 par défaut (badge Projet et autonomie
                  // progressive inopérants pour les recommandations).
                  kind: parsed.kind,
                  guidance_level: parsed.guidance_level,
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

    // §8 (2026-08-12) : les difficultés DÉCLARÉES par le parent (ability_profile)
    // biaisent doucement le choix de la faiblesse à entraîner — une difficulté n'est
    // pas compensée, elle est entraînée (priorité douce, jamais dure).
    const weaknessCandidates = entries
      .filter(([, v]) => v.category === "RISQUE" || v.category === "FAIBLESSE")
      .map(([key, v]) => ({ key, v }));
    const weaknessEntry = rankByDeclaredDifficulties(weaknessCandidates, (child as any).ability_profile)[0];
    const strengthEntry = entries.find(([, v]) => v.category === "FORCE");
    const fragilityEntry = entries.find(([, v]) => v.category === "FRAGILITE");

    // 3A. Essaimage (Lever la faiblesse grâce à une force)
    if (weaknessEntry && strengthEntry) {
      const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
      const prompt = buildRecommendationPrompt({
        mode: "essaimage",
        childName: child.name,
        childAge: child.age,
        interestsPayload: formattedInterests,
        strengthLabel: strengthEntry[0],
        weaknessLabel: weaknessEntry.key,
      });

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
        void verifyAndLog({
          kind: "recommendation",
          output: parsed,
          context: { childAge: child.age, childName: child.name },
          sourceFunction: "recommendChallengesForChild/essaimage",
          childId: data.childId,
          model: "deepseek-v4-flash",
        });

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
                // Avis GPT Codex P2 : kind/guidance_level demandés au prompt mais jamais
                // passés à finalizeChallenge — voir commentaire branche Essaimage.
                kind: parsed.kind,
                guidance_level: parsed.guidance_level,
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
      const prompt = buildRecommendationPrompt({
        mode: "stabilisation_fragilite",
        childName: child.name,
        childAge: child.age,
        interestsPayload: formattedInterests,
        comfortSkillText: strengthEntry ? `sa force reconnue (${comfortSkill})` : undefined,
      });

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
        void verifyAndLog({
          kind: "recommendation",
          output: parsed,
          context: { childAge: child.age, childName: child.name, requiresStabilisation: true },
          sourceFunction: "recommendChallengesForChild/stabilisation_fragilite",
          childId: data.childId,
          model: "deepseek-v4-flash",
        });

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
                // Avis GPT Codex P2 : kind/guidance_level demandés au prompt mais jamais
                // passés à finalizeChallenge — voir commentaire branche Essaimage.
                kind: parsed.kind,
                guidance_level: parsed.guidance_level,
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
      // §8 (2026-08-12) : les difficultés déclarées passent en tête des candidats
      // d'exploration (biais doux — stimuler progressivement, jamais d'échec forcé).
      // Plusieurs candidats (3) : biasLabelsByDeclaredDifficulties ne fait que
      // RÉORDONNER son entrée — avec un seul candidat, le biais était un no-op
      // (review 2026-08-12, P1). La difficulté ciblée n'était jamais choisie.
      const targetLabels = biasLabelsByDeclaredDifficulties(
        getLeastExploredTalentLabels(child.talents as Record<string, number> | null, 3),
        (child as any).ability_profile
      );
      const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
      const prompt = buildRecommendationPrompt({
        mode: "exploration",
        childName: child.name,
        childAge: child.age,
        interestsPayload: formattedInterests,
        targetLabel: targetLabels[0] ?? "polyvalente",
      });

      try {
        const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
        const parsed = JSON.parse(extractJsonFromLLMResponse(rawJson));

        // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
        void verifyAndLog({
          kind: "recommendation",
          output: parsed,
          context: { childAge: child.age, childName: child.name },
          sourceFunction: "recommendChallengesForChild/exploration",
          childId: data.childId,
          model: "deepseek-v4-flash",
        });

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
                // Avis GPT Codex P2 : kind/guidance_level demandés au prompt mais jamais
                // passés à finalizeChallenge — voir commentaire branche Essaimage.
                kind: parsed.kind,
                guidance_level: parsed.guidance_level,
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
