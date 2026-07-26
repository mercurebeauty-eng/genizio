import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface Season {
  id: string;
  title: string;
  subtitle?: string | null;
  theme: string;
  description?: string | null;
  duration_months: number;
  start_date: string;
  end_date: string;
  price_xof: number;
  price_eur: number;
  status: "upcoming" | "active" | "completed" | "archived";
  created_at: string;
}

export interface SponsorshipToken {
  id: string;
  code: string;
  season_id?: string | null;
  campaign_id?: string | null;
  sponsor_name: string;
  sponsor_email: string;
  sponsor_message?: string | null;
  target_child_name?: string | null;
  amount_paid: number;
  currency: string;
  payment_confirmed: boolean;
  is_redeemed: boolean;
  redeemed_by_child_id?: string | null;
  created_at: string;
}

export const DEFAULT_FALLBACK_SEASON: Season = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "Saison 1 : Les Penseurs & Inventeurs",
  subtitle: "Trimestre d'Éléments (3 Mois)",
  theme: "Exploration des 9 Intelligences Multiples & Physique du Quotidien",
  description: "Un parcours immersif de 3 mois pour explorer l'ensemble des intelligences de Gardner, construire son portfolio d'artefacts et débloquer son passeport d'excellence.",
  duration_months: 3,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  price_xof: 10000,
  price_eur: 15,
  status: "active",
  created_at: new Date().toISOString(),
};

// Rotation automatique paresseuse (pas de cron) : si la saison active a dépassé sa date de fin
// "catalogue" (seasons.end_date — le calendrier du thème affiché, distinct de la fenêtre d'accès
// individuelle de chaque enfant qui reste calculée séparément, cf. getChildEnrolledSeason), on la
// marque 'completed' et on active la prochaine saison 'upcoming' en attente. Appelée au moment
// de la lecture plutôt que sur une tâche planifiée — suffisant pour un besoin qui tolère un délai
// de quelques heures, et évite d'ajouter de l'infra pour ça.
async function rotateExpiredActiveSeason(): Promise<void> {
  try {
    const { data: current } = await (supabaseAdmin as any)
      .from("seasons")
      .select("id, end_date")
      .eq("status", "active")
      .maybeSingle();

    if (!current || new Date(current.end_date) > new Date()) return;

    const { data: next } = await (supabaseAdmin as any)
      .from("seasons")
      .select("id")
      .eq("status", "upcoming")
      .order("start_date", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (next) {
      await (supabaseAdmin as any).rpc("activate_season", { target_id: next.id });
    } else {
      // Personne en attente : on clôture quand même la saison expirée plutôt que de la laisser
      // "active" indéfiniment après sa date de fin.
      await (supabaseAdmin as any).from("seasons").update({ status: "completed" }).eq("id", current.id);
    }
  } catch (err) {
    console.error("Error rotating expired season:", err);
  }
}

export const getActiveSeason = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await rotateExpiredActiveSeason();

    const { data: season } = await (supabaseAdmin as any)
      .from("seasons")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (season as Season) || DEFAULT_FALLBACK_SEASON;
  } catch (err) {
    console.error("Error fetching active season:", err);
    return DEFAULT_FALLBACK_SEASON;
  }
});

// Fenêtre d'accès d'une inscription : rolling individuel par défaut (enrolled_at +
// duration_months, décision #48), MAIS fixe et partagée par toute la cohorte si l'inscription
// vient d'une campagne B2B (décision utilisateur 2026-07-26) — une ONG a besoin d'un vrai bilan
// de fin de programme sur une cohorte, pas de 100 chronos individuels qui ne s'alignent jamais.
// Exporté pour être réutilisé à l'identique dans challenges.functions.ts (thématique narrative).
export function resolveEnrollmentWindow(
  enrolledAt: string,
  seasonDurationMonths: number,
  campaign: { start_date: string; end_date: string } | null | undefined
): { start: Date; end: Date } {
  if (campaign) {
    return { start: new Date(campaign.start_date), end: new Date(campaign.end_date) };
  }
  const start = new Date(enrolledAt);
  const end = new Date(start);
  end.setMonth(end.getMonth() + seasonDurationMonths);
  return { start, end };
}

export const getChildEnrolledSeason = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    try {
      // Décision utilisateur (2026-07-26) : l'accès individuel d'un enfant ne doit jamais être
      // cassé rétroactivement par une rotation de la saison globale. On ne compare donc plus
      // à getActiveSeason() — on lit directement la saison référencée par la propre inscription
      // de cet enfant, même si elle est depuis passée en 'completed'/'archived' côté catalogue.
      const { data: enrollment, error } = await (supabaseAdmin as any)
        .from("season_enrollments")
        .select("id, enrolled_at, campaign_id, seasons(*), campaigns(start_date, end_date)")
        .eq("child_id", data.childId)
        .order("enrolled_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !enrollment || !enrollment.seasons) return null;

      const season = enrollment.seasons as Season;
      if (season.id === DEFAULT_FALLBACK_SEASON.id) return null;

      const { start, end } = resolveEnrollmentWindow(
        enrollment.enrolled_at,
        season.duration_months,
        enrollment.campaign_id ? enrollment.campaigns : null
      );

      if (new Date() > end) return null; // fenêtre expirée

      return {
        ...season,
        individual_start_date: start.toISOString(),
        individual_end_date: end.toISOString(),
      };
    } catch (err) {
      console.error("Error checking child season enrollment:", err);
      return null;
    }
  });

export const createSponsorshipToken = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        sponsorName: z.string().min(2, "Nom du parrain obligatoire"),
        sponsorEmail: z.string().email("Adresse email invalide"),
        sponsorMessage: z.string().optional(),
        targetChildName: z.string().optional(),
        amountPaid: z.number().default(5000),
        currency: z.string().default("XOF"),
      })
      .parse(input)
  )
  .handler(async ({ data }: { data: any }) => {
    const code = `GENIZIO-PARRAIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Décision utilisateur (2026-07-26) : un code se lie à sa saison à l'ACTIVATION
    // (redeemSponsorshipToken), pas à la génération — le season_id ici n'est qu'indicatif
    // (saison en cours au moment de l'achat, pour affichage admin), jamais utilisé pour
    // déterminer l'inscription réelle de l'enfant.
    const activeSeason = await getActiveSeason({ data: undefined });

    const { data: token, error } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .insert({
        code,
        sponsor_name: data.sponsorName,
        sponsor_email: data.sponsorEmail,
        sponsor_message: data.sponsorMessage || null,
        target_child_name: data.targetChildName || null,
        amount_paid: data.amountPaid,
        currency: data.currency,
        season_id: activeSeason.id,
      })
      .select("*")
      .single();

    // Fabriquer un faux succès ici masquerait une écriture DB réellement échouée derrière un
    // écran de confirmation identique — le parrain croirait son code enregistré alors qu'il
    // n'existe nulle part (trouvé en auditant ce chemin : c'était le cas jusqu'ici, la table
    // seasons étant vide, chaque appel violait sponsorship_tokens_season_id_fkey en silence).
    if (error) {
      console.error("Error creating sponsorship token:", error);
      throw new Error("Erreur lors de l'enregistrement du parrainage. Veuillez réessayer.");
    }

    return token as SponsorshipToken;
  });

export const redeemSponsorshipToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        code: z.string().min(4),
        childId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const { userId } = context;

    const { data: token, error: tokenErr } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("*")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (tokenErr || !token) {
      throw new Error("Code de parrainage introuvable ou invalide.");
    }

    if (token.is_redeemed) {
      throw new Error("Ce code de parrainage a déjà été utilisé.");
    }

    // createSponsorshipToken (page publique /parrainage, sans authentification) ne vérifie
    // aucun paiement réel au moment de la génération du code — sans ce garde-fou, n'importe
    // qui pouvait créer un code gratuitement puis le rédimer immédiatement. Un admin doit
    // confirmer manuellement le paiement (WhatsApp/Mobile Money) via confirmSponsorshipPaymentAdmin
    // avant que ce code ne devienne utilisable, même pattern que les commandes boutique.
    if (!token.payment_confirmed) {
      throw new Error("Ce parrainage est en attente de confirmation de paiement par l'équipe Génizio. Vous recevrez une notification dès son activation.");
    }

    const { error: updateErr } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .update({
        is_redeemed: true,
        redeemed_by_child_id: data.childId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    if (updateErr) {
      throw new Error("Erreur lors de la validation du code.");
    }

    // Décision utilisateur (2026-07-26) : le code se lie à sa saison au moment de l'ACTIVATION,
    // pas de sa génération — token.season_id n'est qu'indicatif (voir createSponsorshipToken /
    // generateCampaignTokensAdmin). Un lot de 100 codes B2B distribué sur 3 mois doit faire
    // démarrer chaque enfant sur la vraie saison en cours à SON activation, pas sur celle qui
    // était active le jour où l'admin a généré le lot.
    const activeSeason = await getActiveSeason({ data: undefined });

    await (supabaseAdmin as any).from("season_enrollments").insert({
      season_id: activeSeason.id,
      child_id: data.childId,
      user_id: userId,
      sponsor_name: token.sponsor_name,
      sponsor_email: token.sponsor_email,
      sponsor_message: token.sponsor_message,
      payment_status: "sponsored",
      campaign_id: token.campaign_id || null,
    });

    return { success: true, token };
  });

// Toutes les fonctions "*Admin" de ce fichier étaient gardées par requireSupabaseAuth au lieu de
// requireAdmin — n'importe quel compte parent authentifié pouvait les appeler directement (le
// garde-fou de /admin n'est que côté client, pas sur le endpoint lui-même). Trouvaille grave sur
// listSponsorshipsAdmin (fuite des codes/emails de parrainage à tout utilisateur connecté — la
// même exposition que la policy RLS retirée le 22/07, mais toujours ouverte via ce chemin),
// confirmSponsorshipPaymentAdmin (n'importe qui pouvait confirmer le paiement de N'IMPORTE QUEL
// code puis le rédimer gratuitement) et enrollChildAdmin (inscription gratuite de n'importe quel
// enfant). Corrigé sur les 8 fonctions de ce fichier.
export const listSeasonsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    try {
      await rotateExpiredActiveSeason();

      const { data: seasons, error } = await (supabaseAdmin as any)
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !seasons || seasons.length === 0) {
        if (error) console.error("Error fetching seasons:", error);
        return [DEFAULT_FALLBACK_SEASON];
      }

      return seasons as Season[];
    } catch (err) {
      console.error("Error in listSeasonsAdmin:", err);
      return [DEFAULT_FALLBACK_SEASON];
    }
  });

export const listSponsorshipsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: tokens } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return (tokens as SponsorshipToken[]) || [];
  });

// Sans ceci, aucun code de parrainage ne pouvait jamais devenir légitimement utilisable une
// fois le garde-fou payment_confirmed ajouté à redeemSponsorshipToken — l'admin bascule ce
// flag à TRUE une fois le paiement WhatsApp/Mobile Money du parrain vérifié manuellement.
export const confirmSponsorshipPaymentAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) => z.object({ tokenId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .update({ payment_confirmed: true })
      .eq("id", data.tokenId);

    if (error) {
      throw new Error(`Erreur lors de la confirmation du paiement: ${error.message}`);
    }
    return { success: true };
  });

export const createSeasonAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        title: z.string().min(3),
        subtitle: z.string().optional(),
        theme: z.string().min(3),
        description: z.string().optional(),
        duration_months: z.number().int().positive().default(3),
        start_date: z.string(),
        end_date: z.string(),
        price_xof: z.number().positive().default(10000),
        price_eur: z.number().positive().default(15),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { error } = await (supabaseAdmin as any).from("seasons").insert({
      ...data,
      status: "upcoming",
    });

    if (error) {
      throw new Error(`Erreur lors de la création de la saison: ${error.message}`);
    }
    return { success: true };
  });

export const updateSeasonStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        seasonId: z.string().uuid(),
        status: z.enum(["upcoming", "active", "completed", "archived"]),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    // Activer passe par le RPC atomique (désactive l'ancienne active -> 'completed' + active la
    // cible dans la même transaction) pour garantir l'invariant "une seule saison active à la
    // fois" même depuis un clic manuel admin, pas seulement depuis la rotation automatique.
    if (data.status === "active") {
      const { error } = await (supabaseAdmin as any).rpc("activate_season", { target_id: data.seasonId });
      if (error) throw new Error(`Erreur lors de l'activation: ${error.message}`);
      return { success: true };
    }

    const { error } = await (supabaseAdmin as any)
      .from("seasons")
      .update({ status: data.status })
      .eq("id", data.seasonId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
    return { success: true };
  });

export const updateSeasonAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        seasonId: z.string().uuid(),
        title: z.string().min(3),
        subtitle: z.string().optional(),
        theme: z.string().min(3),
        description: z.string().optional(),
        duration_months: z.number().int().positive().default(3),
        start_date: z.string(),
        end_date: z.string(),
        price_xof: z.number().positive().default(10000),
        price_eur: z.number().positive().default(15),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { seasonId, ...fields } = data;
    const { error } = await (supabaseAdmin as any).from("seasons").update(fields).eq("id", seasonId);

    if (error) {
      throw new Error(`Erreur lors de la modification de la saison: ${error.message}`);
    }
    return { success: true };
  });

export const deleteSeasonAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) => z.object({ seasonId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    // Suppression = risque supérieur à l'archivage : season_id est en ON DELETE CASCADE sur
    // season_enrollments et sponsorship_tokens (migration 20260725100000). Supprimer une saison
    // déjà utilisée effacerait l'historique de paiement/inscription des familles concernées.
    // On ne l'autorise donc que pour une saison jamais utilisée ; sinon on dirige vers Archiver.
    const [{ count: enrollmentCount }, { count: tokenCount }] = await Promise.all([
      (supabaseAdmin as any)
        .from("season_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("season_id", data.seasonId),
      (supabaseAdmin as any)
        .from("sponsorship_tokens")
        .select("id", { count: "exact", head: true })
        .eq("season_id", data.seasonId),
    ]);

    if ((enrollmentCount ?? 0) > 0 || (tokenCount ?? 0) > 0) {
      throw new Error(
        "Impossible de supprimer : cette saison a déjà des inscriptions ou des parrainages liés. Archivez-la à la place pour préserver leur historique."
      );
    }

    const { error } = await (supabaseAdmin as any).from("seasons").delete().eq("id", data.seasonId);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
    return { success: true };
  });

export const enrollChildAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        childId: z.string().uuid(),
        seasonId: z.string().uuid(),
        campaignId: z.string().uuid().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    // 1. Fetch child profile to get the parent user_id
    const { data: childProfile, error: childErr } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("user_id")
      .eq("id", data.childId)
      .single();

    if (childErr || !childProfile) {
      throw new Error("Profil enfant introuvable.");
    }

    // 2. Check if an enrollment already exists for this child
    const { data: existing } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("id")
      .eq("child_id", data.childId)
      .order("enrolled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await (supabaseAdmin as any)
        .from("season_enrollments")
        .update({
          season_id: data.seasonId,
          campaign_id: data.campaignId || null,
          enrolled_at: new Date().toISOString(),
          payment_status: "admin_granted",
        })
        .eq("id", existing.id);

      if (updateErr) {
        throw new Error(`Erreur lors de la mise à jour: ${updateErr.message}`);
      }
      return { success: true };
    }

    // 3. Insert new enrollment with correct parent user_id
    const { error: insertErr } = await (supabaseAdmin as any).from("season_enrollments").insert({
      season_id: data.seasonId,
      child_id: data.childId,
      user_id: childProfile.user_id,
      campaign_id: data.campaignId || null,
      sponsor_name: data.campaignId ? "Attribution Campagne Admin" : "Admin Enrollment",
      sponsor_email: "admin@genizio.com",
      payment_status: "admin_granted",
    });

    if (insertErr) {
      throw new Error(`Erreur lors de l'inscription: ${insertErr.message}`);
    }
    return { success: true };
  });

export const unenrollCampaignAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        childId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { error } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .update({ campaign_id: null })
      .eq("child_id", data.childId);

    if (error) {
      throw new Error(`Erreur lors du retrait de la campagne: ${error.message}`);
    }
    return { success: true };
  });

const EXPIRATION_REMINDER_WINDOW_DAYS = 14;

// Il n'existait jusqu'ici AUCUN rappel de fin d'accès : getChildEnrolledSeason renvoie
// silencieusement `null` une fois la fenêtre passée, sans jamais prévenir ni le parent ni
// l'admin. Avec le rolling individuel (chaque famille a sa propre date de fin), une seule
// communication groupée de fin de saison ne suffit plus — il faut une vue qui liste, par
// famille, combien de jours il lui reste, pour permettre une relance manuelle (WhatsApp),
// même logique que le reste de l'app (pas d'envoi automatisé, aucune infra d'email/SMS n'existe
// ici).
export const getUpcomingExpirationsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data: enrollments, error } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id, enrolled_at, campaign_id, child_profiles(name, user_id), seasons(duration_months), campaigns(name, start_date, end_date)")
      .order("enrolled_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Ne garder que l'inscription la plus RÉCENTE de chaque enfant (déjà trié desc par
    // enrolled_at) — un enfant peut avoir des inscriptions historiques d'anciennes saisons qui ne
    // représentent plus sa fenêtre d'accès actuelle.
    const latestByChild = new Map<string, any>();
    for (const e of enrollments ?? []) {
      if (!latestByChild.has(e.child_id)) latestByChild.set(e.child_id, e);
    }

    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const phoneByUserId = new Map(users.map((u) => [u.id, (u.user_metadata as any)?.phone as string | undefined]));

    const now = new Date();
    const results: Array<{
      childId: string;
      childName: string;
      parentPhone: string | null;
      campaignName: string | null;
      endDate: string;
      daysLeft: number;
    }> = [];

    for (const e of latestByChild.values()) {
      if (!e.seasons) continue;
      const { end } = resolveEnrollmentWindow(
        e.enrolled_at,
        e.seasons.duration_months,
        e.campaign_id ? e.campaigns : null
      );
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft >= 0 && daysLeft <= EXPIRATION_REMINDER_WINDOW_DAYS) {
        results.push({
          childId: e.child_id,
          childName: e.child_profiles?.name ?? "?",
          parentPhone: phoneByUserId.get(e.child_profiles?.user_id) ?? null,
          campaignName: e.campaigns?.name ?? null,
          endDate: end.toISOString(),
          daysLeft,
        });
      }
    }

    return results.sort((a, b) => a.daysLeft - b.daysLeft);
  });
