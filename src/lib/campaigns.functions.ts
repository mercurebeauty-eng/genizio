import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { getActiveSeason } from "./seasons.functions";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  manager_user_id?: string;
  manager_email?: string | null;
  target_count: number;
  extra_supervisors_quota: number;
  created_at: string;
}

export const createCampaignAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        name: z.string().min(3),
        description: z.string().optional(),
        managerEmail: z.string().email(),
        targetCount: z.number().int().positive().default(100),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    // 1. Resolve manager email to user ID
    const users = await listAllUsers(supabaseAdmin);
    const manager = users.find((u) => u.email === data.managerEmail);
    if (!manager) {
      throw new Error(`Aucun compte trouvé pour l'email: ${data.managerEmail}`);
    }

    // 2. Create Campaign
    const { data: campaign, error } = await (supabaseAdmin as any)
      .from("campaigns")
      .insert({
        name: data.name,
        description: data.description,
        manager_user_id: manager.id,
        target_count: data.targetCount,
        extra_supervisors_quota: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur de création de campagne: ${error.message}`);
    }

    return campaign as Campaign;
  });

export const listCampaignsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: campaigns, error } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    
    // Attach emails
    const users = await listAllUsers(supabaseAdmin);
    const emailMap = new Map(users.map(u => [u.id, u.email]));
    
    return (campaigns as Campaign[]).map(c => ({
        ...c,
        manager_email: c.manager_user_id ? emailMap.get(c.manager_user_id) : null
    }));
  });

export const generateCampaignTokensAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        campaignId: z.string().uuid(),
        count: z.number().int().positive().max(500),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    // Fetch campaign
    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .single();

    if (!campaign) throw new Error("Campagne introuvable.");

    // Décision utilisateur (2026-07-26) : un code se lie à sa saison à l'ACTIVATION
    // (redeemSponsorshipToken résout la saison active à ce moment-là), jamais à la génération —
    // un lot distribué sur 3 mois ferait sinon démarrer les derniers enfants sur un thème déjà
    // terminé. season_id ici n'est donc plus qu'indicatif (saison en cours au moment de l'émission
    // du lot). Même format de code que le parrainage individuel (GENIZIO-*) pour cohérence — le
    // format précédent (8 caractères bruts, sans préfixe) ne se distinguait pas visuellement.
    const activeSeason = await getActiveSeason({ data: undefined });

    // Dédupliqué en mémoire avant l'insert : un insert par lot de 500 lignes échoue entièrement
    // sur la moindre collision de code (contrainte UNIQUE) — la probabilité est faible mais pas
    // nulle avec seulement 8 caractères aléatoires, et un échec total d'un lot de 500 pour une
    // ONG serait un vrai incident, pas un détail.
    const codes = new Set<string>();
    while (codes.size < data.count) {
      codes.add(`GENIZIO-B2B-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    }

    const tokens = Array.from(codes).map((code) => ({
      code,
      campaign_id: campaign.id,
      season_id: activeSeason.id,
      sponsor_name: campaign.name,
      sponsor_email: "b2b@genizio.com",
      amount_paid: activeSeason.price_xof,
      currency: "XOF",
      payment_confirmed: true, // Pré-payé par contrat/facture ONG — confirmé par l'admin qui génère le lot après réception du paiement, même logique que le reste de l'app (WhatsApp/Mobile Money manuel).
    }));

    const { error } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .insert(tokens);

    if (error) throw new Error(error.message);

    return { success: true, count: data.count };
  });

// ────────────────────────────────────────────────────────────
// B2B Dashboard (Project Manager)
// ────────────────────────────────────────────────────────────

// Décision utilisateur (2026-07-26) : le chargé de projet ONG ne voit JAMAIS l'identité d'un
// enfant (ni nom, ni portfolio) — son rôle se limite à la gestion des superviseurs et au suivi
// d'impact agrégé. C'est ce qui rend inutile tout consentement parental spécifique au B2B :
// aucune donnée personnelle d'enfant ne remonte jamais à ce compte. Ne JAMAIS réintroduire
// child_profiles.name/city/interests ou un lien vers /profiles/$profileId dans cette réponse.
export const getNgoDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).claims?.sub;

    const { data: campaigns, error: campErr } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .eq("manager_user_id", userId);

    if (campErr) throw new Error(campErr.message);
    if (!campaigns || campaigns.length === 0) {
      return { campaigns: [], stats: null, supervisors: [] };
    }

    const campaignIds = campaigns.map((c: any) => c.id);

    const { data: enrollments, error: enrErr } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id")
      .in("campaign_id", campaignIds);
    if (enrErr) throw new Error(enrErr.message);

    const childIds = [...new Set((enrollments ?? []).map((e: any) => e.child_id as string))];

    const { data: tokens } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("id, is_redeemed")
      .in("campaign_id", campaignIds);

    const totalTokens = tokens?.length || 0;
    const redeemedTokens = tokens?.filter((t: any) => t.is_redeemed).length || 0;

    let challenges: any[] = [];
    // Distribution des talents AGRÉGÉE sur toute la cohorte — jamais par enfant nommé. C'est le
    // cœur du "Rapport d'Impact" que voit le chargé de projet, sans jamais exposer qui a quel
    // talent.
    const talentTotals: Record<string, number> = {};
    if (childIds.length > 0) {
      const [{ data: ch }, { data: profiles }] = await Promise.all([
        (supabaseAdmin as any)
          .from("challenges")
          .select("id, status, domain, child_id")
          .in("child_id", childIds),
        (supabaseAdmin as any).from("child_profiles").select("talents").in("id", childIds),
      ]);
      challenges = ch || [];
      for (const p of profiles ?? []) {
        const talents = (p.talents ?? {}) as Record<string, number>;
        for (const [key, val] of Object.entries(talents)) {
          talentTotals[key] = (talentTotals[key] ?? 0) + (Number(val) || 0);
        }
      }
    }

    // Superviseurs de ces campagnes : compte assigné seulement, jamais quels enfants précis.
    const { data: supervisorRows } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("supervisor_user_id")
      .in("campaign_id", campaignIds);

    const usersMap = new Map((await listAllUsers(supabaseAdmin)).map((u) => [u.id, u.email]));
    const supervisorCounts = new Map<string, number>();
    for (const row of supervisorRows ?? []) {
      supervisorCounts.set(row.supervisor_user_id, (supervisorCounts.get(row.supervisor_user_id) ?? 0) + 1);
    }
    const totalSupervisorQuota = campaigns.reduce((sum: number, c: any) => sum + 5 + (c.extra_supervisors_quota ?? 0), 0);

    return {
      campaigns: campaigns as Campaign[],
      stats: {
        totalTokens,
        redeemedTokens,
        cohortSize: childIds.length,
        totalChallenges: challenges.length,
        completedChallenges: challenges.filter((c: any) => c.status === "completed").length,
        talentDistribution: talentTotals,
        supervisedChildren: [...supervisorCounts.values()].reduce((a, b) => a + b, 0),
        totalSupervisorQuota,
      },
      supervisors: Array.from(supervisorCounts.entries()).map(([supervisorUserId, count]) => ({
        email: usersMap.get(supervisorUserId) || "Inconnu",
        assignedCount: count,
      })),
    };
  });

// Le chargé de projet choisit un superviseur et un NOMBRE d'enfants à lui confier — jamais un
// enfant précis (cf. note ci-dessus). Le système pioche automatiquement, dans sa propre cohorte,
// parmi les enfants qui n'ont encore aucun superviseur.
export const assignCampaignSupervisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        campaignId: z.string().uuid(),
        supervisorEmail: z.string().email(),
        count: z.number().int().min(1).max(5).default(5),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const managerId = (context as any).claims?.sub;

    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .eq("manager_user_id", managerId)
      .maybeSingle();

    if (!campaign) {
      throw new Error("Vous n'avez pas les droits sur cette campagne.");
    }

    const users = await listAllUsers(supabaseAdmin);
    const supervisor = users.find((u) => u.email === data.supervisorEmail);
    if (!supervisor) {
      throw new Error(`Aucun compte trouvé pour l'email: ${data.supervisorEmail}`);
    }

    const { data: enrollments } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id")
      .eq("campaign_id", data.campaignId);
    const cohortChildIds = [...new Set((enrollments ?? []).map((e: any) => e.child_id as string))];
    if (cohortChildIds.length === 0) {
      throw new Error("Aucun enfant inscrit dans cette campagne pour l'instant.");
    }

    const { data: existingSup } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("child_profile_id")
      .in("child_profile_id", cohortChildIds);
    const alreadySupervised = new Set((existingSup ?? []).map((s: any) => s.child_profile_id as string));
    const unsupervisedChildIds = cohortChildIds.filter((id) => !alreadySupervised.has(id));

    if (unsupervisedChildIds.length === 0) {
      throw new Error("Tous les enfants de cette campagne ont déjà un superviseur.");
    }

    // Pré-check informatif seulement — le trigger DB check_supervisor_quota (migration
    // 20260726120000) fait foi, y compris pour le chemin admin direct (assignSupervisor) qui ne
    // vérifiait jusqu'ici aucun quota du tout.
    const { data: existingAssignments } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("id")
      .eq("supervisor_user_id", supervisor.id);
    const currentCount = existingAssignments?.length ?? 0;
    const quota = 5 + (campaign.extra_supervisors_quota ?? 0);
    const slotsLeft = Math.max(0, quota - currentCount);
    const toAssign = Math.min(data.count, slotsLeft, unsupervisedChildIds.length);

    if (toAssign === 0) {
      throw new Error(`Le superviseur ${data.supervisorEmail} a atteint sa limite de ${quota} enfants. Contactez le support pour augmenter son quota.`);
    }

    const rows = unsupervisedChildIds.slice(0, toAssign).map((childId) => ({
      supervisor_user_id: supervisor.id,
      child_profile_id: childId,
      campaign_id: data.campaignId,
      assigned_by: managerId,
    }));

    const { error } = await (supabaseAdmin as any).from("supervisors").insert(rows);
    if (error) {
      if (error.code === "23505") throw new Error("Ce superviseur est déjà assigné à un ou plusieurs de ces enfants.");
      throw new Error(error.message);
    }

    return { success: true, assignedCount: toAssign };
  });
