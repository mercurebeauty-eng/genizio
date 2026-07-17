import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  .inputValidator((input: unknown) => ProductInput.parse(input))
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
  .inputValidator((input: unknown) => UpdateProductInput.parse(input))
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
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
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
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
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

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OrderInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.claims.sub;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: child, error: childErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id")
      .eq("id", data.child_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        child_id: data.child_id,
        challenge_id: data.challenge_id || null,
        total_price_xof: data.total_price_xof,
        items: data.items,
        delivery_notes: data.delivery_notes || null,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const listOrdersAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*, child_profiles(name), challenges(title)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const UpdateOrderStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => UpdateOrderStatusInput.parse(input))
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
      { count: totalParents },
      { count: totalChallenges },
      { count: completedChallenges },
      { count: totalOrders },
      { data: allTalents },
      { data: topChallenges },
    ] = await Promise.all([
      supabaseAdmin.from("child_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("child_profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("challenges").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("challenges").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("child_profiles").select("talents"),
      supabaseAdmin
        .from("challenges")
        .select("title, domain, status")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

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

export const listParentsBI = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch all users from Supabase Auth admin API
    const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
    if (usersErr) throw new Error(usersErr.message);

    // 2. Fetch children profile statistics grouped by user_id
    const { data: children, error: childrenErr } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, age, user_id, talents, pdf_unlocked");
    if (childrenErr) throw new Error(childrenErr.message);

    // 3. Fetch challenge statistics grouped by user_id
    const { data: challenges, error: challengesErr } = await supabaseAdmin
      .from("challenges")
      .select("id, status, user_id");
    if (challengesErr) throw new Error(challengesErr.message);

    // 4. Correlate data
    const parents = users.map(user => {
      const parentChildren = children.filter(c => c.user_id === user.id);
      const parentChallenges = challenges.filter(c => c.user_id === user.id);
      const completedChallenges = parentChallenges.filter(c => c.status === "completed");

      return {
        id: user.id,
        email: user.email,
        phone: user.user_metadata?.phone || null,
        createdAt: user.created_at,
        childCount: parentChildren.length,
        childNames: parentChildren.map(c => `${c.name} (${c.age} ans)`).join(", "),
        children: parentChildren.map(c => ({
          id: c.id,
          name: c.name,
          age: c.age,
          pdfUnlocked: c.pdf_unlocked === true
        })),
        challengeCount: parentChallenges.length,
        completedCount: completedChallenges.length,
        extraSlots: (user.app_metadata?.extra_profile_slots as number) ?? 0,
      };
    });

    // Sort parents by creation date (newest first)
    parents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return parents;
  });

export const togglePassportUnlock = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => z.object({
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

export const grantProfileSlot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      delta: z.number().int().min(-10).max(10), // +1 to grant, -1 to revoke
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch current app_metadata
    const { data: user, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (fetchErr) throw new Error(fetchErr.message);

    const current = (user.user.app_metadata?.extra_profile_slots as number) ?? 0;
    const next = Math.max(0, current + data.delta); // never go below 0

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      app_metadata: { extra_profile_slots: next },
    });
    if (updateErr) throw new Error(updateErr.message);

    return { ok: true, extraSlots: next };
  });
