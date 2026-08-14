import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { z } from "zod";
import { computeSupervisorQuota } from "./supervisor-quota";

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
    // 20260726120000) fait foi, comme sur le chemin ONG.
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

export const removeSupervisor = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("supervisors").delete().eq("id", data.id);
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
      .eq("supervisor_user_id", userId);
    if (error) throw new Error(error.message);

    if (!assignments || assignments.length === 0) return { children: [] };

    const childIds = assignments.map((a) => a.child_profile_id);

    const { data: challenges } = await supabaseAdmin
      .from("challenges")
      .select(
        "child_id, id, title, domain, status, created_at, description, duration, steps, materials, proof_image_url, ai_observations, notes, difficulty, pedagogical_context, requires_supervision, supervision_warning",
      )
      .in("child_id", childIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Le numéro de téléphone du parent vit dans auth.users.user_metadata, pas
    // dans child_profiles — le superviseur doit pouvoir contacter le parent
    // directement, donc jointure manuelle via l'API admin.
    const { listAllUsers } = await import("@/integrations/supabase/admin-users");
    const users = await listAllUsers(supabaseAdmin);
    const phoneByUserId = new Map(
      users.map((u) => [u.id, (u.user_metadata as any)?.phone as string | undefined]),
    );

    return {
      children: assignments.map((a) => {
        const child = a.child_profiles as any;
        return {
          ...child,
          parentPhone: phoneByUserId.get(child?.user_id) ?? null,
          assignedAt: a.created_at as string,
          challenges: (challenges ?? []).filter((c) => c.child_id === a.child_profile_id),
        };
      }),
    };
  });
