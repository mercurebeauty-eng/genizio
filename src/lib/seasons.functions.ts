import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PROMO_PRICE_XOF, PROMO_PRICE_EUR } from "@/lib/pricing";
import { computeAccessPeriodWindow } from "@/lib/child-access";

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
  months_count?: number | null;
  amount_paid: number;
  currency: string;
  payment_confirmed: boolean;
  is_redeemed: boolean;
  redeemed_by_child_id?: string | null;
  redeemed_at?: string | null;
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

      // Pas de check "season.id === DEFAULT_FALLBACK_SEASON.id" ici : cet UUID a été utilisé le
      // 2026-07-26 pour semer la VRAIE Saison 1 en base (résolution d'une contrainte de clé
      // étrangère, cf. 20260726120000_b2b_campaigns_schema.sql:10-16) — un tel check nullait à
      // tort tout enfant réellement inscrit à la saison courante depuis cette date. Le garde-fou
      // ci-dessus (`!enrollment.seasons`) suffit : la FK season_id garantit qu'une ligne
      // season_enrollments ne référence jamais une saison inexistante.
      const season = enrollment.seasons as Season;

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
        // Décision utilisateur (2026-08-05) : le parrain choisit 1 à 6 mois ; le code vaut
        // exactement ce nombre de mois d'accès à la rédemption. Le montant est RECALCULÉ
        // côté serveur (mois × tarif promo) — la valeur du client n'est qu'un affichage.
        months: z.number().int().min(1).max(6).default(3),
        currency: z.string().default("XOF"),
      })
      .parse(input)
  )
  .handler(async ({ data }: { data: any }) => {
    const code = `GENIZIO-PARRAIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Décision utilisateur (2026-08-05) : le parrain paie au tarif de bienvenue (5 000 F/mois)
    // — MÊME BARÈME que la famille. Si le compte cible est hors période de bienvenue à la
    // rédemption, l'admin ajuste le montant à 15 000 F/mois lors de la confirmation du paiement
    // (confirmSponsorshipPaymentAdmin) — le code vaut months_count mois dans tous les cas.
    const monthly = data.currency === "EUR" ? PROMO_PRICE_EUR : PROMO_PRICE_XOF;
    const amountPaid = data.months * monthly;

    // Le season_id reste indicatif (saison en cours pour l'affichage admin) — l'accès réel
    // est porté par child_access_periods à la rédemption, jamais par cette valeur.
    const activeSeason = await getActiveSeason({ data: undefined });

    const { data: token, error } = await (supabaseAdmin as any)
      .from("sponsorship_tokens")
      .insert({
        code,
        sponsor_name: data.sponsorName,
        sponsor_email: data.sponsorEmail,
        sponsor_message: data.sponsorMessage || null,
        target_child_name: data.targetChildName || null,
        months_count: data.months,
        amount_paid: amountPaid,
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

    // Décision utilisateur (2026-08-05) : on ne peut rédimer un code que sur un enfant de SON
    // compte (même garde que enrollChildViaCampaignLink) — pas d'offre/réclamation croisée.
    const { data: child, error: childErr } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) {
      throw new Error("Profil enfant introuvable ou non rattaché à votre compte.");
    }

    const months = token.months_count ?? 3;

    // Décision utilisateur (2026-07-26) : le code se lie à sa saison au moment de l'ACTIVATION,
    // pas de sa génération — token.season_id n'est qu'indicatif (voir createSponsorshipToken /
    // generateCampaignTokensAdmin). Un lot de 100 codes B2B distribué sur 3 mois doit faire
    // démarrer chaque enfant sur la vraie saison en cours à SON activation, pas sur celle qui
    // était active le jour où l'admin a généré le lot.
    const activeSeason = await getActiveSeason({ data: undefined });

    if (token.campaign_id) {
      // Token B2B (lot de campagne) : comportement historique inchangé — inscription de saison
      // liée à la campagne (fenêtre fixe de cohorte), hors périmètre du modèle mensuel famille.
      // L'inscription doit réussir AVANT que le code soit marqué utilisé — dans l'ordre inverse
      // (précédemment en place), un échec de cet insert brûlait quand même le code.
      const { error: enrollErr } = await (supabaseAdmin as any).from("season_enrollments").insert({
        season_id: activeSeason.id,
        child_id: data.childId,
        user_id: userId,
        sponsor_name: token.sponsor_name,
        sponsor_email: token.sponsor_email,
        sponsor_message: token.sponsor_message,
        payment_status: "sponsored",
        campaign_id: token.campaign_id,
      });

      if (enrollErr) {
        console.error("Error creating season_enrollment on redeem:", enrollErr);
        throw new Error("Erreur lors de l'inscription. Le code n'a pas été consommé, réessayez.");
      }
    } else {
      // Parrainage individuel (2026-08-05) : le code vaut `months` mois d'accès payant — on
      // crée une child_access_periods (source sponsor) qui démarre au plus tard entre maintenant
      // et la fin de la période courante (aucune perte en cas de cumul).
      const { data: existing, error: existingErr } = await (supabaseAdmin as any)
        .from("child_access_periods")
        .select("ends_at")
        .eq("child_id", data.childId)
        .order("ends_at", { ascending: false })
        .limit(1);
      if (existingErr) throw new Error(existingErr.message);

      // Fenêtre partagée avec extendChildAccessAdmin (child-access.ts) — même logique de
      // cumul (démarre au plus tard entre maintenant et la fin courante) : un code parrain
      // posé sur une période existante la prolonge, il ne la coupe jamais.
      const { startsAt, endsAt } = computeAccessPeriodWindow(existing?.[0]?.ends_at ?? null, months);

      const { error: periodErr } = await (supabaseAdmin as any).from("child_access_periods").insert({
        child_id: data.childId,
        starts_at: startsAt,
        ends_at: endsAt,
        source: "sponsor",
        token_id: token.id,
        amount_xof: token.amount_paid,
        currency: token.currency,
        note: `Parrain : ${token.sponsor_name}`,
      });

      if (periodErr) {
        console.error("Error creating child_access_period on redeem:", periodErr);
        throw new Error("Erreur lors de l'inscription. Le code n'a pas été consommé, réessayez.");
      }
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
      // L'enfant est déjà inscrit à ce stade — ne pas jeter une erreur qui ferait croire à un
      // échec total au parent. On journalise pour intervention manuelle (marquer le code utilisé)
      // plutôt que de bloquer une inscription par ailleurs réussie.
      console.error("Error marking sponsorship token as redeemed (enrollment already created):", updateErr);
    }

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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ListSponsorshipsInput = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  paymentFilter: z.enum(["all", "confirmed", "unconfirmed"]).default("all"),
  redeemedFilter: z.enum(["all", "redeemed", "unredeemed"]).default("all"),
});

// Alimente "Historique des Parrainages Diaspora & RSE" — un parrainage individuel (page publique
// /parrainage, sans campagne). Les lots B2B (generateCampaignTokensAdmin) ont leur propre écran
// dédié par campagne (AdminCampaignsTab → ViewCampaignTokensModal, avec filtre + export CSV) :
// sans ce filtre, cette liste se noyait sous 280+ codes de campagne (99%+ du total réel en
// prod), le vrai parrainage diaspora/RSE (campaign_id NULL) ne représentant qu'une poignée de
// lignes.
//
// Pagination + recherche côté serveur (2026-07-27, décision utilisateur) : la limite de 50
// jetait silencieusement tout ce qui dépassait, sans aucun moyen de voir le reste — remplacée
// par une vraie pagination (.range) + un total exact, pour qu'au-delà de 50 lignes l'admin bascule
// entre les pages plutôt que de perdre des données invisiblement. La recherche (nom/email
// parrain, code, enfant ciblé) et les filtres (paiement confirmé, code utilisé) sont appliqués
// AVANT la pagination, pas après — sinon une recherche ne porterait que sur la page déjà chargée.
export const listSponsorshipsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ListSponsorshipsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    // Les mêmes filtres sont appliqués deux fois (comptage puis page) : PostgREST renvoie une
    // erreur 416 "Requested range not satisfiable" dès qu'on demande une page au-delà du volume
    // réel — vérifié en direct contre la base. Compter d'abord permet de borner la page demandée
    // au lieu de faire échouer l'écran (cas réel : un filtre qui réduit le résultat pendant que
    // l'admin est sur une page lointaine, ou des lignes supprimées entre deux chargements).
    const applyFilters = (q: any) => {
      const term = data.search?.trim();
      if (term) {
        // Virgules/parenthèses retirées : ce sont les séparateurs du format .or() de PostgREST,
        // les laisser passer casserait la syntaxe du filtre plutôt que de simplement rater la
        // recherche.
        const safe = term.replace(/[,()]/g, "");
        const like = `%${safe}%`;
        q = q.or(`sponsor_name.ilike.${like},sponsor_email.ilike.${like},code.ilike.${like},target_child_name.ilike.${like}`);
      }
      if (data.paymentFilter === "confirmed") q = q.eq("payment_confirmed", true);
      if (data.paymentFilter === "unconfirmed") q = q.eq("payment_confirmed", false);
      if (data.redeemedFilter === "redeemed") q = q.eq("is_redeemed", true);
      if (data.redeemedFilter === "unredeemed") q = q.eq("is_redeemed", false);
      return q;
    };

    const { count, error: countError } = await applyFilters(
      (supabaseAdmin as any).from("sponsorship_tokens").select("id", { count: "exact", head: true }).is("campaign_id", null)
    );
    if (countError) throw new Error(countError.message);

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
    const page = Math.min(data.page, totalPages);

    if (total === 0) {
      return { data: [], total: 0, page: 1, pageSize: data.pageSize, totalPages: 1 } as PaginatedResult<SponsorshipToken>;
    }

    const from = (page - 1) * data.pageSize;

    // `id` en second critère de tri : created_at N'EST PAS unique (les lots de codes sont insérés
    // en masse et partagent la même horodate à la seconde près), donc trier dessus seul laisse
    // l'ordre indéterminé entre deux requêtes. Vérifié en direct sur les 282 codes de campagne :
    // parcourir les 6 pages ne remontait que 253 lignes uniques — 29 dupliquées d'une page à
    // l'autre et 29 jamais affichées. Un tri total (clé primaire en départage) rend la pagination
    // déterministe.
    const { data: tokens, error } = await applyFilters(
      (supabaseAdmin as any).from("sponsorship_tokens").select("*").is("campaign_id", null)
    )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + data.pageSize - 1);

    if (error) throw new Error(error.message);

    return {
      data: (tokens as SponsorshipToken[]) || [],
      total,
      page,
      pageSize: data.pageSize,
      totalPages,
    } as PaginatedResult<SponsorshipToken>;
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
    const { resolveExtraSlotPrice } = await import("@/lib/pricing");
    const now = new Date();
    const windowEnd = new Date(now.getTime() + EXPIRATION_REMINDER_WINDOW_DAYS * 86_400_000);

    const results: Array<{
      childId: string;
      childName: string;
      parentPhone: string | null;
      campaignName: string | null;
      endDate: string;
      daysLeft: number;
      source: "season" | "access";
      renewalAmountXof: number;
    }> = [];

    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const userById = new Map(users.map((u) => [u.id, u]));

    // ── Source 1 : fenêtres de saison (inscriptions en cours, rolling individuel ou
    // cohorte B2B). La saison est gratuite depuis 2026-08-03 — renewalAmountXof = 0, la
    // relance WhatsApp reste générique.
    const { data: enrollments, error: enrollErr } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id, enrolled_at, campaign_id, child_profiles(name, user_id), seasons(duration_months), campaigns(name, start_date, end_date)")
      .order("enrolled_at", { ascending: false });

    if (enrollErr) throw new Error(enrollErr.message);

    // Ne garder que l'inscription la plus RÉCENTE de chaque enfant (déjà trié desc par
    // enrolled_at) — un enfant peut avoir des inscriptions historiques d'anciennes saisons qui ne
    // représentent plus sa fenêtre d'accès actuelle.
    const latestByChild = new Map<string, any>();
    for (const e of enrollments ?? []) {
      if (!latestByChild.has(e.child_id)) latestByChild.set(e.child_id, e);
    }

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
          parentPhone: userById.get(e.child_profiles?.user_id)?.user_metadata?.phone ?? null,
          campaignName: e.campaigns?.name ?? null,
          endDate: end.toISOString(),
          daysLeft,
          source: "season",
          renewalAmountXof: 0,
        });
      }
    }

    // ── Source 2 : périodes d'accès MENSUEL payant (child_access_periods, modèle 2026-08-05).
    // C'est le vrai rappel de renouvellement monétisé : montant = barème mensuel du compte
    // (5 000 promo → 15 000 standard, pricing.ts) pré-rempli dans la relance WhatsApp.
    const { data: periods, error: periodsErr } = await (supabaseAdmin as any)
      .from("child_access_periods")
      .select("child_id, ends_at, child_profiles(name, user_id)")
      .gte("ends_at", now.toISOString())
      .lte("ends_at", windowEnd.toISOString())
      .order("ends_at", { ascending: false });

    if (periodsErr) throw new Error(periodsErr.message);

    const seenChildren = new Set<string>();
    for (const p of periods ?? []) {
      if (seenChildren.has(p.child_id)) continue; // période la plus récente par enfant
      seenChildren.add(p.child_id);

      const daysLeft = Math.ceil((new Date(p.ends_at).getTime() - now.getTime()) / 86_400_000);
      const parent = userById.get(p.child_profiles?.user_id);
      const rate = resolveExtraSlotPrice(parent?.created_at ?? null, now);

      results.push({
        childId: p.child_id,
        childName: p.child_profiles?.name ?? "?",
        parentPhone: parent?.user_metadata?.phone ?? null,
        campaignName: null,
        endDate: p.ends_at,
        daysLeft,
        source: "access",
        renewalAmountXof: rate.priceXof,
      });
    }

    return results.sort((a, b) => a.daysLeft - b.daysLeft);
  });
