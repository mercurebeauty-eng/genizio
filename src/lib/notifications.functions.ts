// Mentor Copilote (décision #74) — notifications (canal in-app pull).
//
// Le parent PULL ses notifications à l'ouverture (badge + liste légère) et les marque
// lues. Depuis Confiance Mentor (2026-08-15), le push (Web Push VAPID) et l'email
// (Brevo) complètent le canal in-app : notifyUser (app-notifications.ts) orchestre
// les trois canaux. Ici : la gestion des push_subscriptions côté client.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
