// Superviseur Copilote (décision #74) — notifications parent (canal cross-appareil minimal).
//
// Le parent PULL ses notifications à l'ouverture (badge + liste légère) et les marque
// lues. Écriture par les server functions (supervisor-operator, supervisor-reports) via
// notifyUser (app-notifications.ts). Pas de push — le veto parent reste « éclairé à la
// prochaine visite », le bandeau Mode accompagnement + Réouvrir complètent le dispositif.

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
