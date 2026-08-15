// Mentor Copilote (décision #74) — notifications (canal in-app pull).
//
// Le parent PULL ses notifications à l'ouverture (badge + liste légère) et les marque
// lues. Depuis Confiance Mentor (2026-08-15), le push (Web Push VAPID) et l'email
// (Brevo) complètent le canal in-app : notifyUser (app-notifications.ts) orchestre
// les trois canaux. Ici : la gestion des push_subscriptions côté client.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { z } from "zod";

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await (supabaseAdmin as any)
      .from("app_notifications")
      .select("id, type, child_profile_id, payload, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    return {
      notifications: (data ?? []).map((n: any) => ({
        ...n,
        read: !!n.read_at,
      })),
    };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ ids: z.array(z.string().uuid()).optional() })
      .optional()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data?.ids ?? [];

    if (ids.length === 0) {
      // Tout marquer lu.
      const { error } = await (supabaseAdmin as any)
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    const { error } = await (supabaseAdmin as any)
      .from("app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", ids)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ── Push subscriptions (Confiance Mentor, 2026-08-15) ─────────────────────────
// Le client enregistre son endpoint Web Push (PWA) ; le serveur envoie via VAPID
// (push-notifications.ts). Upsert sur endpoint : un même appareil ne crée jamais
// deux lignes.

const SavePushSubscriptionInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().max(300).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => SavePushSubscriptionInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await (supabaseAdmin as any)
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", data.endpoint)
      .maybeSingle();

    if (existing) {
      const { error } = await (supabaseAdmin as any)
        .from("push_subscriptions")
        .update({
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await (supabaseAdmin as any).from("push_subscriptions").insert({
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      });
      if (error) {
        // 23505 = endpoint déjà enregistré par un autre compte/utilisateur — non-fatal.
        if (error.code !== "23505") throw new Error(error.message);
      }
    }
    return { success: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ endpoint: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = (context as any).claims?.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await (supabaseAdmin as any)
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ── Panneau admin des notifications (2026-08-15, backlog) ─────────────────────
// Journal global paginé des app_notifications — la table n'a pas de policy RLS
// (service-role), listMyNotifications est scopé au user courant : il faut une
// fonction admin dédiée pour tout voir. Le journal sert d'audit (bascules de
// statut, séances à valider/contestées, bilans…) et de garde anti-abus.

const ListAppNotificationsInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  /** Filtre par type d'événement (ex. mentor_status_changed). */
  type: z.string().max(80).optional(),
});

export const listAppNotificationsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ListAppNotificationsInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let countQuery = (supabaseAdmin as any)
      .from("app_notifications")
      .select("id", { count: "exact", head: true });
    let rowsQuery = (supabaseAdmin as any)
      .from("app_notifications")
      .select(
        "id, user_id, type, child_profile_id, payload, read_at, created_at, child_profiles(name)",
      )
      .order("created_at", { ascending: false })
      .range((data.page - 1) * data.pageSize, data.page * data.pageSize - 1);
    if (data.type) {
      countQuery = countQuery.eq("type", data.type);
      rowsQuery = rowsQuery.eq("type", data.type);
    }
    const [{ count }, { data: rows, error }] = await Promise.all([countQuery, rowsQuery]);
    if (error) throw new Error(error.message);

    // Résolution ciblée des destinataires : emails parents via parent_profiles
    // (indexée), comptes restants via getUserById bornés (≤ pageSize) — jamais
    // listAllUsers (pattern multicouche V4). Le rôle est dérivé : admin si l'email
    // est dans ADMIN_EMAILS, parent si une ligne parent_profiles existe, sinon
    // mentor (compte sans profil parent — un mentor peut aussi être parent).
    const rawRows = (rows ?? []) as Array<{
      user_id: string;
      id: string;
      type: string;
      child_profile_id: string | null;
      payload: Record<string, unknown>;
      read_at: string | null;
      created_at: string;
      child_profiles?: { name: string } | null;
    }>;
    const userIds = [...new Set<string>(rawRows.map((n) => n.user_id))];
    const emailByUserId = new Map<string, string | null>();
    const parentUserIds = new Set<string>();
    if (userIds.length > 0) {
      const { data: parents } = await supabaseAdmin
        .from("parent_profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      for (const p of parents ?? []) {
        emailByUserId.set(p.user_id, p.email);
        parentUserIds.add(p.user_id);
      }
      const missing = userIds.filter((id) => !emailByUserId.has(id));
      if (missing.length > 0) {
        const resolved = await Promise.all(
          missing.map(async (id) => {
            const { data: u } = await supabaseAdmin.auth.admin
              .getUserById(id)
              .catch(() => ({ data: null }));
            return [id, (u?.user?.email as string | null) ?? null] as const;
          }),
        );
        for (const [id, email] of resolved) emailByUserId.set(id, email);
      }
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    return {
      data: rawRows.map((n) => {
        const email = emailByUserId.get(n.user_id) ?? null;
        const isAdmin = adminEmails.includes((email ?? "").toLowerCase());
        return {
          id: n.id,
          type: n.type,
          child_profile_id: n.child_profile_id,
          child_name: n.child_profiles?.name ?? null,
          user_id: n.user_id,
          recipient_email: email,
          recipient_role: isAdmin ? "admin" : parentUserIds.has(n.user_id) ? "parent" : "mentor",
          payload: n.payload as any,
          read: !!n.read_at,
          created_at: n.created_at as string,
        };
      }),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / data.pageSize)),
    };
  });
