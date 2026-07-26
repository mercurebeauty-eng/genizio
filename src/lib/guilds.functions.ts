import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getChildGuild } from "@/lib/guilds";

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
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    const ownGuild = getChildGuild(child.talents as Record<string, number> | null);

    const { data: others, error: othersErr } = await supabase.rpc("list_opted_in_guild_members", {
      p_requesting_child_id: data.childId,
    });
    if (othersErr) throw new Error(othersErr.message);

    const sameGuildOthers = (others ?? []).filter(
      (o: { talents: unknown }) => getChildGuild(o.talents as Record<string, number> | null).key === ownGuild.key
    ) as { id: string; name: string; age: number }[];

    const memberIds = [
      ...(child.guild_participation_opt_in ? [child.id] : []),
      ...sameGuildOthers.map((o) => o.id),
    ];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let completedThisMonth = 0;
    const recentActivity: { childName: string; childAge: number; title: string; domain: string; completedAt: string }[] = [];

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
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { optIn: data.optIn };
  });
