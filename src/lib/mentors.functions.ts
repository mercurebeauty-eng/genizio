import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { computeMentorQuota } from "./mentor-quota";
import {
  computeExpectedSessions,
  computeMentorPayoutXof,
  computeMentorPointsRewards,
  computeMentorScore,
  computeMentorStatusFromScore,
  computeTrustTier,
} from "./mentor-score";
import {
  CONFIRMED_SESSION_STATUSES,
  computeRollingScore,
  creditMentorPoints,
  getMentorPointsBalance,
  syncMentorTrustStatus,
} from "./mentor-trust";
import { notifyUser } from "./app-notifications";
import { MENTOR_SESSION_PAYOUT_XOF, PACK_SESSIONS } from "@/lib/pricing";
import { resolveChildAccompaniment } from "@/lib/child-accompaniment";
import { isLastPayableSession } from "@/lib/mentor-operator";

// ────────────────────────────────────────────────────────────
// Mentors — Fonctions serveur
// Un mentor peut consulter les profils de plusieurs enfants.
// Seul l'admin peut assigner des mentors.
// ────────────────────────────────────────────────────────────

// Seul l'admin peut assigner des mentors.

export interface MentorAssignmentDetail {
  id: string;
  child_profile_id: string;
  child_name: string;
  child_age: number | null;
  campaign_id: string | null;
  campaign_name: string | null;
  created_at: string;
}

export interface MentorGroup {
  mentor_user_id: string;
  email: string;
  totalChildren: number;
  /** Quota effectif (plancher + extra, borné 5) — même calcul que check_mentor_quota. */
  quota: number;
  /** Score de fiabilité /100 (V2) — 50% séances + 25% feedback famille + 25% progression (mentor-score.ts). */
  score: number;
  /** Statut du compte mentor (mentor_profiles) — active|warning|suspended|banned. */
  status: string;
  /** Solde de points (mentor_points) — source des paliers de récompense. */
  points: number;
  /** Palier de confiance (score ≥ 75 sur 30 j glissants) — 75/25 du payout pour « trusted ». */
  tier: "standard" | "trusted";
  /** Badge de récompense selon le solde de points (none | bronze | gold). */
  badge: "none" | "bronze" | "gold";
  /** Bonus payout (%) selon le solde de points (0 | 5 | 10). */
  pointsBonusPct: number;
  /** Payout DÛ (Vague C, ledger admin) : somme des payout_xof des séances approuvées non encore payées. */
  duePayoutXof: number;
  /** Nombre de séances approuvées en attente de paiement (ledger admin). */
  approvedSessions: number;
  children: MentorAssignmentDetail[];
}

export interface PaginatedMentors {
  data: MentorGroup[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Liste admin des mentors (refonte 2026-08-14) : GROUPÉE par mentor et
// PAGINÉE — l'ancienne liste plate chargeait toute la table `mentors` (une ligne par
// assignation enfant) dans un <ul> sans recherche ni filtre, inutilisable dès que le
// volume grossit. Résolution des emails CIBLÉE : getUserById en parallèle sur les ids
// distincts uniquement (même fix que getNgoDashboardData) — fini listAllUsers qui pagine
// tout l'annuaire à chaque visite. Filtres : campagne (sur campaign_id de l'assignation)
// et recherche par email.
const ListMentorsInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().max(80).optional(),
  campaignId: z.string().uuid().optional(),
});

export const listMentorsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ListMentorsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pagination SQL par MENTOR (Vague 4) : on ne ramène plus TOUTES les assignations
    // (ni tous les mentors) avant de paginer en mémoire. D'abord la liste ordonnée des
    // mentors (une colonne, indexée) → on tronque à la page → on n'enrichit que la page.
    const { data: idRows, error: idsErr } = await (supabaseAdmin as any)
      .from("mentors")
      .select("mentor_user_id")
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (idsErr) throw new Error(idsErr.message);

    // Ordre = assignation la plus récente (première occurrence), doublons retirés.
    const allMentorIds: string[] = [];
    for (const r of idRows ?? []) {
      if (!allMentorIds.includes(r.mentor_user_id as string)) allMentorIds.push(r.mentor_user_id);
    }
    if (allMentorIds.length === 0) {
      return { data: [], total: 0, page: data.page, pageSize: data.pageSize, totalPages: 1 };
    }

    // Filtre campagne : seuls les mentors ayant une assignation active sur cette campagne.
    let baseMentorIds = allMentorIds;
    if (data.campaignId) {
      const { data: campaignRows } = await (supabaseAdmin as any)
        .from("mentors")
        .select("mentor_user_id")
        .eq("campaign_id", data.campaignId)
        .is("removed_at", null);
      const campaignSet = new Set(
        (campaignRows ?? []).map((r: any) => r.mentor_user_id as string),
      );
      baseMentorIds = allMentorIds.filter((id) => campaignSet.has(id));
    }

    // Recherche par email en SQL (parent_profiles) — appliquée AVANT la pagination,
    // comme l'ancien filtre en mémoire (qui, lui, exigeait de tout charger).
    const term = data.search?.trim().toLowerCase();
    let filteredMentorIds = baseMentorIds;
    if (term) {
      const { data: matches } = await supabaseAdmin
        .from("parent_profiles")
        .select("user_id")
        .in("user_id", baseMentorIds)
        .ilike("email", `%${term}%`);
      const matchSet = new Set((matches ?? []).map((m) => m.user_id));
      filteredMentorIds = baseMentorIds.filter((id) => matchSet.has(id));
    }

    const total = filteredMentorIds.length;
    const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
    const page = Math.min(data.page, totalPages);
    const pageMentorIds = filteredMentorIds.slice((page - 1) * data.pageSize, page * data.pageSize);

    // Assignations des mentors DE LA PAGE uniquement, groupées par mentor.
    let query = (supabaseAdmin as any)
      .from("mentors")
      .select(
        "id, mentor_user_id, child_profile_id, campaign_id, created_at, child_profiles(name, age), campaigns(name, created_at, extra_mentors_quota)",
      )
      // Soft-retire (V1) : un mentor retiré disparaît des flux actifs (liste admin,
      // assignation, quota) — son historique (séances, score) reste en base.
      .is("removed_at", null)
      .in("mentor_user_id", pageMentorIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (data.campaignId) {
      query = query.eq("campaign_id", data.campaignId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Groupement en mémoire par mentor — volume borné : les mentors de la page × leurs
    // assignations (le nombre de lignes n'explose plus avec le total des enfants).
    const groups = new Map<string, MentorGroup>();
    const campaignRefs = new Map<string, { createdAt: string | null; extraQuota: number }>();
    for (const row of rows ?? []) {
      const existing = groups.get(row.mentor_user_id);
      const detail: MentorAssignmentDetail = {
        id: row.id,
        child_profile_id: row.child_profile_id,
        child_name: (row.child_profiles as any)?.name ?? "Enfant",
        child_age: (row.child_profiles as any)?.age ?? null,
        campaign_id: row.campaign_id ?? null,
        campaign_name: (row.campaigns as any)?.name ?? null,
        created_at: row.created_at as string,
      };
      if (row.campaign_id && row.campaigns) {
        campaignRefs.set(row.campaign_id, {
          createdAt: (row.campaigns as any).created_at as string | null,
          extraQuota: (row.campaigns as any).extra_mentors_quota as number,
        });
      }
      if (existing) {
        existing.children.push(detail);
        existing.totalChildren += 1;
      } else {
        groups.set(row.mentor_user_id, {
          mentor_user_id: row.mentor_user_id,
          email: "…",
          totalChildren: 1,
          quota: 5,
          score: 0,
          status: "active",
          points: 0,
          tier: "standard",
          badge: "none",
          pointsBonusPct: 0,
          duePayoutXof: 0,
          approvedSessions: 0,
          children: [detail],
        });
      }
    }

    if (groups.size === 0) {
      return { data: [], total, page, pageSize: data.pageSize, totalPages };
    }

    // Résolution ciblée des emails (et date de création, pour le quota hors campagne) :
    // uniquement les mentors réellement présents, en parallèle.
    const mentorIds = [...groups.keys()];
    const emailMap = new Map<string, { email: string; createdAt: string | null }>();
    const resolved = await Promise.all(
      mentorIds.map(async (id: string) => {
        const { data: u } = await (supabaseAdmin as any).auth.admin
          .getUserById(id)
          .catch(() => ({ data: null }));
        return [
          id,
          {
            email: (u?.user?.email as string) ?? "Inconnu",
            createdAt: (u?.user?.created_at as string | null) ?? null,
          },
        ] as const;
      }),
    );
    for (const [id, info] of resolved) emailMap.set(id, info);

    // Score de fiabilité (V1) — chargement groupé une fois pour tous les mentors de
    // la page : statut (mentor_profiles), séances CONFIRMÉES ce mois (mentor_sessions)
    // et défis de leurs enfants (progression). Même fenêtre « mois courant » des deux
    // côtés. Depuis la V3 (Confiance Mentor), la déclaration seule ne suffit plus :
    // seules les séances confirmées par le parent alimentent le score.
    const { data: profiles } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("mentor_user_id, status")
      .in("mentor_user_id", mentorIds);
    const statusMap = new Map<string, string>(
      (profiles ?? []).map((p: any) => [p.mentor_user_id as string, p.status as string]),
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: sessions } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, mentor_user_id")
      .in("mentor_user_id", mentorIds)
      .in("status", CONFIRMED_SESSION_STATUSES)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);
    const sessionsByMentor = new Map<string, number>();
    const sessionMentor = new Map<string, string>();
    for (const s of sessions ?? []) {
      sessionsByMentor.set(
        s.mentor_user_id,
        (sessionsByMentor.get(s.mentor_user_id) ?? 0) + 1,
      );
      sessionMentor.set(s.id as string, s.mentor_user_id as string);
    }

    // Feedback famille (Vague C, V2) : moyenne des notes posées sur les séances DU MOIS des
    // mentors de la page — alimente la composante 25% du score. Sans note, le score est
    // renormalisé (mentor-score.ts).
    const ratingsByMentor = new Map<string, { sum: number; count: number }>();
    const sessionIds = [...sessionMentor.keys()];
    if (sessionIds.length > 0) {
      const { data: feedback } = await (supabaseAdmin as any)
        .from("mentor_feedback")
        .select("mentor_session_id, rating")
        .in("mentor_session_id", sessionIds);
      for (const f of feedback ?? []) {
        const supId = sessionMentor.get(f.mentor_session_id as string);
        if (!supId) continue;
        const cur = ratingsByMentor.get(supId) ?? { sum: 0, count: 0 };
        cur.sum += Number(f.rating);
        cur.count += 1;
        ratingsByMentor.set(supId, cur);
      }
    }

    // Confiance Mentor (V3) — score de CONFIANCE sur fenêtre glissante 30 jours (le
    // statut ne doit pas repartir de zéro à chaque début de mois) : séances confirmées
    // des 30 derniers jours + feedback associé. Le score affiché reste mensuel, le
    // statut automatique se calcule sur cette fenêtre.
    const rollingStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rollingSessions } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, mentor_user_id")
      .in("mentor_user_id", mentorIds)
      .in("status", CONFIRMED_SESSION_STATUSES)
      .gte("occurred_at", rollingStart);
    const rollingCountByMentor = new Map<string, number>();
    const rollingSessionMentor = new Map<string, string>();
    for (const s of rollingSessions ?? []) {
      rollingCountByMentor.set(
        s.mentor_user_id,
        (rollingCountByMentor.get(s.mentor_user_id) ?? 0) + 1,
      );
      rollingSessionMentor.set(s.id as string, s.mentor_user_id as string);
    }
    const rollingRatingsByMentor = new Map<string, { sum: number; count: number }>();
    const rollingSessionIds = [...rollingSessionMentor.keys()];
    if (rollingSessionIds.length > 0) {
      const { data: feedback } = await (supabaseAdmin as any)
        .from("mentor_feedback")
        .select("mentor_session_id, rating")
        .in("mentor_session_id", rollingSessionIds);
      for (const f of feedback ?? []) {
        const supId = rollingSessionMentor.get(f.mentor_session_id as string);
        if (!supId) continue;
        const cur = rollingRatingsByMentor.get(supId) ?? { sum: 0, count: 0 };
        cur.sum += Number(f.rating);
        cur.count += 1;
        rollingRatingsByMentor.set(supId, cur);
      }
    }

    // Solde de points (mentor_points) — pour l'affichage admin des paliers.
    const { data: pointsRows } = await (supabaseAdmin as any)
      .from("mentor_points")
      .select("mentor_user_id, points")
      .in("mentor_user_id", mentorIds);
    const pointsByMentor = new Map<string, number>();
    for (const p of pointsRows ?? []) {
      pointsByMentor.set(
        p.mentor_user_id,
        (pointsByMentor.get(p.mentor_user_id) ?? 0) + Number(p.points),
      );
    }

    // Ledger payout (Vague C) : séances APPROUVÉES non encore payées → « Payout dû ».
    const { data: approved } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("mentor_user_id, payout_xof")
      .in("mentor_user_id", mentorIds)
      .eq("status", "approved");
    const approvedByMentor = new Map<string, { xof: number; count: number }>();
    for (const a of approved ?? []) {
      const cur = approvedByMentor.get(a.mentor_user_id) ?? { xof: 0, count: 0 };
      cur.xof += Number(a.payout_xof ?? 0);
      cur.count += 1;
      approvedByMentor.set(a.mentor_user_id, cur);
    }

    const childIdsOfPage = [...groups.values()].flatMap((g) =>
      g.children.map((c) => c.child_profile_id),
    );
    const { data: challenges } = await (supabaseAdmin as any)
      .from("challenges")
      .select("child_id, status")
      .in("child_id", childIdsOfPage)
      .is("deleted_at", null);
    const childByMentor = new Map<string, Set<string>>();
    for (const g of groups.values()) {
      childByMentor.set(
        g.mentor_user_id,
        new Set(g.children.map((c) => c.child_profile_id)),
      );
    }
    const completedByMentor = new Map<string, number>();
    const totalByMentor = new Map<string, number>();
    for (const c of challenges ?? []) {
      for (const [supId, childSet] of childByMentor) {
        if (!childSet.has(c.child_id)) continue;
        totalByMentor.set(supId, (totalByMentor.get(supId) ?? 0) + 1);
        if (c.status === "completed") {
          completedByMentor.set(supId, (completedByMentor.get(supId) ?? 0) + 1);
        }
      }
    }

    // Fraction du mois écoulé : au premier jour le score serait à 0 sans déclaration —
    // on proratise l'attendu (12 séances/mois/enfant) sur les jours écoulés.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = Math.max(1, now.getDate());

    const rollingScoreByMentor = new Map<string, number>();

    const list = [...groups.values()].map((g) => {
      const email = emailMap.get(g.mentor_user_id)?.email ?? "Inconnu";
      g.email = email;
      // Quota effectif : le plus élevé des contextes de ses assignations — plancher
      // grand-péré (référence = campagne si assigné via campagne, sinon date du compte)
      // + extra_mentors_quota de la campagne, borné 5 (même calcul que le trigger
      // check_mentor_quota et computeMentorQuota).
      const { createdAt } = emailMap.get(g.mentor_user_id) ?? { createdAt: null };
      let quota = 0;
      for (const child of g.children) {
        const ctx = child.campaign_id ? campaignRefs.get(child.campaign_id) : undefined;
        const ref = ctx ? ctx.createdAt : createdAt;
        const extra = ctx?.extraQuota ?? 0;
        quota = Math.max(
          quota,
          computeMentorQuota({ referenceCreatedAt: ref, extraQuota: extra }),
        );
      }
      g.quota = quota;
      g.status = statusMap.get(g.mentor_user_id) ?? "active";
      const fb = ratingsByMentor.get(g.mentor_user_id);
      g.score = computeMentorScore({
        expectedSessions: computeExpectedSessions(g.totalChildren, daysInMonth, elapsedDays),
        declaredSessions: sessionsByMentor.get(g.mentor_user_id) ?? 0,
        completedChallenges: completedByMentor.get(g.mentor_user_id) ?? 0,
        totalChallenges: totalByMentor.get(g.mentor_user_id) ?? 0,
        avgFeedback: fb && fb.count > 0 ? fb.sum / fb.count : 0,
      });
      // Confiance Mentor (V3) : solde de points + palier de confiance (30 j
      // glissants) — le payout des prochaines déclarations et le statut
      // automatique en dépendent.
      g.points = pointsByMentor.get(g.mentor_user_id) ?? 0;
      const rewards = computeMentorPointsRewards(g.points);
      g.pointsBonusPct = rewards.payoutBonusPct;
      g.badge = rewards.badge;
      const rfb = rollingRatingsByMentor.get(g.mentor_user_id);
      const rollingScore = computeMentorScore({
        expectedSessions: computeExpectedSessions(g.totalChildren, 30, 30),
        declaredSessions: rollingCountByMentor.get(g.mentor_user_id) ?? 0,
        completedChallenges: completedByMentor.get(g.mentor_user_id) ?? 0,
        totalChallenges: totalByMentor.get(g.mentor_user_id) ?? 0,
        avgFeedback: rfb && rfb.count > 0 ? rfb.sum / rfb.count : 0,
      });
      g.tier = computeTrustTier(rollingScore);
      rollingScoreByMentor.set(g.mentor_user_id, rollingScore);
      const due = approvedByMentor.get(g.mentor_user_id);
      g.duePayoutXof = due?.xof ?? 0;
      g.approvedSessions = due?.count ?? 0;
      return g;
    });

    // Statut automatique (2 sens) : si le score de confiance a franchi un seuil, on
    // bascule — jamais sur « banned » (décision humaine). L'admin voit le nouveau
    // statut immédiatement, sans attendre le prochain calcul.
    for (const g of list) {
      if (g.status === "banned") continue;
      const target = computeMentorStatusFromScore(rollingScoreByMentor.get(g.mentor_user_id) ?? 0);
      if (target === g.status) continue;
      await (supabaseAdmin as any)
        .from("mentor_profiles")
        .update({ status: target })
        .eq("mentor_user_id", g.mentor_user_id);
      void notifyUser({
        userId: g.mentor_user_id,
        type: "mentor_status_changed",
        payload: { from: g.status, to: target, score: rollingScoreByMentor.get(g.mentor_user_id) },
        channels: { push: true, email: true },
      });
      g.status = target;
    }

    // Recherche (email) et pagination déjà appliquées en amont — la liste ne contient
    // que les mentors de la page demandée.
    return {
      data: list,
      total,
      page,
      pageSize: data.pageSize,
      totalPages,
    } as PaginatedMentors;
  });

// Liste légère des campagnes (id + nom) pour le filtre et la modale d'assignation
// « à une campagne » de l'Admin OS — pas le full listCampaignsAdmin (lourd, paginé,
// résout les emails des gestionnaires) dont on n'a besoin que d'identifiants ici.
export const listCampaignsLightAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string }[];
  });

// Point d'insertion unique pour les deux chemins d'assignation (admin manuel ici, et B2B dans
// campaigns.functions.ts) — décision utilisateur (2026-07-26) : "un seul mentor par
// enfant" est une règle du SYSTÈME, pas d'un chemin en particulier. Avant, seul le chemin B2B
// filtrait les enfants déjà supervisés (côté application, pas garanti), et le chemin admin
// n'appliquait rien du tout. Centraliser l'insertion ici évite qu'un futur 3e chemin
// (import en masse, transfert...) oublie la même garde-fou. La contrainte UNIQUE
// (child_profile_id) posée en base (migration 20260726140000) fait foi dans tous les cas ;
// ceci ne fait que donner un message d'erreur clair au lieu d'un code Postgres brut.
export async function insertMentorAssignments(
  supabaseAdmin: any,
  params: {
    mentorUserId: string;
    childProfileIds: string[];
    campaignId: string | null;
    assignedBy: string | null;
  },
) {
  if (params.childProfileIds.length === 0) return [];

  // Statut du compte mentor (V1) : un mentor suspendu ou banni ne reçoit plus
  // d'assignation — le ban est structurel, pas une décision après coup.
  const { data: profile } = await (supabaseAdmin as any)
    .from("mentor_profiles")
    .select("status")
    .eq("mentor_user_id", params.mentorUserId)
    .maybeSingle();
  const status = (profile?.status as string | undefined) ?? "active";
  if (status === "suspended" || status === "banned") {
    throw new Error(
      status === "banned"
        ? "Ce mentor est banni — restaurez-le avant de l'assigner."
        : "Ce mentor est suspendu — restaurez-le avant de l'assigner.",
    );
  }

  const rows = params.childProfileIds.map((childId) => ({
    mentor_user_id: params.mentorUserId,
    child_profile_id: childId,
    campaign_id: params.campaignId,
    assigned_by: params.assignedBy,
  }));
  const { data, error } = await supabaseAdmin.from("mentors").insert(rows).select("*");
  if (error) {
    if (error.code === "23505")
      throw new Error("Un ou plusieurs de ces enfants ont déjà un mentor assigné.");
    throw new Error(error.message);
  }
  return data ?? [];
}

// ────────────────────────────────────────────────────────────
// Recherche & assignation relationnelle (Vague 3 multicouche) — spec §2-3, §22-23 :
//   « Parent → Enfant → Mentor », jamais une liste plate de milliers d'enfants.
//   L'annuaire requêtable est parent_profiles (Vague 1) — fini les scans complets
//   de auth.users (listAllUsers) pour résoudre un email ou un téléphone.
// ────────────────────────────────────────────────────────────

const SearchAccountInput = z.object({
  query: z.string().trim().min(1, "Saisissez un email, un téléphone ou un nom."),
});

export interface ParentSearchResult {
  user_id: string;
  email: string;
  phone: string | null;
  display_name: string | null;
  /** Nombre d'enfants du compte — affiché dès l'étape 1 (spec §2). */
  child_count: number;
}

// Recherche d'un compte parent par email / téléphone / nom (SQL indexé, bornée 20).
export const searchParentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => SearchAccountInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Caractères sensibles à la syntaxe .or() de PostgREST — retirés pour que la
    // recherche reste un simple filtre de texte (jamais une injection de filtre).
    const q = data.query.trim().replace(/[%,]/g, " ");
    const { data: rows, error } = await supabaseAdmin
      .from("parent_profiles")
      .select("user_id, email, phone, display_name")
      .or(`email.ilike.%${q}%,display_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20);
    if (error) throw new Error(error.message);
    const parents = rows ?? [];

    // Enfants par parent — une requête groupée en mémoire, bornée par les 20 parents
    // retournés et par le cap « 50 enfants par compte » (décision #75).
    const childCountByParent = new Map<string, number>();
    if (parents.length > 0) {
      const { data: children } = await supabaseAdmin
        .from("child_profiles")
        .select("user_id")
        .in("user_id", parents.map((p) => p.user_id));
      for (const c of children ?? []) {
        childCountByParent.set(c.user_id, (childCountByParent.get(c.user_id) ?? 0) + 1);
      }
    }

    return parents.map((p) => ({
      user_id: p.user_id,
      email: p.email,
      phone: p.phone,
      display_name: p.display_name,
      child_count: childCountByParent.get(p.user_id) ?? 0,
    }));
  });

export interface ChildOfParentResult {
  id: string;
  name: string;
  age: number | null;
  avatar_color: string;
  is_active: boolean;
  /** Email du mentor actif assigné, ou null — l'enfant accompagné reste visible mais non sélectionnable. */
  current_mentor_email: string | null;
}

// Enfants d'un parent avec leur mentor actuel (borné 50 = cap quota, décision #75).
export const getChildrenOfParentAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ parentId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: children, error } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age, avatar_color, is_active")
      .eq("user_id", data.parentId)
      .order("name")
      .limit(50);
    if (error) throw new Error(error.message);

    const childIds = (children ?? []).map((c) => c.id);
    const mentorEmailByChild = new Map<string, string | null>();
    if (childIds.length > 0) {
      const { data: assignments } = await supabaseAdmin
        .from("mentors")
        .select("child_profile_id, mentor_user_id")
        .in("child_profile_id", childIds)
        .is("removed_at", null);
      const mentorIds = [...new Set((assignments ?? []).map((a) => a.mentor_user_id as string))];
      const emailByMentor = new Map<string, string>();
      if (mentorIds.length > 0) {
        const { data: mentors } = await supabaseAdmin
          .from("parent_profiles")
          .select("user_id, email")
          .in("user_id", mentorIds);
        for (const m of mentors ?? []) emailByMentor.set(m.user_id, m.email);
      }
      for (const a of assignments ?? []) {
        mentorEmailByChild.set(a.child_profile_id, emailByMentor.get(a.mentor_user_id) ?? null);
      }
    }

    return (children ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      avatar_color: c.avatar_color,
      is_active: c.is_active,
      current_mentor_email: mentorEmailByChild.get(c.id) ?? null,
    }));
  });

export interface MentorSearchResult {
  user_id: string;
  email: string;
  phone: string | null;
  display_name: string | null;
  /** Statut de confiance (mentor_profiles) — sans ligne = actif (convention du repo). */
  status: string;
  /** Nombre d'assignations actives (removed_at IS NULL). */
  active_assignments: number;
}

// Recherche d'un mentor (n'importe quel compte Génizio) par email/téléphone/nom —
// enrichie du statut de confiance et du nombre d'assignations actives.
export const searchMentorsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => SearchAccountInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.trim().replace(/[%,]/g, " ");
    const { data: rows, error } = await supabaseAdmin
      .from("parent_profiles")
      .select("user_id, email, phone, display_name")
      .or(`email.ilike.%${q}%,display_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20);
    if (error) throw new Error(error.message);
    const users = rows ?? [];

    // Statut de confiance + assignations actives — une requête groupée chacun
    // (borné par les 20 résultats et le quota 5 par mentor).
    const statusByUser = new Map<string, string>();
    const activeCountByUser = new Map<string, number>();
    if (users.length > 0) {
      const userIds = users.map((u) => u.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("mentor_profiles")
        .select("mentor_user_id, status")
        .in("mentor_user_id", userIds);
      for (const p of profiles ?? []) statusByUser.set(p.mentor_user_id, p.status);

      const { data: assignments } = await supabaseAdmin
        .from("mentors")
        .select("mentor_user_id")
        .in("mentor_user_id", userIds)
        .is("removed_at", null);
      for (const a of assignments ?? []) {
        activeCountByUser.set(
          a.mentor_user_id,
          (activeCountByUser.get(a.mentor_user_id) ?? 0) + 1,
        );
      }
    }

    return users.map((u) => ({
      user_id: u.user_id,
      email: u.email,
      phone: u.phone,
      display_name: u.display_name,
      status: statusByUser.get(u.user_id) ?? "active",
      active_assignments: activeCountByUser.get(u.user_id) ?? 0,
    }));
  });

const AssignMentorToChildInput = z.object({
  parentId: z.string().uuid("ID parent invalide"),
  childId: z.string().uuid("ID enfant invalide"),
  mentorId: z.string().uuid("ID mentor invalide"),
});

// Assignation relationnelle (spec §2-3) : vérifie que l'enfant appartient bien au
// parent sélectionné, puis insère via le choke-point unique insertMentorAssignments
// (statut banni/suspendu, contrainte UNIQUE partielle, trigger quota — autorités finales).
export const assignMentorToChildAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AssignMentorToChildInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: child } = await supabaseAdmin
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", data.parentId)
      .maybeSingle();
    if (!child) {
      throw new Error("Cet enfant n'appartient pas au parent sélectionné.");
    }

    // Même logique que l'assignation historique : si l'enfant est inscrit à une
    // campagne, l'assignation porte la référence (budget séances de la campagne).
    const { data: enrollment } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("campaign_id")
      .eq("child_id", data.childId)
      .not("campaign_id", "is", null)
      .order("enrolled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rows = await insertMentorAssignments(supabaseAdmin, {
      mentorUserId: data.mentorId,
      childProfileIds: [data.childId],
      campaignId: enrollment?.campaign_id ?? null,
      assignedBy: (context as any).claims?.sub ?? null,
    });
    return rows[0];
  });

// Assignation DIRECTE à une campagne (refonte 2026-08-14) — miroir admin du
// self-service ONG assignCampaignMentor (campaigns.functions.ts) : l'admin Génizio
// choisit une campagne + un mentor + un nombre d'enfants, le système pioche
// automatiquement dans la cohorte de la campagne parmi les enfants qui n'ont encore
// aucun mentor. Point d'insertion unique conservé (insertMentorAssignments) :
// la contrainte UNIQUE(child_profile_id) et le trigger de quota restent les autorités.
// requireAdmin au lieu de requireSupabaseAuth + ownership manager : l'admin peut assigner
// sur n'importe quelle campagne, pas seulement celles dont il est gestionnaire.
const AssignMentorToCampaignInput = z.object({
  campaignId: z.string().uuid(),
  mentorEmail: z.string().email(),
  count: z.number().int().min(1).max(5).default(5),
});

export const assignMentorToCampaignAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AssignMentorToCampaignInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Campagne introuvable.");
    // Garde d'archivage (2026-08-13) : une campagne fermée n'accepte plus d'assignations.
    if (campaign.status === "archived") {
      throw new Error("Campagne archivée — restaurez-la avant d'assigner des mentors.");
    }

    // Résolution du mentor par email via parent_profiles (Vague 1) — fini le scan
    // complet de l'annuaire auth (listAllUsers) pour un seul compte.
    const { data: mentor } = await supabaseAdmin
      .from("parent_profiles")
      .select("user_id")
      .eq("email", data.mentorEmail)
      .maybeSingle();
    if (!mentor) {
      throw new Error(`Aucun compte trouvé pour l'email: ${data.mentorEmail}`);
    }

    const { data: enrollments } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("child_id")
      .eq("campaign_id", data.campaignId);
    const cohortChildIds: string[] = [
      ...new Set<string>((enrollments ?? []).map((e: any) => e.child_id as string)),
    ];
    if (cohortChildIds.length === 0) {
      throw new Error("Aucun enfant inscrit dans cette campagne pour l'instant.");
    }

    const { data: existingSup } = await (supabaseAdmin as any)
      .from("mentors")
      .select("child_profile_id")
      .in("child_profile_id", cohortChildIds);
    const alreadyMentored = new Set(
      (existingSup ?? []).map((s: any) => s.child_profile_id as string),
    );
    const unmentoredChildIds = cohortChildIds.filter((id) => !alreadyMentored.has(id));

    if (unmentoredChildIds.length === 0) {
      throw new Error("Tous les enfants de cette campagne ont déjà un mentor.");
    }

    // Pré-check informatif seulement — le trigger DB check_mentor_quota (migration
    // 20260726120000) fait foi, comme sur le chemin ONG. Ne compte que les assignations
    // ACTIVES (soft-retire V1) : un mentor retiré libère sa place.
    const { data: existingAssignments } = await (supabaseAdmin as any)
      .from("mentors")
      .select("id")
      .eq("mentor_user_id", mentor.user_id)
      .is("removed_at", null);
    const currentCount = existingAssignments?.length ?? 0;
    const quota = computeMentorQuota({
      referenceCreatedAt: campaign.created_at,
      extraQuota: campaign.extra_mentors_quota,
    });
    const slotsLeft = Math.max(0, quota - currentCount);
    const toAssign = Math.min(data.count, slotsLeft, unmentoredChildIds.length);

    if (toAssign === 0) {
      throw new Error(
        `Le mentor ${data.mentorEmail} a atteint sa limite de ${quota} enfants. Contactez le support pour augmenter son quota.`,
      );
    }

    // Insertion centralisée — même point de passage que le chemin admin manuel.
    await insertMentorAssignments(supabaseAdmin, {
      mentorUserId: mentor.user_id,
      childProfileIds: unmentoredChildIds.slice(0, toAssign),
      campaignId: data.campaignId,
      assignedBy: (context as any).claims?.sub ?? null,
    });

    return { success: true, assignedCount: toAssign };
  });

// ── Système de confiance (V1, décision « score auto ») ─────────────────────────
// Le mentor déclare ses séances en app (date + compte-rendu) ; le score de
// fiabilité se calcule tout seul (mentor-score.ts). La déclaration est la preuve
// qui alimentera la facturation (mentor_payout, V2) — d'où la rigueur : la séance
// doit concerner un enfant assigné ACTIF, et le mentor ne doit pas être suspendu/banni.

const DeclareSessionInput = z.object({
  childProfileId: z.string().uuid(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const declareSessionMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => DeclareSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    // Statut du mentor : un suspendu/banni ne peut pas déclarer de séance.
    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    const status = (profile?.status as string | undefined) ?? "active";
    if (status === "suspended" || status === "banned") {
      throw new Error(
        status === "banned"
          ? "Votre compte mentor est banni — contactez l'équipe Génizio."
          : "Votre compte mentor est suspendu — contactez l'équipe Génizio.",
      );
    }

    // La séance doit concerner un enfant assigné à CE mentor, encore actif.
    const { data: assignment } = await (supabaseAdmin as any)
      .from("mentors")
      .select("id, campaign_id")
      .eq("mentor_user_id", userId)
      .eq("child_profile_id", data.childProfileId)
      .is("removed_at", null)
      .maybeSingle();
    if (!assignment) {
      throw new Error("Cet enfant n'est pas (plus) assigné à votre suivi.");
    }

    // Vague C — financement de la séance (décision utilisateur « débit au fil des séances ») :
    //   1. Pack Accompagnement actif de l'enfant avec séances restantes → débit atomique
    //      (sessions_used+1, garde `sessions_used < sessions` en base) ;
    //   2. Sinon campagne active de l'enfant avec compteur restant → débit atomique du
    //      compartiment SÉANCES (campaigns.sessions_used+1, garde `sessions_used <
    //      sessions_target`) ;
    //   3. Sinon séance « none » (déclarée quand même — le fondateur voit le funding dans
    //      le ledger et décide). Le payout (3 500 F) s'accumule dans tous les cas, le statut
    //      declared → approved → paid est validé par l'admin (ledger).
    let funding: "pack" | "campaign" | "none" = "none";
    let campaignId: string | null = null;

    const nowIso = new Date().toISOString();
    const { data: pack } = await (supabaseAdmin as any)
      .from("family_coverages")
      .select("id, sessions_used, sessions")
      .eq("child_id", data.childProfileId)
      .eq("source", "accompaniment_pack")
      .eq("status", "active")
      .gt("ends_at", nowIso)
      .maybeSingle();
    if (pack && (pack.sessions_used ?? 0) < (pack.sessions ?? 0)) {
      const { data: claimed } = await (supabaseAdmin as any)
        .from("family_coverages")
        .update({ sessions_used: (pack.sessions_used ?? 0) + 1 })
        .eq("id", pack.id)
        .lt("sessions_used", pack.sessions)
        .select("id")
        .maybeSingle();
      if (claimed) funding = "pack";
    }

    if (funding === "none") {
      const { data: enrollment } = await (supabaseAdmin as any)
        .from("season_enrollments")
        .select("campaign_id, campaigns(id, sessions_target, sessions_used, start_date, end_date)")
        .eq("child_id", data.childProfileId)
        .not("campaign_id", "is", null)
        .order("enrolled_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const c = enrollment?.campaigns as {
        id: string;
        sessions_target: number;
        sessions_used: number;
        start_date: string | null;
        end_date: string | null;
      } | null;
      const inWindow =
        c?.start_date &&
        c.end_date &&
        new Date(c.start_date).getTime() <= Date.now() &&
        Date.now() <= new Date(c.end_date).getTime();
      if (c && inWindow && (c.sessions_used ?? 0) < (c.sessions_target ?? 0)) {
        const { data: claimed } = await (supabaseAdmin as any)
          .from("campaigns")
          .update({ sessions_used: (c.sessions_used ?? 0) + 1 })
          .eq("id", c.id)
          .lt("sessions_used", c.sessions_target)
          .select("id")
          .maybeSingle();
        if (claimed) {
          funding = "campaign";
          campaignId = c.id;
        }
      }
    }

    // Confiance Mentor (V3) — montant du payout SNAPSHOT à la déclaration :
    //   • palier de confiance (score ≥ 75 sur 30 j glissants) → 75 % de la séance
    //     (3 750 F) au lieu de 70 % (3 500 F) ;
    //   • bonus points (solde mentor_points) → +5 % à 30 pts, +10 % à 60 pts.
    // Invariant conservé : le montant posé ici ne change jamais après coup.
    const [rollingScore, pointsBalance] = await Promise.all([
      computeRollingScore(supabaseAdmin as any, userId),
      getMentorPointsBalance(supabaseAdmin as any, userId),
    ]);
    const tier = computeTrustTier(rollingScore);
    const payoutXof = computeMentorPayoutXof({
      basePayoutXof: MENTOR_SESSION_PAYOUT_XOF,
      tier,
      pointsBonusPct: computeMentorPointsRewards(pointsBalance).payoutBonusPct,
    });

    const { error } = await (supabaseAdmin as any).from("mentor_sessions").insert({
      mentor_user_id: userId,
      child_profile_id: data.childProfileId,
      occurred_at: data.occurredAt ?? nowIso,
      notes: data.notes ?? null,
      campaign_id: campaignId,
      funding,
      payout_xof: payoutXof,
      status: "declared",
    });
    if (error) throw new Error(`Erreur lors de la déclaration: ${error.message}`);

    // La déclaration seule ne suffit plus : le PARENT doit confirmer la séance pour
    // qu'elle compte (score + points + payout). Notification in-app immédiate.
    const { data: childOwner } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("user_id")
      .eq("id", data.childProfileId)
      .maybeSingle();
    if (childOwner?.user_id) {
      void notifyUser({
        userId: childOwner.user_id,
        type: "mentor_session_to_validate",
        childId: data.childProfileId,
        payload: { occurred_at: data.occurredAt ?? nowIso },
        channels: { push: true, email: true },
      });
    }
    // Le statut de confiance est recalculé après chaque déclaration (non-fatal).
    void syncMentorTrustStatus(supabaseAdmin as any, userId);

    return { success: true, funding, payoutXof };
  });

export const listMentorSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data, error } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, child_profile_id, occurred_at, notes, created_at, child_profiles(name)")
      .eq("mentor_user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return (data ?? []).map((s: any) => ({
      id: s.id,
      child_profile_id: s.child_profile_id,
      child_name: (s.child_profiles as any)?.name ?? "Enfant",
      occurred_at: s.occurred_at as string,
      notes: s.notes as string | null,
    }));
  });

// ── Validation parent (V3, Confiance Mentor) ─────────────────────────────────
// La déclaration du mentor ne suffit plus : le parent confirme la séance
// (declared → confirmed). Sans cette confirmation, la séance ne compte ni pour le
// score, ni pour les points, ni pour le payout.

const ConfirmSessionInput = z.object({
  sessionId: z.string().uuid(),
});

export const confirmMentorSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ConfirmSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    // Ownership parent : seule la famille de l'enfant de la séance peut confirmer.
    const { data: session } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select(
        "id, child_profile_id, mentor_user_id, status, occurred_at, child_profiles(user_id)",
      )
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Séance introuvable.");
    const childOwner = (session.child_profiles as any)?.user_id as string | undefined;
    if (!childOwner || childOwner !== userId) {
      throw new Error("Cette séance ne concerne pas un de vos enfants.");
    }
    if (session.status !== "declared") {
      throw new Error("Cette séance a déjà été traitée.");
    }

    // Transition atomique declared → confirmed (garde en base : jamais de double
    // confirmation, même si deux onglets du parent cliquent en même temps).
    const { data: claimed } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .update({
        status: "confirmed",
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", data.sessionId)
      .eq("status", "declared")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("Séance déjà traitée.");

    // La séance confirmée crédite +1 point au mentor (idempotent en base) — la
    // confirmation est l'événement qui « paie » réellement le mentor.
    await creditMentorPoints(supabaseAdmin as any, {
      mentorUserId: session.mentor_user_id,
      childId: session.child_profile_id,
      sessionId: session.id,
      kind: "session_confirmed",
      points: 1,
      reason: "Séance confirmée par le parent",
    });
    void notifyUser({
      userId: session.mentor_user_id,
      type: "mentor_session_confirmed",
      childId: session.child_profile_id,
      payload: { session_id: session.id, occurred_at: session.occurred_at },
      channels: { push: true, email: true },
    });
    void syncMentorTrustStatus(supabaseAdmin as any, session.mentor_user_id);

    return { success: true };
  });

// Séances en attente de validation du parent (hub « Mentor ») — les séances
// déclarées par le mentor pour CET enfant, non encore confirmées.
const ChildSessionsForValidationInput = z.object({ childId: z.string().uuid() });

export const listChildSessionsForValidation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildSessionsForValidationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: child } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) throw new Error("Profil enfant introuvable.");

    const { data: sessions, error } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, occurred_at, notes")
      .eq("child_profile_id", data.childId)
      .eq("status", "declared")
      .order("occurred_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    return (sessions ?? []) as { id: string; occurred_at: string; notes: string | null }[];
  });

const UpdateMentorStatusInput = z.object({
  mentorUserId: z.string().uuid(),
  status: z.enum(["active", "warning", "suspended", "banned"]),
});

export const updateMentorStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UpdateMentorStatusInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert : un compte sans ligne mentor_profiles (assigné avant la V1) est
    // implicitement 'active' — on crée la ligne au premier changement de statut.
    const { data: existing } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("mentor_user_id")
      .eq("mentor_user_id", data.mentorUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabaseAdmin as any)
        .from("mentor_profiles")
        .update({ status: data.status })
        .eq("mentor_user_id", data.mentorUserId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any)
        .from("mentor_profiles")
        .insert({ mentor_user_id: data.mentorUserId, status: data.status });
      if (error) throw new Error(error.message);
    }

    return { success: true, status: data.status };
  });

export const removeMentor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Soft-retire (V1) : poser removed_at au lieu d'un DELETE physique — l'historique du
    // mentor (séances, score) reste en base et l'enfant devient réassignable (l'index
    // partiel UNIQUE(child_profile_id) WHERE removed_at IS NULL l'autorise).
    // (supabaseAdmin as any) : colonne removed_at ajoutée par la migration 20260814170000,
    // pas encore dans les types régénérés.
    const { error } = await (supabaseAdmin as any)
      .from("mentors")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Le parent ne voyait jusqu'ici jamais qui supervise son enfant (aucune UI, aucune notif —
// il n'existe pas d'infra email/SMS dans ce projet, seulement des liens WhatsApp manuels).
// Cette fonction expose l'info de façon passive : le parent la découvre en ouvrant le
// portfolio. Ownership vérifiée manuellement (supabaseAdmin bypass les RLS).
const ChildMentorInfoInput = z.object({ childId: z.string().uuid() });

export const getChildMentorInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildMentorInfoInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: child } = await supabaseAdmin
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) return null;

    const { data: assignment } = await supabaseAdmin
      .from("mentors")
      .select("mentor_user_id, created_at")
      .eq("child_profile_id", data.childId)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!assignment) return null;

    // Email du mentor via parent_profiles (Vague 1) — une requête indexée au lieu
    // du scan complet de l'annuaire auth (listAllUsers).
    const { data: mentorContact } = await supabaseAdmin
      .from("parent_profiles")
      .select("email")
      .eq("user_id", assignment.mentor_user_id)
      .maybeSingle();
    const email = mentorContact?.email ?? "Inconnu";

    // Accompagnement (décision #76) : la raison d'être du mentor sur cet enfant
    // (pack ou campagne) + budget de séances — affiché dans le hub parent « Mentor ».
    const accompaniment = await resolveChildAccompaniment(supabaseAdmin, data.childId);

    return { email, assignedAt: assignment.created_at as string, accompaniment };
  });

// ── Vue mentor : liste de ses enfants assignés ──
export const getMentorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: assignments, error } = await supabaseAdmin
      .from("mentors")
      .select(
        "child_profile_id, created_at, child_profiles(id, name, age, talents, city, interests, user_id)",
      )
      .eq("mentor_user_id", userId)
      .is("removed_at", null);
    if (error) throw new Error(error.message);

    if (!assignments || assignments.length === 0) {
      const { data: emptyProfile } = await (supabaseAdmin as any)
        .from("mentor_profiles")
        .select("status")
        .eq("mentor_user_id", userId)
        .maybeSingle();
      return {
        children: [],
        score: null,
        sessionsThisMonth: 0,
        expectedSessions: 0,
        status: (emptyProfile?.status as string | undefined) ?? "active",
        points: 0,
        tier: "standard",
        badge: "none",
        pointsBonusPct: 0,
        pendingPayoutXof: 0,
      };
    }

    const childIds = assignments.map((a) => a.child_profile_id);

    const { data: challenges } = await supabaseAdmin
      .from("challenges")
      .select(
        "child_id, id, title, domain, status, created_at, description, duration, steps, materials, proof_image_url, ai_observations, notes, difficulty, pedagogical_context, requires_supervision, supervision_warning",
      )
      .in("child_id", childIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      // Vague 4 : borne souple — le journal de défis du mentor n'a pas vocation à
      // grandir sans fin (200 défis récents suffisent pour les actions opérateur).
      .limit(200);

    // Score de fiabilité (V2) : séances CONFIRMÉES ce mois (la déclaration seule ne
    // suffit plus depuis la V3) + feedback famille + progression — même fenêtre et
    // même pondération que listMentorsAdmin (mentor-score.ts).
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: monthSessions } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, payout_xof")
      .eq("mentor_user_id", userId)
      .in("status", CONFIRMED_SESSION_STATUSES)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);
    const monthSessionIds = (monthSessions ?? []).map((s: any) => s.id as string);
    let avgFeedback = 0;
    if (monthSessionIds.length > 0) {
      const { data: feedback } = await (supabaseAdmin as any)
        .from("mentor_feedback")
        .select("rating")
        .in("mentor_session_id", monthSessionIds);
      const ratings = (feedback ?? []).map((f: any) => Number(f.rating));
      if (ratings.length > 0) {
        avgFeedback = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
      }
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = Math.max(1, now.getDate());
    const completed = (challenges ?? []).filter((c) => c.status === "completed").length;
    const total = (challenges ?? []).length;
    const score = computeMentorScore({
      expectedSessions: computeExpectedSessions(assignments.length, daysInMonth, elapsedDays),
      declaredSessions: monthSessions?.length ?? 0,
      completedChallenges: completed,
      totalChallenges: total,
      avgFeedback,
    });

    // Confiance Mentor (V3) — statut automatique (30 j glissants), palier de
    // confiance et solde de points : le mentor voit sa position et son statut.
    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    const status = (profile?.status as string | undefined) ?? "active";
    const [rollingScore, points] = await Promise.all([
      computeRollingScore(supabaseAdmin as any, userId),
      getMentorPointsBalance(supabaseAdmin as any, userId),
    ]);
    const tier = computeTrustTier(rollingScore);
    const rewards = computeMentorPointsRewards(points);
    // Bascule automatique du statut si le score de confiance a franchi un seuil
    // (jamais sur « banned ») — non-fatal.
    if (status !== "banned") {
      void syncMentorTrustStatus(supabaseAdmin as any, userId);
    }

    // Le téléphone du parent est requêtable dans parent_profiles (Vague 1) — une
    // requête indexée sur les seuls parents concernés, au lieu du scan complet de
    // l'annuaire auth (listAllUsers) à chaque visite du dashboard.
    const parentIds = [
      ...new Set(
        (assignments ?? [])
          .map((a: any) => a.child_profiles?.user_id as string | undefined)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const phoneByUserId = new Map<string, string | null>();
    if (parentIds.length > 0) {
      const { data: parentContacts } = await supabaseAdmin
        .from("parent_profiles")
        .select("user_id, phone")
        .in("user_id", parentIds);
      for (const c of parentContacts ?? []) phoneByUserId.set(c.user_id, c.phone);
    }

    // Mentor Copilote (décision #74) : l'UI n'affiche les actions opérateur que pour
    // les enfants ACCOMPAGNÉS (pack ou campagne) — résolu par le même helper que les
    // server functions (source unique). Borné par le quota (≤ 5 enfants) ; Vague 4 :
    // résolutions PARALLÈLES (Promise.all) au lieu de la boucle séquentielle.
    const accompanimentResults = await Promise.all(
      (assignments ?? []).map(async (a) =>
        [
          a.child_profile_id,
          await resolveChildAccompaniment(supabaseAdmin as any, a.child_profile_id),
        ] as const,
      ),
    );
    const accompanimentByChild = new Map(accompanimentResults);

    // Journal de séance du mentor (action 'notes' et autres) — les dernières actions
    // par enfant, pour l'affichage des notes dans la modale de détail.
    const { data: recentActions } = await (supabaseAdmin as any)
      .from("mentor_actions")
      .select("id, child_profile_id, challenge_id, action, payload, created_at")
      .eq("mentor_user_id", userId)
      .in("child_profile_id", childIds)
      .order("created_at", { ascending: false })
      .limit(60);
    const actionsByChild = new Map<string, any[]>();
    for (const act of recentActions ?? []) {
      const list = actionsByChild.get(act.child_profile_id) ?? [];
      if (list.length < 10) list.push(act);
      actionsByChild.set(act.child_profile_id, list);
    }

    return {
      score,
      sessionsThisMonth: monthSessions?.length ?? 0,
      expectedSessions: computeExpectedSessions(assignments.length, daysInMonth, elapsedDays),
      status,
      points,
      tier,
      badge: rewards.badge,
      pointsBonusPct: rewards.payoutBonusPct,
      // Payout à venir (Vague C, V3) : somme des payout_xof des séances CONFIRMÉES
      // ce mois — indicatif tant que l'admin n'a pas approuvé (ledger). La
      // déclaration seule n'alimente plus l'affichage : seule la confirmation
      // parent compte. Le mentor voit l'argent en route.
      pendingPayoutXof: (monthSessions ?? []).reduce(
        (sum: number, s: any) => sum + Number(s.payout_xof ?? 0),
        0,
      ),
      children: assignments.map((a) => {
        const child = a.child_profiles as any;
        return {
          ...child,
          parentPhone: phoneByUserId.get(child?.user_id) ?? null,
          assignedAt: a.created_at as string,
          accompaniment: accompanimentByChild.get(a.child_profile_id)?.funding ?? "none",
          mentorActions: actionsByChild.get(a.child_profile_id) ?? [],
          challenges: (challenges ?? []).filter((c) => c.child_id === a.child_profile_id),
        };
      }),
    };
  });

// Permet à tout utilisateur connecté de savoir s'il est mentor ACTIF (pour afficher
// ou non l'espace /mentor) — miroir de checkAdminStatus (admin.functions.ts). Un
// mentor retiré (removed_at) ou banni ne voit plus l'espace. La vérification
// d'autorisation réelle des actions passe par requireSupabaseAuth + la présence de
// l'assignation (declareSessionMentor vérifie la propriété et le statut).
export const checkIsActiveMentor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { count } = await supabaseAdmin
      .from("mentors")
      .select("id", { count: "exact", head: true })
      .eq("mentor_user_id", userId)
      .is("removed_at", null);
    if ((count ?? 0) === 0) return { isMentor: false };

    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    const status = (profile?.status as string | undefined) ?? "active";
    return { isMentor: status !== "banned" };
  });

// ── Activation du mode Mentor par code (Vague 5, spec §7, décision D1) ──────
// L'admin génère des codes à usage unique ; l'utilisateur les saisit dans
// « Paramètres → Mentor » ; la RPC activate_mentor_code (migration 20260815180000)
// fait l'activation ATOMIQUEMENT (FOR UPDATE + auth.uid() vérifié dans la fonction).

const GenerateCodesInput = z.object({
  count: z.number().int().min(1).max(50).default(5),
  /** Nombre de jours de validité (null = jamais expiré). */
  validDays: z.number().int().min(1).max(365).optional(),
});

export interface MentorActivationCodeRow {
  id: string;
  code: string;
  valid_until: string | null;
  used_by_email: string | null;
  used_at: string | null;
  created_at: string;
}

// Alphabet sans caractères ambigus (ni 0/O, 1/I/L) — code tapé à la main.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateMentorCode(): Promise<string> {
  // Import dynamique (pattern du repo pour les modules serveur uniquement).
  const { randomBytes } = await import("node:crypto");
  const bytes = randomBytes(8);
  let code = "MNT-";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export const generateMentorActivationCodesAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => GenerateCodesInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const validUntil = data.validDays
      ? new Date(Date.now() + data.validDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Génération + insertion ; en cas de collision UNIQUE (improbable), on régénère
    // une fois avant d'abandonner.
    for (let attempt = 0; attempt < 3; attempt++) {
      const codes = await Promise.all(
        Array.from({ length: data.count }, () => generateMentorCode()),
      );
      const { data: inserted, error } = await (supabaseAdmin as any)
        .from("mentor_activation_codes")
        .insert(
          codes.map((code) => ({
            code,
            created_by: (context as any).claims?.sub ?? null,
            valid_until: validUntil,
          })),
        )
        .select("code, valid_until, created_at");
      if (!error) return { codes: (inserted ?? []).map((c: any) => c.code as string) };
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Impossible de générer des codes uniques — réessayez.");
  });

export const listMentorActivationCodesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ codes: MentorActivationCodeRow[]; total: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count }, { data: rows, error }] = await Promise.all([
      supabaseAdmin
        .from("mentor_activation_codes")
        .select("id", { count: "exact", head: true }),
      (supabaseAdmin as any)
        .from("mentor_activation_codes")
        .select("id, code, valid_until, used_by, used_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (error) throw new Error(error.message);

    // Email du compte activé via parent_profiles (Vague 1) — une requête groupée.
    const usedByUserIds = [
      ...new Set(
        ((rows ?? []) as Array<{ used_by: string | null }>)
          .map((r) => r.used_by)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const emailById = new Map<string, string | null>();
    if (usedByUserIds.length > 0) {
      const { data: contacts } = await supabaseAdmin
        .from("parent_profiles")
        .select("user_id, email")
        .in("user_id", usedByUserIds);
      for (const c of contacts ?? []) emailById.set(c.user_id, c.email);
    }

    return {
      codes: (rows ?? []).map((r: any) => ({
        id: r.id,
        code: r.code,
        valid_until: r.valid_until ?? null,
        used_by_email: r.used_by ? (emailById.get(r.used_by) ?? "Inconnu") : null,
        used_at: r.used_at ?? null,
        created_at: r.created_at,
      })),
      total: count ?? 0,
    };
  });

const ActivateMentorCodeInput = z.object({
  code: z.string().trim().min(1, "Saisissez votre code d'activation.").max(40),
});

// ── Mode Parent/Mentor (décision #79) ────────────────────────────────────────
// Le mode vit dans auth.users.user_metadata.mode : pur commutateur de contexte,
// il ne touche jamais au statut du compte (mentor_profiles). « Certifié » = ligne
// mentor_profiles (activation par code, RPC activate_mentor_code) OU assignations
// actives — un mentor activé par code sans enfant encore assigné reste un mentor
// (l'espace /mentor est accessible, la liste d'enfants est vide).

export const getMentorActivationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();

    const { count } = await supabaseAdmin
      .from("mentors")
      .select("id", { count: "exact", head: true })
      .eq("mentor_user_id", userId)
      .is("removed_at", null);
    const hasAssignments = (count ?? 0) > 0;

    const { data: user } = await supabaseAdmin.auth.admin
      .getUserById(userId)
      .catch(() => ({ data: null }));
    const mode = (user?.user?.user_metadata as any)?.mode === "mentor" ? "mentor" : "parent";

    return {
      certified: !!profile || hasAssignments,
      status: (profile?.status as string | undefined) ?? "active",
      mode,
      hasAssignments,
    };
  });

const SetModeInput = z.object({ mode: z.enum(["parent", "mentor"]) });

export const setMentorMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SetModeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    if (data.mode === "mentor") {
      const { data: profile } = await (supabaseAdmin as any)
        .from("mentor_profiles")
        .select("status")
        .eq("mentor_user_id", userId)
        .maybeSingle();
      const { count } = await supabaseAdmin
        .from("mentors")
        .select("id", { count: "exact", head: true })
        .eq("mentor_user_id", userId)
        .is("removed_at", null);
      const status = (profile?.status as string | undefined) ?? "active";
      if (!profile && (count ?? 0) === 0) {
        throw new Error("Votre compte n'est pas certifié comme mentor.");
      }
      if (status === "banned" || status === "suspended") {
        throw new Error(
          status === "banned"
            ? "Votre compte mentor est banni — contactez l'équipe Génizio."
            : "Votre compte mentor est suspendu — contactez l'équipe Génizio.",
        );
      }
    }

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const meta = { ...(user?.user?.user_metadata ?? {}), mode: data.mode };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: meta,
    });
    if (error) throw new Error(error.message);
    return { success: true, mode: data.mode };
  });

// L'utilisateur active le mode Mentor avec son code — la RPC défenseur vérifie
// auth.uid() (l'appel passe par le client authentifié, jamais le service role).
export const activateMentorCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ActivateMentorCodeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: status, error } = await supabase.rpc("activate_mentor_code", {
      p_code: data.code,
      p_user_id: (context as any).claims?.sub,
    });
    if (error) throw new Error(error.message);
    return { status: status as string };
  });

// ── Ledger payout mentor (Vague C, décision « ledger admin ») ─────────────
// Le mentor déclare ses séances (payout_xof posé à la déclaration) ; l'ADMIN valide :
//   • declared → approved : la séance est reconnue, elle entre dans le « Payout dû » ;
//   • approved → paid : le fondateur a viré (WhatsApp/Mobile Money), la séance est soldée.
// Le funding (pack/campagne/none) est visible pour la comptabilité de la plateforme.

export const listMentorSessionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z.object({ mentorUserId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = (supabaseAdmin as any)
      .from("mentor_sessions")
      .select(
        "id, mentor_user_id, child_profile_id, occurred_at, notes, status, funding, payout_xof, created_at, child_profiles(name)",
      )
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (data.mentorUserId) {
      query = query.eq("mentor_user_id", data.mentorUserId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((s: any) => ({
      id: s.id,
      mentor_user_id: s.mentor_user_id,
      child_name: (s.child_profiles as any)?.name ?? "Enfant",
      occurred_at: s.occurred_at as string,
      notes: s.notes as string | null,
      status: s.status as string,
      funding: s.funding as string,
      payout_xof: Number(s.payout_xof ?? 0),
    }));
  });

export const approveMentorSessionAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Charger la séance : la condition de paiement a besoin de l'enfant, de la date et du
    // financement (les champs sont posés à la déclaration, jamais modifiés après coup).
    const { data: session } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, child_profile_id, occurred_at, funding")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Séance introuvable ou déjà approuvée.");

    // Décision #74 (sous-décision 5) : la dernière séance du mois d'un enfant accompagné
    // n'est payable que si le bilan de fin de la période est rendu ET validé par le parent.
    if (session.funding === "pack" || session.funding === "campaign") {
      const occurred = new Date(session.occurred_at);
      const monthStart = new Date(occurred.getFullYear(), occurred.getMonth(), 1).toISOString();
      const monthEnd = new Date(occurred.getFullYear(), occurred.getMonth() + 1, 1).toISOString();

      const { data: approvedInMonth } = await (supabaseAdmin as any)
        .from("mentor_sessions")
        .select("id")
        .eq("child_profile_id", session.child_profile_id)
        .in("status", ["approved", "paid"])
        .gte("occurred_at", monthStart)
        .lt("occurred_at", monthEnd);

      const { data: validatedReport } = await (supabaseAdmin as any)
        .from("mentor_reports")
        .select("id")
        .eq("child_profile_id", session.child_profile_id)
        .eq("status", "validated")
        .lt("period_start", monthEnd)
        .gt("period_end", monthStart)
        .maybeSingle();

      if (
        isLastPayableSession({
          // Le contrat d'accompagnement est de 12 séances/mois/enfant (PACK_SESSIONS).
          monthlyBudget: PACK_SESSIONS,
          alreadyApprovedOrPaidInMonth: approvedInMonth?.length ?? 0,
          funded: session.funding as "pack" | "campaign",
          hasValidatedReportForPeriod: !!validatedReport,
        })
      ) {
        throw new Error(
          "Dernière séance du mois bloquée : le bilan de fin (validé par le parent) est requis avant de payer la 12e séance de la période.",
        );
      }
    }

    // CAS sur le statut : une séance n'est approuvée qu'une fois (jamais de double pay).
    // Depuis la V3 (Confiance Mentor), seule une séance CONFIRMÉE par le parent peut
    // être approuvée — la déclaration seule ne suffit plus pour déclencher le payout.
    const { data: claimed } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .update({ status: "approved" })
      .eq("id", data.sessionId)
      .eq("status", "confirmed")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("Séance introuvable, non confirmée par le parent ou déjà approuvée.");

    return { success: true };
  });

export const markMentorSessionsPaidAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ mentorUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: res, error } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .update({ status: "paid" })
      .eq("mentor_user_id", data.mentorUserId)
      .eq("status", "approved")
      .select("id");
    if (error) throw new Error(error.message);

    return { success: true, paidCount: (res ?? []).length };
  });

// ── Feedback famille (Vague C, V2) ─────────────────────────────────────────────
// Le parent note 1-5 la séance de suivi de son enfant (composante 25% du score). Une seule
// note par (séance, famille) — l'index unique supervise_feedback_session_user_key garantit
// l'upsert applicatif (la famille peut corriger sa note, jamais dupliquer).

const SubmitFeedbackInput = z.object({
  sessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const submitMentorFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SubmitFeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // La séance doit appartenir à un enfant DU COMPTE qui note.
    const { data: session } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("child_profile_id, mentor_user_id, child_profiles(user_id)")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Séance introuvable.");
    const childOwner = (session.child_profiles as any)?.user_id as string | undefined;
    if (!childOwner || childOwner !== userId) {
      throw new Error("Cette séance ne concerne pas un de vos enfants.");
    }

    const { data: existing } = await (supabaseAdmin as any)
      .from("mentor_feedback")
      .select("id")
      .eq("mentor_session_id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabaseAdmin as any)
        .from("mentor_feedback")
        .update({ rating: data.rating, comment: data.comment ?? null })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any).from("mentor_feedback").insert({
        mentor_session_id: data.sessionId,
        user_id: userId,
        rating: data.rating,
        comment: data.comment ?? null,
      });
      if (error) throw new Error(error.message);
    }

    // Confiance Mentor (V3) : une note 5/5 crédite +1 point (une seule fois par
    // séance, l'index unique (session_id, kind) fait foi — un changement de note
    // vers 5 ne re-crédite pas une séance déjà créditée).
    if (data.rating === 5 && session.mentor_user_id) {
      await creditMentorPoints(supabaseAdmin as any, {
        mentorUserId: session.mentor_user_id,
        childId: session.child_profile_id,
        sessionId: data.sessionId,
        kind: "feedback_5",
        points: 1,
        reason: "Note famille 5/5",
      });
    }
    void syncMentorTrustStatus(supabaseAdmin as any, session.mentor_user_id);

    return { success: true, rating: data.rating };
  });

// Séances récentes d'un enfant (pour le widget « Noter la dernière séance » du portfolio).
// Retourne aussi l'état de notation (upsert applicatif : on peut corriger, pas dupliquer).
const ChildSessionsForFeedbackInput = z.object({ childId: z.string().uuid() });

export const listChildSessionsForFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildSessionsForFeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: child } = await supabaseAdmin
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) throw new Error("Profil enfant introuvable.");

    const { data: sessions, error } = await (supabaseAdmin as any)
      .from("mentor_sessions")
      .select("id, occurred_at, mentor_user_id, mentor_feedback(rating)")
      .eq("child_profile_id", data.childId)
      .order("occurred_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    return (sessions ?? []).map((s: any) => ({
      id: s.id as string,
      occurred_at: s.occurred_at as string,
      rated: (s.mentor_feedback ?? []).length > 0,
      rating: (s.mentor_feedback ?? [])[0]?.rating ?? null,
    }));
  });
