import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  sponsor_name: string;
  sponsor_email: string;
  sponsor_message?: string | null;
  target_child_name?: string | null;
  amount_paid: number;
  currency: string;
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
  price_xof: 5000,
  price_eur: 7.50,
  status: "active",
  created_at: new Date().toISOString(),
};

export const getActiveSeason = createServerFn({ method: "GET" }).handler(async () => {
  try {
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

export const getChildEnrolledSeason = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    try {
      const activeSeason = await getActiveSeason({ data: undefined });
      if (!activeSeason || activeSeason.id === DEFAULT_FALLBACK_SEASON.id) {
        return null; // Fallback season doesn't count as an actual paid enrollment
      }

      const { data: enrollment, error } = await (supabaseAdmin as any)
        .from("season_enrollments")
        .select("id")
        .eq("child_id", data.childId)
        .eq("season_id", activeSeason.id)
        .maybeSingle();
      
      if (error || !enrollment) return null;

      return activeSeason as Season;
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
        seasonId: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data }: { data: any }) => {
    const code = `GENIZIO-PARRAIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
        season_id: data.seasonId || DEFAULT_FALLBACK_SEASON.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating sponsorship token:", error);
      return {
        id: "demo-token-" + Date.now(),
        code,
        sponsor_name: data.sponsorName,
        sponsor_email: data.sponsorEmail,
        sponsor_message: data.sponsorMessage,
        target_child_name: data.targetChildName,
        amount_paid: data.amountPaid,
        currency: data.currency,
        is_redeemed: false,
        created_at: new Date().toISOString(),
      } as SponsorshipToken;
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

    // Register enrollment
    await (supabaseAdmin as any).from("season_enrollments").insert({
      season_id: token.season_id || DEFAULT_FALLBACK_SEASON.id,
      child_id: data.childId,
      user_id: userId,
      sponsor_name: token.sponsor_name,
      sponsor_email: token.sponsor_email,
      sponsor_message: token.sponsor_message,
      payment_status: "sponsored",
    });

    return { success: true, token };
  });

export const listSeasonsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: seasons } = await (supabaseAdmin as any)
      .from("seasons")
      .select("*")
      .order("created_at", { ascending: false });

    return (seasons as Season[]) || [DEFAULT_FALLBACK_SEASON];
  });

export const listSponsorshipsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: tokens } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return (tokens as SponsorshipToken[]) || [];
  });
