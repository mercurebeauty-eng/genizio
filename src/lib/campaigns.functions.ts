import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { getActiveSeason } from "./seasons.functions";
import { insertSupervisorAssignments } from "./supervisors.functions";
import { computeSupervisorQuota } from "./supervisor-quota";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  manager_user_id?: string;
  manager_email?: string | null;
  target_count: number;
  extra_supervisors_quota: number;
  max_educators: number;
  start_date: string;
  end_date: string;
  created_at: string;
  /** Mode test/paid (refonte Admin OS, décision #72) — 'test' par défaut. */
  mode?: string;
  /** Prix unitaire par code (campagnes payantes — lien de paiement partageable). */
  price_per_token_xof?: number | null;
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
        // Décision utilisateur (2026-07-26) : une campagne a sa propre fenêtre fixe, partagée par
        // tous ses enfants — contrairement au rolling individuel par défaut (chaque enfant démarre
        // son propre chrono à sa date d'inscription), une cohorte ONG a besoin d'un vrai début et
        // d'une vraie fin communs, pour permettre un bilan de fin de programme cohérent.
        startDate: z.string(),
        endDate: z.string(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
        start_date: data.startDate,
        end_date: data.endDate,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur de création de campagne: ${error.message}`);
    }

    return campaign as Campaign;
  });

// ── Mode test/paid + prix unitaire (refonte Admin OS, 2026-08-13, décision #72) ─
// mode 'test' : codes confirmés d'office (valider le workflow sans facturation) ;
// mode 'paid' : lien de paiement partageable (generateCampaignPaymentLinkAdmin) —
// le prix unitaire par code doit être défini avant de générer le lien.
const CampaignBillingInput = z.object({
  campaignId: z.string().uuid(),
  mode: z.enum(["test", "paid"]),
  pricePerTokenXof: z.number().int().min(0).nullable().optional(),
});

export const updateCampaignBillingAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => CampaignBillingInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { mode: data.mode };
    if (data.pricePerTokenXof !== undefined) {
      patch.price_per_token_xof = data.pricePerTokenXof;
    }
    const { error } = await (supabaseAdmin as any)
      .from("campaigns")
      .update(patch)
      .eq("id", data.campaignId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// Le quota de base (5 enfants/superviseur) est fixé dans le trigger DB check_supervisor_quota
// (migration 20260726120000) — ce champ est le seul levier d'ajustement PAR CAMPAGNE, mais
// n'avait jusqu'ici aucune UI pour le modifier après création (toujours figé à 0 à l'insert).
export const updateCampaignExtraQuotaAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        campaignId: z.string().uuid(),
        extraSupervisorsQuota: z.number().int().min(0).max(50),
        // Capacité d'éducateurs vouchés (2026-07-30) — mirroir du quota superviseurs ci-dessus,
        // même levier "réglé par l'admin après paiement hors-app" (cf. check_campaign_educator_capacity).
        maxEducators: z.number().int().min(0).max(50).default(0),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error } = await (supabaseAdmin as any)
      .from("campaigns")
      .update({ extra_supervisors_quota: data.extraSupervisorsQuota, max_educators: data.maxEducators })
      .eq("id", data.campaignId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return campaign as Campaign;
  });

export interface PaginatedCampaigns {
  data: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ListCampaignsInput = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  statusFilter: z.enum(["all", "active", "upcoming", "ended"]).default("all"),
});

// Pagination + recherche (2026-07-27, décision utilisateur) : au-delà de 50 campagnes l'écran
// devient inutilisable sans navigation par page. Contrairement aux parrainages (filtrés en base),
// le filtrage se fait ici EN MÉMOIRE après récupération — l'email du gestionnaire ne vit pas dans
// la table `campaigns` mais dans auth.users (résolu via listAllUsers), donc une recherche par
// email est impossible côté SQL sans jointure inexistante. Acceptable car les campagnes sont des
// contrats B2B (dizaines), pas des lignes utilisateur (milliers) — à revoir si ce volume change.
export const listCampaignsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ListCampaignsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const empty: PaginatedCampaigns = { data: [], total: 0, page: data.page, pageSize: data.pageSize, totalPages: 1 };
    try {
      // `id` en départage : la pagination ci-dessous découpe ce tableau à chaque requête, donc un
      // ordre non déterministe (created_at n'est pas unique) ferait apparaître/disparaître des
      // lignes d'une page à l'autre. Cf. seasons.functions.ts pour le cas réel mesuré.
      const { data: campaigns, error } = await (supabaseAdmin as any)
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (error || !campaigns) {
        if (error) console.error("Error fetching campaigns:", error);
        return empty;
      }

      // Attach emails safely
      const users = await listAllUsers(supabaseAdmin).catch(() => []);
      const emailMap = new Map(users.map(u => [u.id, u.email]));

      let enriched = (campaigns as Campaign[]).map(c => ({
          ...c,
          manager_email: c.manager_user_id ? emailMap.get(c.manager_user_id) : null
      }));

      const term = data.search?.trim().toLowerCase();
      if (term) {
        enriched = enriched.filter((c) =>
          c.name?.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term) ||
          c.manager_email?.toLowerCase().includes(term)
        );
      }

      if (data.statusFilter !== "all") {
        const now = new Date();
        enriched = enriched.filter((c) => {
          const start = new Date(c.start_date);
          const end = new Date(c.end_date);
          if (data.statusFilter === "active") return now >= start && now <= end;
          if (data.statusFilter === "upcoming") return now < start;
          return now > end; // "ended"
        });
      }

      const total = enriched.length;
      const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
      // Borner la page demandée plutôt que de renvoyer une grille vide : un filtre qui réduit le
      // résultat pendant que l'admin est sur une page lointaine afficherait sinon un écran vide
      // sans expliquer pourquoi (même garde-fou que listSponsorshipsAdmin).
      const page = Math.min(data.page, totalPages);
      const from = (page - 1) * data.pageSize;

      return {
        data: enriched.slice(from, from + data.pageSize),
        total,
        page,
        pageSize: data.pageSize,
        totalPages,
      } as PaginatedCampaigns;
    } catch (err) {
      console.error("Error in listCampaignsAdmin:", err);
      return empty;
    }
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Fetch campaign
    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .single();

    if (!campaign) throw new Error("Campagne introuvable.");

    // Rien ne comparait la taille du lot demandé à l'objectif de la campagne — un admin qui
    // valide deux fois (double-clic, page rechargée puis soumise à nouveau) double le lot en
    // silence. Trouvé en prod : campagne LIBA à 82 codes pour un objectif de 41. On bloque tout
    // dépassement plutôt que de deviner une intention de "top-up" — augmenter l'objectif de la
    // campagne reste le geste explicite si plus de codes sont réellement nécessaires.
    const { count: existingCount } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", data.campaignId);

    if ((existingCount ?? 0) + data.count > campaign.target_count) {
      throw new Error(
        `Cette campagne a déjà ${existingCount ?? 0} code(s) pour un objectif de ${campaign.target_count}. ` +
        `Générer ${data.count} de plus dépasserait l'objectif — ajustez le nombre demandé, ou augmentez l'objectif de la campagne si c'est voulu.`
      );
    }

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
      sponsor_email: "serviceclient@genizio.com",
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

// ── Lien de paiement partageable (mode payé, décision #72, 2026-08-13) ─────────
// Campagne en mode 'paid' : l'admin génère un lien Paystack que l'ONG diffuse ;
// quand le paiement aboutit, le webhook (case 'campaign_b2b' du fulfillment) crée
// un lot de codes B2B confirmés — count = montant / price_per_token_xof.
const CampaignPaymentLinkInput = z.object({
  campaignId: z.string().uuid(),
  tokenCount: z.number().int().min(1).max(200),
  email: z.string().email(),
  callbackUrl: z.string().url(),
});

export const generateCampaignPaymentLinkAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => CampaignPaymentLinkInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error: campErr } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id, name, mode, price_per_token_xof, target_count")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (campErr) throw new Error(campErr.message);
    if (!campaign) throw new Error("Campagne introuvable.");
    if (campaign.mode !== "paid") {
      throw new Error("Cette campagne n'est pas en mode payé — passez-la en mode payé d'abord.");
    }
    if (!campaign.price_per_token_xof || campaign.price_per_token_xof <= 0) {
      throw new Error("Définissez un prix unitaire par code avant de générer le lien.");
    }

    // Même garde anti-dépassement que generateCampaignTokensAdmin : le lot payé ne
    // doit jamais dépasser l'objectif de la campagne.
    const { count: existingCount } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    if ((existingCount ?? 0) + data.tokenCount > campaign.target_count) {
      throw new Error(
        `Cette campagne a déjà ${existingCount ?? 0} code(s) pour un objectif de ${campaign.target_count} — ` +
          `un paiement de ${data.tokenCount} code(s) dépasserait l'objectif.`
      );
    }

    const amountXof = campaign.price_per_token_xof * data.tokenCount;
    const { initializePaystackTransaction } = await import("@/lib/paystack.server");
    const reference = `GENIZIO-CAMP-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    const result = await initializePaystackTransaction({
      email: data.email,
      amountXof,
      reference,
      callbackUrl: data.callbackUrl,
      metadata: {
        type: "campaign_b2b",
        campaign_id: campaign.id,
        token_count: data.tokenCount,
      },
    });
    return {
      authorizationUrl: result.authorizationUrl,
      reference,
      amountXof,
      tokenCount: data.tokenCount,
    };
  });

// Jusqu'ici, rien dans la nav ne signalait à un chargé de projet ONG que son compte avait un
// dashboard B2B — /b2b n'apparaît nulle part (ni AppHeader, ni AppTabBar, ni /profile), contrairement
// à /supervisor et /admin qui sont déjà surfacés conditionnellement dans /profile. Seul moyen
// d'y arriver aujourd'hui : quelqu'un chez Génizio communique l'URL à la main. Ce check permet
// à /profile d'afficher le même genre de lien conditionnel que pour superviseur/admin.
export const checkIsCampaignManager = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;
    const { count } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("manager_user_id", userId);
    return { isManager: (count ?? 0) > 0 };
  });

export interface CampaignPublicInfo {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  spotsRemaining: number;
  isFull: boolean;
  isWithinWindow: boolean;
}

// Point d'entrée du lien/QR partagé par une ONG (2026-07-27) — remplace la distribution de 100
// codes alphanumériques par lot : la famille scanne un QR ou clique un lien, sans jamais avoir à
// saisir/copier un code. Volontairement SANS middleware d'auth : cette page doit s'afficher
// avant même que la famille se connecte (c'est le tout premier écran du parcours). Ne renvoie
// que des métadonnées non sensibles — jamais manager_email, jamais de donnée d'enfant.
export const getCampaignPublicInfo = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ campaignId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign, error } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id, name, description, target_count, start_date, end_date")
      .eq("id", data.campaignId)
      .maybeSingle();

    if (error || !campaign) throw new Error("Programme introuvable.");

    const { count } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", data.campaignId);

    const enrolledCount = count ?? 0;
    const now = new Date();

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description ?? null,
      startDate: campaign.start_date,
      endDate: campaign.end_date,
      spotsRemaining: Math.max(0, campaign.target_count - enrolledCount),
      isFull: enrolledCount >= campaign.target_count,
      isWithinWindow: now >= new Date(campaign.start_date) && now <= new Date(campaign.end_date),
    } as CampaignPublicInfo;
  });

// Inscription directe via le lien/QR — AUCUN sponsorship_token créé ici (contrairement à
// redeemSponsorshipToken) : ce chemin remplace le code, il ne le complète pas. La contrainte
// réelle de capacité vit dans le trigger check_campaign_capacity (migration
// 20260727090000_campaign_enrollment_capacity_trigger) ; le pré-check ci-dessous n'est qu'un
// message d'erreur clair avant d'atteindre la base.
const EnrollViaCampaignLinkInput = z.object({
  campaignId: z.string().uuid(),
  childId: z.string().uuid(),
});

export const enrollChildViaCampaignLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => EnrollViaCampaignLinkInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: child } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) {
      throw new Error("Ce profil enfant ne vous appartient pas.");
    }

    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id, name, target_count")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Programme introuvable.");

    const { data: existingForChild } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("id")
      .eq("child_id", data.childId)
      .eq("campaign_id", data.campaignId)
      .maybeSingle();
    if (existingForChild) throw new Error("Cet enfant est déjà inscrit à ce programme.");

    const { count } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", data.campaignId);
    if ((count ?? 0) >= campaign.target_count) {
      throw new Error("Ce programme a atteint sa capacité maximale de places.");
    }

    const activeSeason = await getActiveSeason({ data: undefined });

    const { error } = await (supabaseAdmin as any).from("season_enrollments").insert({
      season_id: activeSeason.id,
      child_id: data.childId,
      user_id: userId,
      sponsor_name: campaign.name,
      sponsor_email: "serviceclient@genizio.com",
      payment_status: "sponsored",
      campaign_id: data.campaignId,
    });

    if (error) {
      if (error.code === "P0001") throw new Error("Ce programme a atteint sa capacité maximale de places.");
      throw new Error(error.message);
    }

    return { success: true };
  });

export interface CampaignTokenDetail {
  id: string;
  code: string;
  campaign_id: string | null;
  is_redeemed: boolean;
  redeemed_at: string | null;
  redeemed_by_child_id: string | null;
  created_at: string;
  sponsor_name?: string;
  sponsor_email?: string;
  child_name?: string | null;
  parent_email?: string | null;
}

export const listCampaignTokensAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: any) =>
    z
      .object({
        campaignId: z.string().uuid(),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Départage par id : un lot de codes est inséré en masse et partage la même horodate, sans
    // quoi l'ordre d'affichage change d'un chargement à l'autre pour les mêmes données.
    const { data: tokens, error } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("*, child_profiles:redeemed_by_child_id(id, name, user_id)")
      .eq("campaign_id", data.campaignId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching campaign tokens:", error);
      throw new Error(`Erreur lors de la récupération des tokens: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return [] as CampaignTokenDetail[];
    }

    const users = await listAllUsers(supabaseAdmin).catch(() => []);
    const emailMap = new Map(users.map((u) => [u.id, u.email]));

    return (tokens as any[]).map((t) => {
      const child = t.child_profiles;
      const childName = child?.name ?? null;
      const parentEmail = child?.user_id ? (emailMap.get(child.user_id) ?? null) : null;

      return {
        id: t.id,
        code: t.code,
        campaign_id: t.campaign_id,
        is_redeemed: !!t.is_redeemed,
        redeemed_at: t.redeemed_at ?? null,
        redeemed_by_child_id: t.redeemed_by_child_id ?? null,
        created_at: t.created_at,
        sponsor_name: t.sponsor_name,
        sponsor_email: t.sponsor_email,
        child_name: childName,
        parent_email: parentEmail,
      };
    }) as CampaignTokenDetail[];
  });

export interface ManagerTokenDetail {
  id: string;
  code: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

// Sans ceci, un partenaire ONG n'a AUCUN moyen de récupérer les codes qu'il a payés — la seule
// liste existante (listCampaignTokensAdmin ci-dessus) est réservée à l'admin Génizio. Constaté en
// prod : 280 codes sur 283 jamais activés, sur des campagnes dont le gestionnaire n'a jamais pu
// voir un seul code. Jamais child_name/parent_email ici (contrairement à la variante admin) —
// même règle de non-identification que getNgoDashboardData : le gestionnaire ne voit jamais
// quel enfant précis a activé quoi.
export const listCampaignTokensForManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({ campaignId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id")
      .eq("id", data.campaignId)
      .eq("manager_user_id", userId)
      .maybeSingle();

    if (!campaign) throw new Error("Vous n'avez pas les droits sur cette campagne.");

    const { data: tokens, error } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("id, code, is_redeemed, redeemed_at, created_at")
      .eq("campaign_id", data.campaignId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw new Error(error.message);

    return (tokens ?? []) as ManagerTokenDetail[];
  });

// ────────────────────────────────────────────────────────────
// B2B Dashboard (Project Manager)
// ────────────────────────────────────────────────────────────

// Décision utilisateur (2026-07-26) : le chargé de projet ONG ne voit JAMAIS l'identité d'un
// enfant (ni nom, ni portfolio) — son rôle se limite à la gestion des superviseurs et au suivi
// d'impact agrégé. C'est ce qui rend inutile tout consentement parental spécifique au B2B :
// aucune donnée personnelle d'enfant ne remonte jamais à ce compte. Ne JAMAIS réintroduire
// child_profiles.name/city/interests ou un lien vers /profiles/$profileId dans cette réponse.
//
// Scope explicite sur UNE campagne (celle choisie côté client, ou la première par défaut) —
// avant, les stats sommaient TOUTES les campagnes du gestionnaire mais le titre/dates affichés
// venaient de campaigns[0] seul : un gestionnaire avec 2 programmes verrait les chiffres des
// deux sous le nom d'un seul, sans moyen de les distinguer. Invisible tant que chaque
// gestionnaire n'a qu'une seule campagne (le cas aujourd'hui), mais faux dès le 2e contrat.
export const getNgoDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ campaignId: z.string().uuid().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: campaigns, error: campErr } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .eq("manager_user_id", userId);

    if (campErr) throw new Error(campErr.message);
    if (!campaigns || campaigns.length === 0) {
      return { campaigns: [], activeCampaignId: null, stats: null, supervisors: [], narratives: [] };
    }

    const selected = campaigns.find((c: any) => c.id === data.campaignId) ?? campaigns[0];
    const campaignId = selected.id as string;

    const { data: enrollments, error: enrErr } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id")
      .eq("campaign_id", campaignId);
    if (enrErr) throw new Error(enrErr.message);

    const childIds = [...new Set((enrollments ?? []).map((e: any) => e.child_id as string))];

    const { data: tokens } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .select("id, is_redeemed")
      .eq("campaign_id", campaignId);

    const totalTokens = tokens?.length || 0;
    const redeemedTokens = tokens?.filter((t: any) => t.is_redeemed).length || 0;

    let challenges: any[] = [];
    // Distribution des talents AGRÉGÉE sur toute la cohorte — jamais par enfant nommé. C'est le
    // cœur du "Rapport d'Impact" que voit le chargé de projet, sans jamais exposer qui a quel
    // talent.
    const talentTotals: Record<string, number> = {};
    // Récits pour le rapport d'impact exportable : titre + domaine + observation de Naya, jamais
    // child_id ni aucun identifiant — seule matière que ce marché n'a pas ailleurs, donc seule
    // chose qui rend un rapport ONG défendable devant un bailleur plutôt qu'un graphique nu.
    const narratives: { domain: string; title: string; observation: string }[] = [];
    if (childIds.length > 0) {
      const [{ data: ch }, { data: profiles }] = await Promise.all([
        (supabaseAdmin as any)
          .from("challenges")
          .select("id, status, domain, child_id, title, ai_observations")
          .in("child_id", childIds)
          .is("deleted_at", null),
        (supabaseAdmin as any).from("child_profiles").select("talents").in("id", childIds),
      ]);
      challenges = ch || [];
      for (const p of profiles ?? []) {
        const talents = (p.talents ?? {}) as Record<string, number>;
        for (const [key, val] of Object.entries(talents)) {
          talentTotals[key] = (talentTotals[key] ?? 0) + (Number(val) || 0);
        }
      }
      for (const c of challenges) {
        if (narratives.length >= 3) break;
        if (c.status === "completed" && c.ai_observations && String(c.ai_observations).trim().length > 0) {
          narratives.push({ domain: c.domain, title: c.title, observation: c.ai_observations });
        }
      }
    }

    // Superviseurs de CETTE campagne : compte assigné seulement, jamais quels enfants précis.
    const { data: supervisorRows } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("supervisor_user_id")
      .eq("campaign_id", campaignId);

    const usersMap = new Map((await listAllUsers(supabaseAdmin)).map((u) => [u.id, u.email]));
    const supervisorCounts = new Map<string, number>();
    for (const row of supervisorRows ?? []) {
      supervisorCounts.set(row.supervisor_user_id, (supervisorCounts.get(row.supervisor_user_id) ?? 0) + 1);
    }
    const totalSupervisorQuota = computeSupervisorQuota({
      referenceCreatedAt: selected.created_at,
      extraQuota: selected.extra_supervisors_quota,
    });

    return {
      campaigns: campaigns as Campaign[],
      activeCampaignId: campaignId,
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
      narratives,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const cohortChildIds: string[] = [...new Set<string>((enrollments ?? []).map((e: any) => e.child_id as string))];
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
    const quota = computeSupervisorQuota({
      referenceCreatedAt: campaign.created_at,
      extraQuota: campaign.extra_supervisors_quota,
    });
    const slotsLeft = Math.max(0, quota - currentCount);
    const toAssign = Math.min(data.count, slotsLeft, unsupervisedChildIds.length);

    if (toAssign === 0) {
      throw new Error(`Le superviseur ${data.supervisorEmail} a atteint sa limite de ${quota} enfants. Contactez le support pour augmenter son quota.`);
    }

    // Insertion centralisée (supervisors.functions.ts) — même point de passage que le chemin
    // admin manuel, donc la contrainte UNIQUE(child_profile_id) et le message d'erreur sont
    // gérés à un seul endroit pour les deux chemins.
    await insertSupervisorAssignments(supabaseAdmin, {
      supervisorUserId: supervisor.id,
      childProfileIds: unsupervisedChildIds.slice(0, toAssign),
      campaignId: data.campaignId,
      assignedBy: managerId,
    });

    return { success: true, assignedCount: toAssign };
  });

// Éducateurs vouchés par campagne (2026-07-30) — même self-service gestionnaire
// qu'assignCampaignSupervisor ci-dessus, mais plus simple : pas de pioche automatique dans une
// cohorte, on voucher un email précis. L'auto-déclaration seule (relationship_type =
// "educateur") ne suffit jamais — il faut en plus être ajouté ici, par un gestionnaire qui
// connaît déjà cette personne. Le trigger DB check_campaign_educator_capacity (migration
// 20260730100000) fait foi sur la limite, ce check est juste un message d'erreur plus clair.
export const addCampaignEducator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z
      .object({
        campaignId: z.string().uuid(),
        educatorEmail: z.string().email(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const educator = users.find((u) => u.email === data.educatorEmail);
    if (!educator) {
      throw new Error(`Aucun compte trouvé pour l'email: ${data.educatorEmail}`);
    }
    if ((educator as any).user_metadata?.relationship_type !== "educateur") {
      throw new Error(
        `${data.educatorEmail} doit d'abord choisir "Éducateur" comme lien avec l'enfant dans son compte (Réglages) avant de pouvoir être ajouté ici.`
      );
    }

    const { count: currentCount } = await (supabaseAdmin as any)
      .from("campaign_educators")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", data.campaignId)
      .is("removed_at", null);
    if ((currentCount ?? 0) >= (campaign.max_educators ?? 0)) {
      throw new Error(
        `Capacité éducateurs atteinte (${currentCount} / ${campaign.max_educators}). Contactez le support pour l'augmenter.`
      );
    }

    const { error } = await (supabaseAdmin as any)
      .from("campaign_educators")
      .insert({ campaign_id: data.campaignId, educator_user_id: educator.id, added_by: managerId })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error(`${data.educatorEmail} est déjà éducateur sur cette campagne.`);
      throw new Error(error.message);
    }

    return { success: true };
  });

export interface CampaignEducator {
  id: string;
  educator_user_id: string;
  email: string;
  added_at: string;
}

export const listCampaignEducators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({ campaignId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const managerId = (context as any).claims?.sub;
    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id")
      .eq("id", data.campaignId)
      .eq("manager_user_id", managerId)
      .maybeSingle();
    if (!campaign) throw new Error("Vous n'avez pas les droits sur cette campagne.");

    const { data: rows } = await (supabaseAdmin as any)
      .from("campaign_educators")
      .select("id, educator_user_id, added_at")
      .eq("campaign_id", data.campaignId)
      .is("removed_at", null)
      .order("added_at", { ascending: false });

    const users = await listAllUsers(supabaseAdmin);
    const usersMap = new Map(users.map((u) => [u.id, u.email as string]));

    return (rows ?? []).map((r: any) => ({
      id: r.id,
      educator_user_id: r.educator_user_id,
      email: usersMap.get(r.educator_user_id) || "Inconnu",
      added_at: r.added_at,
    })) as CampaignEducator[];
  });

// Au retrait, verrouille l'accès aux enfants VENUS DE CETTE CAMPAGNE PRÉCISÉMENT et possédés par
// cet éducateur — jamais tout son compte (il peut avoir ses propres enfants hors campagne), et
// jamais les données de l'enfant (talents/xp/défis restent intacts, seul access_locked_at
// change). L'échappatoire (devenir Superviseur) est un lien WhatsApp côté UI, pas géré ici.
export const removeCampaignEducator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) =>
    z.object({ campaignId: z.string().uuid(), educatorUserId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const managerId = (context as any).claims?.sub;
    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id")
      .eq("id", data.campaignId)
      .eq("manager_user_id", managerId)
      .maybeSingle();
    if (!campaign) throw new Error("Vous n'avez pas les droits sur cette campagne.");

    const { error: removeError } = await (supabaseAdmin as any)
      .from("campaign_educators")
      .update({ removed_at: new Date().toISOString() })
      .eq("campaign_id", data.campaignId)
      .eq("educator_user_id", data.educatorUserId)
      .is("removed_at", null);
    if (removeError) throw new Error(removeError.message);

    const { data: enrollments } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id")
      .eq("campaign_id", data.campaignId);
    const childIds: string[] = [...new Set<string>((enrollments ?? []).map((e: any) => e.child_id as string))];

    let lockedCount = 0;
    if (childIds.length > 0) {
      const { data: lockedRows, error: lockError } = await (supabaseAdmin as any)
        .from("child_profiles")
        .update({ access_locked_at: new Date().toISOString() })
        .in("id", childIds)
        .eq("user_id", data.educatorUserId)
        .select("id");
      if (lockError) throw new Error(lockError.message);
      lockedCount = lockedRows?.length ?? 0;
    }

    return { success: true, lockedChildrenCount: lockedCount };
  });
