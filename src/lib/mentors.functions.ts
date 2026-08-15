import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { z } from "zod";
import { computeSupervisorQuota } from "./supervisor-quota";
import { computeExpectedSessions, computeSupervisorScore } from "./supervisor-score";
import { SUPERVISOR_SESSION_PAYOUT_XOF, PACK_SESSIONS } from "@/lib/pricing";
import { resolveChildAccompaniment } from "@/lib/child-accompaniment";
import { isLastPayableSession } from "@/lib/supervisor-operator";

// ────────────────────────────────────────────────────────────
// Superviseurs — Fonctions serveur
// Un superviseur peut consulter les profils de plusieurs enfants.
// Seul l'admin peut assigner des superviseurs.
// ────────────────────────────────────────────────────────────

// Utilisée par le sélecteur "Profil enfant" de /admin/supervisors — la requête
// client directe (soumise aux RLS) ne remontait que les enfants du compte admin
// lui-même plus ceux ayant déjà un défi complété (policy publique du Mur Public),
// rendant tout enfant nouvellement inscrit invisible pour l'assignation.
export const listChildProfilesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export interface SupervisorAssignmentDetail {
  id: string;
  child_profile_id: string;
  child_name: string;
  child_age: number | null;
  campaign_id: string | null;
  campaign_name: string | null;
  created_at: string;
}

export interface SupervisorGroup {
  supervisor_user_id: string;
  email: string;
  totalChildren: number;
  /** Quota effectif (plancher + extra, borné 5) — même calcul que check_supervisor_quota. */
  quota: number;
  /** Score de fiabilité /100 (V2) — 50% séances + 25% feedback famille + 25% progression (supervisor-score.ts). */
  score: number;
  /** Statut du compte superviseur (supervisor_profiles) — active|warning|suspended|banned. */
  status: string;
  /** Payout DÛ (Vague C, ledger admin) : somme des payout_xof des séances approuvées non encore payées. */
  duePayoutXof: number;
  /** Nombre de séances approuvées en attente de paiement (ledger admin). */
  approvedSessions: number;
  children: SupervisorAssignmentDetail[];
}

export interface PaginatedSupervisors {
  data: SupervisorGroup[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Liste admin des superviseurs (refonte 2026-08-14) : GROUPÉE par superviseur et
// PAGINÉE — l'ancienne liste plate chargeait toute la table `supervisors` (une ligne par
// assignation enfant) dans un <ul> sans recherche ni filtre, inutilisable dès que le
// volume grossit. Résolution des emails CIBLÉE : getUserById en parallèle sur les ids
// distincts uniquement (même fix que getNgoDashboardData) — fini listAllUsers qui pagine
// tout l'annuaire à chaque visite. Filtres : campagne (sur campaign_id de l'assignation)
// et recherche par email.
const ListSupervisorsInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().max(80).optional(),
  campaignId: z.string().uuid().optional(),
});

export const listSupervisorsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ListSupervisorsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = (supabaseAdmin as any)
      .from("supervisors")
      .select(
        "id, supervisor_user_id, child_profile_id, campaign_id, created_at, child_profiles(name, age), campaigns(name, created_at, extra_supervisors_quota)",
      )
      // Soft-retire (V1) : un superviseur retiré disparaît des flux actifs (liste admin,
      // assignation, quota) — son historique (séances, score) reste en base.
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (data.campaignId) {
      query = query.eq("campaign_id", data.campaignId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Groupement en mémoire par superviseur — le volume pertinent est le nombre de
    // SUPERVISEURS (petit), pas le nombre de lignes d'assignation.
    const groups = new Map<string, SupervisorGroup>();
    const campaignRefs = new Map<string, { createdAt: string | null; extraQuota: number }>();
    for (const row of rows ?? []) {
      const existing = groups.get(row.supervisor_user_id);
      const detail: SupervisorAssignmentDetail = {
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
          extraQuota: (row.campaigns as any).extra_supervisors_quota as number,
        });
      }
      if (existing) {
        existing.children.push(detail);
        existing.totalChildren += 1;
      } else {
        groups.set(row.supervisor_user_id, {
          supervisor_user_id: row.supervisor_user_id,
          email: "…",
          totalChildren: 1,
          quota: 5,
          score: 0,
          status: "active",
          duePayoutXof: 0,
          approvedSessions: 0,
          children: [detail],
        });
      }
    }

    if (groups.size === 0) {
      return { data: [], total: 0, page: data.page, pageSize: data.pageSize, totalPages: 1 };
    }

    // Résolution ciblée des emails (et date de création, pour le quota hors campagne) :
    // uniquement les superviseurs réellement présents, en parallèle.
    const supervisorIds = [...groups.keys()];
    const emailMap = new Map<string, { email: string; createdAt: string | null }>();
    const resolved = await Promise.all(
      supervisorIds.map(async (id: string) => {
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

    // Score de fiabilité (V1) — chargement groupé une fois pour tous les superviseurs de
    // la page : statut (supervisor_profiles), séances déclarées ce mois (supervisor_sessions)
    // et défis de leurs enfants (progression). Même fenêtre « mois courant » des deux côtés.
    const { data: profiles } = await (supabaseAdmin as any)
      .from("supervisor_profiles")
      .select("supervisor_user_id, status")
      .in("supervisor_user_id", supervisorIds);
    const statusMap = new Map<string, string>(
      (profiles ?? []).map((p: any) => [p.supervisor_user_id as string, p.status as string]),
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: sessions } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .select("id, supervisor_user_id")
      .in("supervisor_user_id", supervisorIds)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);
    const sessionsBySupervisor = new Map<string, number>();
    const sessionSupervisor = new Map<string, string>();
    for (const s of sessions ?? []) {
      sessionsBySupervisor.set(
        s.supervisor_user_id,
        (sessionsBySupervisor.get(s.supervisor_user_id) ?? 0) + 1,
      );
      sessionSupervisor.set(s.id as string, s.supervisor_user_id as string);
    }

    // Feedback famille (Vague C, V2) : moyenne des notes posées sur les séances DU MOIS des
    // superviseurs de la page — alimente la composante 25% du score. Sans note, le score est
    // renormalisé (supervisor-score.ts).
    const ratingsBySupervisor = new Map<string, { sum: number; count: number }>();
    const sessionIds = [...sessionSupervisor.keys()];
    if (sessionIds.length > 0) {
      const { data: feedback } = await (supabaseAdmin as any)
        .from("supervisor_feedback")
        .select("supervisor_session_id, rating")
        .in("supervisor_session_id", sessionIds);
      for (const f of feedback ?? []) {
        const supId = sessionSupervisor.get(f.supervisor_session_id as string);
        if (!supId) continue;
        const cur = ratingsBySupervisor.get(supId) ?? { sum: 0, count: 0 };
        cur.sum += Number(f.rating);
        cur.count += 1;
        ratingsBySupervisor.set(supId, cur);
      }
    }

    // Ledger payout (Vague C) : séances APPROUVÉES non encore payées → « Payout dû ».
    const { data: approved } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .select("supervisor_user_id, payout_xof")
      .in("supervisor_user_id", supervisorIds)
      .eq("status", "approved");
    const approvedBySupervisor = new Map<string, { xof: number; count: number }>();
    for (const a of approved ?? []) {
      const cur = approvedBySupervisor.get(a.supervisor_user_id) ?? { xof: 0, count: 0 };
      cur.xof += Number(a.payout_xof ?? 0);
      cur.count += 1;
      approvedBySupervisor.set(a.supervisor_user_id, cur);
    }

    const childIdsOfPage = [...groups.values()].flatMap((g) =>
      g.children.map((c) => c.child_profile_id),
    );
    const { data: challenges } = await (supabaseAdmin as any)
      .from("challenges")
      .select("child_id, status")
      .in("child_id", childIdsOfPage)
      .is("deleted_at", null);
    const childBySupervisor = new Map<string, Set<string>>();
    for (const g of groups.values()) {
      childBySupervisor.set(
        g.supervisor_user_id,
        new Set(g.children.map((c) => c.child_profile_id)),
      );
    }
    const completedBySupervisor = new Map<string, number>();
    const totalBySupervisor = new Map<string, number>();
    for (const c of challenges ?? []) {
      for (const [supId, childSet] of childBySupervisor) {
        if (!childSet.has(c.child_id)) continue;
        totalBySupervisor.set(supId, (totalBySupervisor.get(supId) ?? 0) + 1);
        if (c.status === "completed") {
          completedBySupervisor.set(supId, (completedBySupervisor.get(supId) ?? 0) + 1);
        }
      }
    }

    // Fraction du mois écoulé : au premier jour le score serait à 0 sans déclaration —
    // on proratise l'attendu (12 séances/mois/enfant) sur les jours écoulés.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = Math.max(1, now.getDate());

    const term = data.search?.trim().toLowerCase();
    const list = [...groups.values()].filter((g) => {
      const email = emailMap.get(g.supervisor_user_id)?.email ?? "Inconnu";
      g.email = email;
      // Quota effectif : le plus élevé des contextes de ses assignations — plancher
      // grand-péré (référence = campagne si assigné via campagne, sinon date du compte)
      // + extra_supervisors_quota de la campagne, borné 5 (même calcul que le trigger
      // check_supervisor_quota et computeSupervisorQuota).
      const { createdAt } = emailMap.get(g.supervisor_user_id) ?? { createdAt: null };
      let quota = 0;
      for (const child of g.children) {
        const ctx = child.campaign_id ? campaignRefs.get(child.campaign_id) : undefined;
        const ref = ctx ? ctx.createdAt : createdAt;
        const extra = ctx?.extraQuota ?? 0;
        quota = Math.max(
          quota,
          computeSupervisorQuota({ referenceCreatedAt: ref, extraQuota: extra }),
        );
      }
      g.quota = quota;
      g.status = statusMap.get(g.supervisor_user_id) ?? "active";
      const fb = ratingsBySupervisor.get(g.supervisor_user_id);
      g.score = computeSupervisorScore({
        expectedSessions: computeExpectedSessions(g.totalChildren, daysInMonth, elapsedDays),
        declaredSessions: sessionsBySupervisor.get(g.supervisor_user_id) ?? 0,
        completedChallenges: completedBySupervisor.get(g.supervisor_user_id) ?? 0,
        totalChallenges: totalBySupervisor.get(g.supervisor_user_id) ?? 0,
        avgFeedback: fb && fb.count > 0 ? fb.sum / fb.count : 0,
      });
      const due = approvedBySupervisor.get(g.supervisor_user_id);
      g.duePayoutXof = due?.xof ?? 0;
      g.approvedSessions = due?.count ?? 0;
      return !term || email.toLowerCase().includes(term);
    });

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / data.pageSize));
    const page = Math.min(data.page, totalPages);
    const from = (page - 1) * data.pageSize;

    return {
      data: list.slice(from, from + data.pageSize),
      total,
      page,
      pageSize: data.pageSize,
      totalPages,
    } as PaginatedSupervisors;
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

const AssignSupervisorInput = z.object({
  email: z.string().email("Email invalide"),
  childProfileId: z.string().uuid("ID de profil invalide"),
});

// Point d'insertion unique pour les deux chemins d'assignation (admin manuel ici, et B2B dans
// campaigns.functions.ts) — décision utilisateur (2026-07-26) : "un seul superviseur par
// enfant" est une règle du SYSTÈME, pas d'un chemin en particulier. Avant, seul le chemin B2B
// filtrait les enfants déjà supervisés (côté application, pas garanti), et le chemin admin
// n'appliquait rien du tout. Centraliser l'insertion ici évite qu'un futur 3e chemin
// (import en masse, transfert...) oublie la même garde-fou. La contrainte UNIQUE
// (child_profile_id) posée en base (migration 20260726140000) fait foi dans tous les cas ;
// ceci ne fait que donner un message d'erreur clair au lieu d'un code Postgres brut.
export async function insertSupervisorAssignments(
  supabaseAdmin: any,
  params: {
    supervisorUserId: string;
    childProfileIds: string[];
    campaignId: string | null;
    assignedBy: string | null;
  },
) {
  if (params.childProfileIds.length === 0) return [];

  // Statut du compte superviseur (V1) : un superviseur suspendu ou banni ne reçoit plus
  // d'assignation — le ban est structurel, pas une décision après coup.
  const { data: profile } = await (supabaseAdmin as any)
    .from("supervisor_profiles")
    .select("status")
    .eq("supervisor_user_id", params.supervisorUserId)
    .maybeSingle();
  const status = (profile?.status as string | undefined) ?? "active";
  if (status === "suspended" || status === "banned") {
    throw new Error(
      status === "banned"
        ? "Ce superviseur est banni — restaurez-le avant de l'assigner."
        : "Ce superviseur est suspendu — restaurez-le avant de l'assigner.",
    );
  }

  const rows = params.childProfileIds.map((childId) => ({
    supervisor_user_id: params.supervisorUserId,
    child_profile_id: childId,
    campaign_id: params.campaignId,
    assigned_by: params.assignedBy,
  }));
  const { data, error } = await supabaseAdmin.from("supervisors").insert(rows).select("*");
  if (error) {
    if (error.code === "23505")
      throw new Error("Un ou plusieurs de ces enfants ont déjà un superviseur assigné.");
    throw new Error(error.message);
  }
  return data ?? [];
}

export const assignSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AssignSupervisorInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Chercher l'utilisateur par email via auth admin
    const users = await listAllUsers(supabaseAdmin);

    const targetUser = users.find((u) => u.email === data.email);
    if (!targetUser) throw new Error(`Aucun compte trouvé pour l'email : ${data.email}`);

    // Chercher l'inscription à une campagne pour cet enfant si elle existe
    const { data: enrollment } = await (supabaseAdmin as any)
      .from("season_enrollments")
      .select("campaign_id")
      .eq("child_id", data.childProfileId)
      .not("campaign_id", "is", null)
      .order("enrolled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rows = await insertSupervisorAssignments(supabaseAdmin, {
      supervisorUserId: targetUser.id,
      childProfileIds: [data.childProfileId],
      campaignId: enrollment?.campaign_id ?? null,
      assignedBy: (context as any).claims?.sub ?? null,
    });
    return rows[0];
  });

// Assignation DIRECTE à une campagne (refonte 2026-08-14) — miroir admin du
// self-service ONG assignCampaignSupervisor (campaigns.functions.ts) : l'admin Génizio
// choisit une campagne + un superviseur + un nombre d'enfants, le système pioche
// automatiquement dans la cohorte de la campagne parmi les enfants qui n'ont encore
// aucun superviseur. Point d'insertion unique conservé (insertSupervisorAssignments) :
// la contrainte UNIQUE(child_profile_id) et le trigger de quota restent les autorités.
// requireAdmin au lieu de requireSupabaseAuth + ownership manager : l'admin peut assigner
// sur n'importe quelle campagne, pas seulement celles dont il est gestionnaire.
const AssignSupervisorToCampaignInput = z.object({
  campaignId: z.string().uuid(),
  supervisorEmail: z.string().email(),
  count: z.number().int().min(1).max(5).default(5),
});

export const assignSupervisorToCampaignAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => AssignSupervisorToCampaignInput.parse(input))
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
      throw new Error("Campagne archivée — restaurez-la avant d'assigner des superviseurs.");
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
    const cohortChildIds: string[] = [
      ...new Set<string>((enrollments ?? []).map((e: any) => e.child_id as string)),
    ];
    if (cohortChildIds.length === 0) {
      throw new Error("Aucun enfant inscrit dans cette campagne pour l'instant.");
    }

    const { data: existingSup } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("child_profile_id")
      .in("child_profile_id", cohortChildIds);
    const alreadySupervised = new Set(
      (existingSup ?? []).map((s: any) => s.child_profile_id as string),
    );
    const unsupervisedChildIds = cohortChildIds.filter((id) => !alreadySupervised.has(id));

    if (unsupervisedChildIds.length === 0) {
      throw new Error("Tous les enfants de cette campagne ont déjà un superviseur.");
    }

    // Pré-check informatif seulement — le trigger DB check_supervisor_quota (migration
    // 20260726120000) fait foi, comme sur le chemin ONG. Ne compte que les assignations
    // ACTIVES (soft-retire V1) : un superviseur retiré libère sa place.
    const { data: existingAssignments } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("id")
      .eq("supervisor_user_id", supervisor.id)
      .is("removed_at", null);
    const currentCount = existingAssignments?.length ?? 0;
    const quota = computeSupervisorQuota({
      referenceCreatedAt: campaign.created_at,
      extraQuota: campaign.extra_supervisors_quota,
    });
    const slotsLeft = Math.max(0, quota - currentCount);
    const toAssign = Math.min(data.count, slotsLeft, unsupervisedChildIds.length);

    if (toAssign === 0) {
      throw new Error(
        `Le superviseur ${data.supervisorEmail} a atteint sa limite de ${quota} enfants. Contactez le support pour augmenter son quota.`,
      );
    }

    // Insertion centralisée — même point de passage que le chemin admin manuel.
    await insertSupervisorAssignments(supabaseAdmin, {
      supervisorUserId: supervisor.id,
      childProfileIds: unsupervisedChildIds.slice(0, toAssign),
      campaignId: data.campaignId,
      assignedBy: (context as any).claims?.sub ?? null,
    });

    return { success: true, assignedCount: toAssign };
  });

// ── Système de confiance (V1, décision « score auto ») ─────────────────────────
// Le superviseur déclare ses séances en app (date + compte-rendu) ; le score de
// fiabilité se calcule tout seul (supervisor-score.ts). La déclaration est la preuve
// qui alimentera la facturation (supervisor_payout, V2) — d'où la rigueur : la séance
// doit concerner un enfant assigné ACTIF, et le superviseur ne doit pas être suspendu/banni.

const DeclareSessionInput = z.object({
  childProfileId: z.string().uuid(),
  occurredAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const declareSessionSupervisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => DeclareSessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    // Statut du superviseur : un suspendu/banni ne peut pas déclarer de séance.
    const { data: profile } = await (supabaseAdmin as any)
      .from("supervisor_profiles")
      .select("status")
      .eq("supervisor_user_id", userId)
      .maybeSingle();
    const status = (profile?.status as string | undefined) ?? "active";
    if (status === "suspended" || status === "banned") {
      throw new Error(
        status === "banned"
          ? "Votre compte superviseur est banni — contactez l'équipe Génizio."
          : "Votre compte superviseur est suspendu — contactez l'équipe Génizio.",
      );
    }

    // La séance doit concerner un enfant assigné à CE superviseur, encore actif.
    const { data: assignment } = await (supabaseAdmin as any)
      .from("supervisors")
      .select("id, campaign_id")
      .eq("supervisor_user_id", userId)
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

    const { error } = await (supabaseAdmin as any).from("supervisor_sessions").insert({
      supervisor_user_id: userId,
      child_profile_id: data.childProfileId,
      occurred_at: data.occurredAt ?? nowIso,
      notes: data.notes ?? null,
      campaign_id: campaignId,
      funding,
      // 70% de la séance sur preuve (décision porteur) — posé à la déclaration, validé par
      // l'admin (ledger) : le montant du payout ne change jamais après coup.
      payout_xof: SUPERVISOR_SESSION_PAYOUT_XOF,
      status: "declared",
    });
    if (error) throw new Error(`Erreur lors de la déclaration: ${error.message}`);

    return { success: true, funding };
  });

export const listSupervisorSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data, error } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .select("id, child_profile_id, occurred_at, notes, created_at, child_profiles(name)")
      .eq("supervisor_user_id", userId)
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

const UpdateSupervisorStatusInput = z.object({
  supervisorUserId: z.string().uuid(),
  status: z.enum(["active", "warning", "suspended", "banned"]),
});

export const updateSupervisorStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UpdateSupervisorStatusInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert : un compte sans ligne supervisor_profiles (assigné avant la V1) est
    // implicitement 'active' — on crée la ligne au premier changement de statut.
    const { data: existing } = await (supabaseAdmin as any)
      .from("supervisor_profiles")
      .select("supervisor_user_id")
      .eq("supervisor_user_id", data.supervisorUserId)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabaseAdmin as any)
        .from("supervisor_profiles")
        .update({ status: data.status })
        .eq("supervisor_user_id", data.supervisorUserId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any)
        .from("supervisor_profiles")
        .insert({ supervisor_user_id: data.supervisorUserId, status: data.status });
      if (error) throw new Error(error.message);
    }

    return { success: true, status: data.status };
  });

export const removeSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Soft-retire (V1) : poser removed_at au lieu d'un DELETE physique — l'historique du
    // superviseur (séances, score) reste en base et l'enfant devient réassignable (l'index
    // partiel UNIQUE(child_profile_id) WHERE removed_at IS NULL l'autorise).
    // (supabaseAdmin as any) : colonne removed_at ajoutée par la migration 20260814170000,
    // pas encore dans les types régénérés.
    const { error } = await (supabaseAdmin as any)
      .from("supervisors")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Le parent ne voyait jusqu'ici jamais qui supervise son enfant (aucune UI, aucune notif —
// il n'existe pas d'infra email/SMS dans ce projet, seulement des liens WhatsApp manuels).
// Cette fonction expose l'info de façon passive : le parent la découvre en ouvrant le
// portfolio. Ownership vérifiée manuellement (supabaseAdmin bypass les RLS).
const ChildSupervisorInfoInput = z.object({ childId: z.string().uuid() });

export const getChildSupervisorInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildSupervisorInfoInput.parse(input))
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
      .from("supervisors")
      .select("supervisor_user_id, created_at")
      .eq("child_profile_id", data.childId)
      .is("removed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!assignment) return null;

    const users = await listAllUsers(supabaseAdmin);
    const email = users.find((u) => u.id === assignment.supervisor_user_id)?.email ?? "Inconnu";

    return { email, assignedAt: assignment.created_at as string };
  });

// ── Vue superviseur : liste de ses enfants assignés ──
export const getSupervisorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: assignments, error } = await supabaseAdmin
      .from("supervisors")
      .select(
        "child_profile_id, created_at, child_profiles(id, name, age, talents, city, interests, user_id)",
      )
      .eq("supervisor_user_id", userId)
      .is("removed_at", null);
    if (error) throw new Error(error.message);

    if (!assignments || assignments.length === 0) {
      return { children: [], score: null, sessionsThisMonth: 0, expectedSessions: 0 };
    }

    const childIds = assignments.map((a) => a.child_profile_id);

    const { data: challenges } = await supabaseAdmin
      .from("challenges")
      .select(
        "child_id, id, title, domain, status, created_at, description, duration, steps, materials, proof_image_url, ai_observations, notes, difficulty, pedagogical_context, requires_supervision, supervision_warning",
      )
      .in("child_id", childIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Score de fiabilité (V2) : séances déclarées ce mois + feedback famille + progression —
    // même fenêtre et même pondération que listSupervisorsAdmin (supervisor-score.ts).
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data: monthSessions } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .select("id")
      .eq("supervisor_user_id", userId)
      .gte("occurred_at", monthStart)
      .lt("occurred_at", monthEnd);
    const monthSessionIds = (monthSessions ?? []).map((s: any) => s.id as string);
    let avgFeedback = 0;
    if (monthSessionIds.length > 0) {
      const { data: feedback } = await (supabaseAdmin as any)
        .from("supervisor_feedback")
        .select("rating")
        .in("supervisor_session_id", monthSessionIds);
      const ratings = (feedback ?? []).map((f: any) => Number(f.rating));
      if (ratings.length > 0) {
        avgFeedback = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
      }
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = Math.max(1, now.getDate());
    const completed = (challenges ?? []).filter((c) => c.status === "completed").length;
    const total = (challenges ?? []).length;
    const score = computeSupervisorScore({
      expectedSessions: computeExpectedSessions(assignments.length, daysInMonth, elapsedDays),
      declaredSessions: monthSessions?.length ?? 0,
      completedChallenges: completed,
      totalChallenges: total,
      avgFeedback,
    });

    // Le numéro de téléphone du parent vit dans auth.users.user_metadata, pas
    // dans child_profiles — le superviseur doit pouvoir contacter le parent
    // directement, donc jointure manuelle via l'API admin.
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const phoneByUserId = new Map(
      users.map((u) => [u.id, (u.user_metadata as any)?.phone as string | undefined]),
    );

    // Superviseur Copilote (décision #74) : l'UI n'affiche les actions opérateur que pour
    // les enfants ACCOMPAGNÉS (pack ou campagne) — résolu par le même helper que les
    // server functions (source unique). Borné par le quota (≤ 5 enfants, 2 requêtes/enfant).
    const accompanimentByChild = new Map<
      string,
      Awaited<ReturnType<typeof resolveChildAccompaniment>>
    >();
    for (const a of assignments) {
      accompanimentByChild.set(
        a.child_profile_id,
        await resolveChildAccompaniment(supabaseAdmin as any, a.child_profile_id),
      );
    }

    // Journal de séance du superviseur (action 'notes' et autres) — les dernières actions
    // par enfant, pour l'affichage des notes dans la modale de détail.
    const { data: recentActions } = await (supabaseAdmin as any)
      .from("supervisor_actions")
      .select("id, child_profile_id, challenge_id, action, payload, created_at")
      .eq("supervisor_user_id", userId)
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
      // Payout à venir (Vague C) : 70% de la séance × séances déclarées ce mois — indicatif
      // tant que l'admin n'a pas approuvé (ledger). Le superviseur voit l'argent en route.
      pendingPayoutXof: (monthSessions?.length ?? 0) * SUPERVISOR_SESSION_PAYOUT_XOF,
      children: assignments.map((a) => {
        const child = a.child_profiles as any;
        return {
          ...child,
          parentPhone: phoneByUserId.get(child?.user_id) ?? null,
          assignedAt: a.created_at as string,
          accompaniment: accompanimentByChild.get(a.child_profile_id)?.funding ?? "none",
          supervisorActions: actionsByChild.get(a.child_profile_id) ?? [],
          challenges: (challenges ?? []).filter((c) => c.child_id === a.child_profile_id),
        };
      }),
    };
  });

// Permet à tout utilisateur connecté de savoir s'il est superviseur ACTIF (pour afficher
// ou non l'espace /supervisor) — miroir de checkAdminStatus (admin.functions.ts). Un
// superviseur retiré (removed_at) ou banni ne voit plus l'espace. La vérification
// d'autorisation réelle des actions passe par requireSupabaseAuth + la présence de
// l'assignation (declareSessionSupervisor vérifie la propriété et le statut).
export const checkIsActiveSupervisor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { count } = await supabaseAdmin
      .from("supervisors")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_user_id", userId)
      .is("removed_at", null);
    if ((count ?? 0) === 0) return { isSupervisor: false };

    const { data: profile } = await (supabaseAdmin as any)
      .from("supervisor_profiles")
      .select("status")
      .eq("supervisor_user_id", userId)
      .maybeSingle();
    const status = (profile?.status as string | undefined) ?? "active";
    return { isSupervisor: status !== "banned" };
  });

// ── Ledger payout superviseur (Vague C, décision « ledger admin ») ─────────────
// Le superviseur déclare ses séances (payout_xof posé à la déclaration) ; l'ADMIN valide :
//   • declared → approved : la séance est reconnue, elle entre dans le « Payout dû » ;
//   • approved → paid : le fondateur a viré (WhatsApp/Mobile Money), la séance est soldée.
// Le funding (pack/campagne/none) est visible pour la comptabilité de la plateforme.

export const listSupervisorSessionsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z.object({ supervisorUserId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = (supabaseAdmin as any)
      .from("supervisor_sessions")
      .select(
        "id, supervisor_user_id, child_profile_id, occurred_at, notes, status, funding, payout_xof, created_at, child_profiles(name)",
      )
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (data.supervisorUserId) {
      query = query.eq("supervisor_user_id", data.supervisorUserId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((s: any) => ({
      id: s.id,
      supervisor_user_id: s.supervisor_user_id,
      child_name: (s.child_profiles as any)?.name ?? "Enfant",
      occurred_at: s.occurred_at as string,
      notes: s.notes as string | null,
      status: s.status as string,
      funding: s.funding as string,
      payout_xof: Number(s.payout_xof ?? 0),
    }));
  });

export const approveSupervisorSessionAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Charger la séance : la condition de paiement a besoin de l'enfant, de la date et du
    // financement (les champs sont posés à la déclaration, jamais modifiés après coup).
    const { data: session } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
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
        .from("supervisor_sessions")
        .select("id")
        .eq("child_profile_id", session.child_profile_id)
        .in("status", ["approved", "paid"])
        .gte("occurred_at", monthStart)
        .lt("occurred_at", monthEnd);

      const { data: validatedReport } = await (supabaseAdmin as any)
        .from("supervisor_reports")
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
    const { data: claimed } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .update({ status: "approved" })
      .eq("id", data.sessionId)
      .eq("status", "declared")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("Séance introuvable ou déjà approuvée.");

    return { success: true };
  });

export const markSupervisorSessionsPaidAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ supervisorUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: res, error } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .update({ status: "paid" })
      .eq("supervisor_user_id", data.supervisorUserId)
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

export const submitSupervisorFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SubmitFeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // La séance doit appartenir à un enfant DU COMPTE qui note.
    const { data: session } = await (supabaseAdmin as any)
      .from("supervisor_sessions")
      .select("child_profile_id, child_profiles(user_id)")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Séance introuvable.");
    const childOwner = (session.child_profiles as any)?.user_id as string | undefined;
    if (!childOwner || childOwner !== userId) {
      throw new Error("Cette séance ne concerne pas un de vos enfants.");
    }

    const { data: existing } = await (supabaseAdmin as any)
      .from("supervisor_feedback")
      .select("id")
      .eq("supervisor_session_id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabaseAdmin as any)
        .from("supervisor_feedback")
        .update({ rating: data.rating, comment: data.comment ?? null })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any).from("supervisor_feedback").insert({
        supervisor_session_id: data.sessionId,
        user_id: userId,
        rating: data.rating,
        comment: data.comment ?? null,
      });
      if (error) throw new Error(error.message);
    }

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
      .from("supervisor_sessions")
      .select("id, occurred_at, supervisor_user_id, supervisor_feedback(rating)")
      .eq("child_profile_id", data.childId)
      .order("occurred_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    return (sessions ?? []).map((s: any) => ({
      id: s.id as string,
      occurred_at: s.occurred_at as string,
      rated: (s.supervisor_feedback ?? []).length > 0,
      rating: (s.supervisor_feedback ?? [])[0]?.rating ?? null,
    }));
  });
