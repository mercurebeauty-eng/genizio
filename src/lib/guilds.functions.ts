import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getChildGuild } from "@/lib/guilds";
import { analyzeGuildComplementarity, getPrimaryTalent, analyzeEscouadeCompatibility, rankSquadCandidates } from "@/lib/guild-team-generator";
import { analyzeMobilizationConditions } from "@/lib/mobilization-conditions";

// Ma Guilde — vue communautaire (cf. écran 9 du prototype, genizio-decisions
// du 2026-07-21). Contrairement au reste de l'app (strictement cloisonné par
// famille), cette fonctionnalité montre à une famille des données limitées
// (prénom, âge) d'enfants d'AUTRES familles — jamais sans que ces familles
// aient explicitement activé guild_participation_opt_in (défaut false, cf.
// migration 20260721081147). Le seul point de passage qui contourne le
// cloisonnement RLS habituel est list_opted_in_guild_members, une fonction
// SECURITY DEFINER qui ne renvoie que ce qui est strictement nécessaire.

const GetCommunityInput = z.object({ childId: z.string().uuid() });

export const getGuildCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GetCommunityInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, talents, guild_participation_opt_in")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    const ownGuild = getChildGuild(child.talents as Record<string, number> | null);

    const { data: others, error: othersErr } = await supabase.rpc("list_opted_in_guild_members", {
      p_requesting_child_id: data.childId,
    });
    if (othersErr) throw new Error(othersErr.message);

    const sameGuildOthers = (others ?? []).filter(
      (o: { talents: unknown }) =>
        getChildGuild(o.talents as Record<string, number> | null).key === ownGuild.key,
    ) as { id: string; name: string; age: number; talents: Record<string, number> }[];

    const memberIds = [
      ...(child.guild_participation_opt_in ? [child.id] : []),
      ...sameGuildOthers.map((o) => o.id),
    ];

    // Calcul de la synergie d'équipe pour une escouade (Max 4 membres dont l'enfant)
    let synergyData = null;
    let compatibilityReport = null;
    if (child.guild_participation_opt_in) {
      const allCandidateIds = [child.id, ...sameGuildOthers.map((o) => o.id)];

      // 1. Récupération des relations connues
      let knownChildIds: string[] = [];
      try {
        const { data: relations } = (await supabase
          .from("child_relations" as any)
          .select("requester_child_id, addressee_child_id")
          .in("status", ["accepted", "mentor_verified"])
          .or(`requester_child_id.eq.${child.id},addressee_child_id.eq.${child.id}`)) as { data: any };
          
        if (relations) {
          knownChildIds = relations.map((r: any) => r.requester_child_id === child.id ? r.addressee_child_id : r.requester_child_id);
        }
      } catch {
        knownChildIds = [];
      }

      // 2. Récupération des traces collectives
      let traces: any[] = [];
      try {
        const { data: traceData } = (await supabase
          .from("discovery_traces" as any)
          .select("child_id, ai_behavioral_analysis")
          .in("source_type", ["fablab_marathon", "projet_collectif"])
          .in("child_id", allCandidateIds)) as { data: any };
        traces = traceData || [];
      } catch {
        traces = [];
      }
        
      const mobilizationByChild = new Map<string, any[]>();
      if (traces) {
        const tracesByChild = new Map<string, any[]>();
        for (const t of traces) {
          if (!t.ai_behavioral_analysis) continue;
          if (!tracesByChild.has(t.child_id)) tracesByChild.set(t.child_id, []);
          tracesByChild.get(t.child_id)!.push({
            participationStatus: t.ai_behavioral_analysis.participationStatus || "active_participant",
            environmentalConditions: t.ai_behavioral_analysis.environmentalConditions
          });
        }
        for (const [cid, childTraces] of tracesByChild.entries()) {
          const insights = analyzeMobilizationConditions(childTraces);
          mobilizationByChild.set(cid, insights);
        }
      }

      const mainChildInsights = mobilizationByChild.get(child.id) || [];

      // 3. Classement intelligent
      const candidates = sameGuildOthers.map((o) => ({
        id: o.id,
        name: o.name,
        talents: (o.talents || {}) as Record<string, number>,
        primaryTalentKey: getPrimaryTalent((o.talents || {}) as Record<string, number>),
        mobilizationInsights: mobilizationByChild.get(o.id) || []
      }));

      const topSquad = rankSquadCandidates(mainChildInsights, candidates, knownChildIds, "synergique");

      const childProfileAsMember = {
        id: child.id,
        name: child.name,
        talents: (child.talents || {}) as Record<string, number>,
        primaryTalentKey: getPrimaryTalent((child.talents || {}) as Record<string, number>),
        mobilizationInsights: mainChildInsights
      };

      const squadMembers = [childProfileAsMember, ...topSquad];
      synergyData = analyzeGuildComplementarity(ownGuild.key, squadMembers);
      compatibilityReport = analyzeEscouadeCompatibility(squadMembers, squadMembers.length, "explicit_structured");
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let completedThisMonth = 0;
    const recentActivity: {
      childName: string;
      childAge: number;
      title: string;
      domain: string;
      completedAt: string;
    }[] = [];

    if (memberIds.length > 0) {
      const { count } = await supabase
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .in("child_id", memberIds)
        .eq("status", "completed")
        .gte("completed_at", startOfMonth.toISOString());
      completedThisMonth = count ?? 0;
    }

    // Défi collectif du mois (cf. écran 9 du prototype hi-fi — "Ensemble,
    // construisons 500 ponts"). Le prototype montre un chiffre fixe arbitraire ;
    // ici l'objectif est un multiple réel du nombre de membres (3 défis/membre/mois)
    // plutôt qu'un nombre inventé — même logique qu'un palier de niveau (ex. 500 XP),
    // un paramètre de jeu assumé, pas une donnée d'activité fabriquée. Minimum 15
    // pour qu'une guilde à 1-2 membres ait un objectif qui reste motivant.
    const monthlyTarget = Math.max(15, memberIds.length * 3);

    return {
      ownGuildKey: ownGuild.key,
      isOptedIn: child.guild_participation_opt_in,
      memberCount: memberIds.length,
      completedThisMonth,
      monthlyTarget,
      recentActivity,
      synergyData,
      compatibilityReport,
    };
  });

const SetParticipationInput = z.object({ childId: z.string().uuid(), optIn: z.boolean() });

export const setGuildParticipation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SetParticipationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("child_profiles")
      .update({ guild_participation_opt_in: data.optIn })
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return { optIn: data.optIn };
  });
