import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRateLimit } from "@/lib/rate-limit.middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const checkUsernameAvailabilityFn = createServerFn({ method: "POST" })
  // Audit sécurité (vague A) : cet endpoint expose l'existence d'un pseudo —
  // sans auth ni rate-limit, un bot pouvait cartographier les enfants par
  // force brute. Il n'est appelé que par un parent connecté (ProfileDialog).
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((username: unknown) => z.string().parse(username))
  .handler(async ({ data: username }) => {
    // Basic validation
    if (!username || username.length < 3 || username.length > 20) {
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return false;
    }

    // Bypasses RLS by calling our security definer function
    const { data, error } = await (supabaseAdmin as any).rpc("check_child_username_available", {
      requested_username: username,
    });

    if (error) {
      console.error("Error checking username availability:", error);
      return false; // Assume unavailable on error for safety
    }

    return data === true;
  });

/**
 * Résolution d'un @pseudo d'équipier (DiscoveryRecordDialog, projet d'équipe).
 * Audit sécurité (vague A) : avant, n'importe qui (sans login) obtenait
 * id + nom + pseudo de TOUT enfant avec une recherche partielle de 2
 * caractères — énumération des profils enfants. Restreint à : utilisateur
 * authentifié + pseudo EXACT (préfixe @ obligatoire, plus de recherche par
 * nom, plus de ilike partiel).
 */
export const searchChildProfilesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((query: unknown) => z.string().parse(query))
  .handler(async ({ data: query }) => {
    const trimmed = (query ?? "").trim();
    // Seul le format @pseudo_exact est servi (l'UI ne construit que ça).
    if (!trimmed.startsWith("@")) return [];
    const username = trimmed.slice(1).toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return [];

    const { data, error } = await supabaseAdmin
      .from("child_profiles")
      .select("id, name, username, avatar_color")
      .eq("username", username)
      .limit(1);
    if (error) {
      console.error("Error searching child profiles:", error);
      return [];
    }
    return data || [];
  });
