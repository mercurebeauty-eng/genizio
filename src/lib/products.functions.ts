import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listAllUsers } from "@/integrations/supabase/admin-users";
import { z } from "zod";

export const listProductsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const ProductInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  price_xof: z.number().int().min(0),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  material_tags: z.array(z.string()),
  is_active: z.boolean().default(true),
  fromSuggestionId: z.string().uuid().optional(),
});

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => ProductInput.parse(input))
  .handler(async ({ data }) => {
    const { fromSuggestionId, ...productData } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .insert(productData)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (fromSuggestionId) {
      await supabaseAdmin
        .from("material_suggestions")
        .update({ status: "catalogued", product_id: row.id })
        .eq("id", fromSuggestionId);
    }

    return row;
  });

const UpdateProductInput = ProductInput.omit({ fromSuggestionId: true }).partial().extend({ id: z.string().uuid() });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UpdateProductInput.parse(input))
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMaterialSuggestions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("material_suggestions")
      .select("*")
      .eq("status", "new")
      .order("seen_count", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const ignoreMaterialSuggestion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("material_suggestions")
      .update({ status: "ignored" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const OrderInput = z.object({
  child_id: z.string().uuid(),
  challenge_id: z.string().uuid().nullable().optional(),
  total_price_xof: z.number().int().min(0),
  items: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string(),
      price_xof: z.number().int().min(0),
    })
  ),
  delivery_notes: z.string().optional().nullable(),
});

const UpdateOrderStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UpdateOrderStatusInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getEcosystemStats = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { count: totalChildren },
      allUsers,
      { count: totalChallenges },
      { count: completedChallenges },
      { count: totalOrders },
      { data: allTalents },
      { data: topChallenges },
    ] = await Promise.all([
      supabaseAdmin.from("child_profiles").select("*", { count: "exact", head: true }),
      listAllUsers(supabaseAdmin),
      supabaseAdmin.from("challenges").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabaseAdmin.from("challenges").select("*", { count: "exact", head: true }).eq("status", "completed").is("deleted_at", null),
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("child_profiles").select("talents"),
      supabaseAdmin
        .from("challenges")
        .select("title, domain, status")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const totalParents = allUsers.length;

    // Aggrégation des talents pour la répartition des Guildes
    // On compte les scores de talents par domaine à travers tous les enfants
    const talentTotals: Record<string, number> = {};
    for (const row of allTalents ?? []) {
      const t = row.talents as Record<string, number> | null;
      if (!t) continue;
      for (const [key, val] of Object.entries(t)) {
        talentTotals[key] = (talentTotals[key] ?? 0) + (val as number);
      }
    }

    // Top domaines de défis
    const domainCount: Record<string, number> = {};
    for (const c of topChallenges ?? []) {
      domainCount[c.domain] = (domainCount[c.domain] ?? 0) + 1;
    }
    const topDomains = Object.entries(domainCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([domain, count]) => ({ domain, count }));

    return {
      totalChildren: totalChildren ?? 0,
      totalParents: totalParents ?? 0,
      totalChallenges: totalChallenges ?? 0,
      completedChallenges: completedChallenges ?? 0,
      totalOrders: totalOrders ?? 0,
      talentTotals,
      topDomains,
    };
  });

export const togglePassportUnlock = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => z.object({
    childId: z.string().uuid(),
    unlock: z.boolean(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updateErr } = await supabaseAdmin
      .from("child_profiles")
      .update({ pdf_unlocked: data.unlock })
      .eq("id", data.childId);
    if (updateErr) throw new Error(updateErr.message);

    return { ok: true, unlocked: data.unlock };
  });

// Reconstruit (2026-08-03) puis UNIFIÉ (2026-08-14) — une seule clé quota_override =
// quota TOTAL de profils accordé au compte (0 = règle standard automatique : plancher
// grand-péré/neuf + couverture famille → 5). Remplaçant de l'ancienne
// updateExtraProfileSlotsAdmin (qui écrivait extra_profile_slots, désormais inerte).
// Mirroir de updateCampaignExtraQuotaAdmin (campaigns.functions.ts), même mécanique
// manuelle : l'admin ajuste ce chiffre après avoir confirmé le paiement WhatsApp/Mobile
// Money hors-app, ou pour accorder un « quota + » à un compte.
export const updateProfileQuotaAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        // 0 = règle standard automatique (la clé est retirée) ; > 0 = quota TOTAL accordé.
        quota: z.number().int().min(0).max(50),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lecture avant écriture plutôt qu'un objet partiel : app_metadata peut contenir d'autres
    // clés posées par GoTrue (provider/providers d'un compte Google) qu'il ne faut pas écraser.
    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (getErr || !userRes?.user) {
      throw new Error(`Utilisateur introuvable: ${getErr?.message ?? data.userId}`);
    }

    const metadata = { ...(userRes.user.app_metadata ?? {}) };
    if (data.quota > 0) {
      metadata.quota_override = data.quota;
    } else {
      delete metadata.quota_override; // retour au mode auto
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      app_metadata: metadata,
    });
    if (updateErr) throw new Error(`Erreur lors de la mise à jour du quota: ${updateErr.message}`);

    return { success: true, userId: data.userId, quota: data.quota };
  });

