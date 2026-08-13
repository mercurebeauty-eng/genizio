// Calibration du temps par les observations (chantier 4, spec NAYA V4 — analyse §5
// suite). `time_pressure` devient un paramètre APPRIS, jamais imposé :
//
//   N répétitions de TIME_OVER dans un même domaine → PROPOSITION de passage en
//   mode `gentle` (temps ×1,5) — jamais automatique : le parent valide
//   (applyGentleTimeProposal), l'admin surmodule déjà via l'onglet Profils
//   (setChildTimePressureAdmin). Le rejet d'une proposition est mémorisé côté
//   client (localStorage, pattern dismissDiscovery) — pas de colonne pour un
//   simple « ne re-propose pas ça ».
//
// Contrat : les événements TIME_OVER sont déjà écrits par recordChallengeTimeOver
// (payload { challenge_id, domain, title, time_limit_minutes }).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Nombre de dépassements dans un même domaine (sur la fenêtre) pour proposer. */
export const GENTLE_SUGGESTION_THRESHOLD = 3;
/** Fenêtre d'observation des dépassements (jours). */
export const GENTLE_SUGGESTION_WINDOW_DAYS = 30;

export interface TimeOverSignal {
  domain: string | null;
  occurredAt: string;
}

export interface GentleSuggestion {
  suggested: boolean;
  /** Domaines où le seuil est atteint (affichés au parent, jamais chiffrés ailleurs). */
  domains: string[];
}

/**
 * Fonction pure (0 IA, testable sans base) : la suggestion n'est proposée que si
 * le mode actuel est `standard` ET qu'au moins un domaine atteint le seuil de
 * dépassements sur la fenêtre glissante. `gentle`/`none` → jamais de suggestion.
 */
export function suggestTimePressureChange(
  events: TimeOverSignal[],
  current: "standard" | "gentle" | "none"
): GentleSuggestion {
  if (current !== "standard") return { suggested: false, domains: [] };

  const cutoffMs = Date.now() - GENTLE_SUGGESTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const e of events) {
    if (new Date(e.occurredAt).getTime() < cutoffMs) continue;
    const domain = e.domain ?? "domaine inconnu";
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }

  const domains = [...counts.entries()]
    .filter(([, n]) => n >= GENTLE_SUGGESTION_THRESHOLD)
    .map(([d]) => d);
  return { suggested: domains.length > 0, domains };
}

const ChildIdInput = z.object({ childId: z.string().uuid() });

/** Lit la proposition (GET) : N TIME_OVER dans un domaine sur 30 jours → suggestion. */
export const getGentleTimeSuggestion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("id, time_pressure")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!child) return { suggested: false, domains: [] };

    const { data: events } = await supabase
      .from("observation_events")
      .select("occurred_at, payload")
      .eq("child_id", data.childId)
      .eq("type", "TIME_OVER")
      .gte(
        "occurred_at",
        new Date(Date.now() - GENTLE_SUGGESTION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("occurred_at", { ascending: false })
      .limit(200);

    return suggestTimePressureChange(
      (events ?? []).map((e) => ({
        domain: (e.payload as { domain?: string | null } | null)?.domain ?? null,
        occurredAt: e.occurred_at,
      })),
      child.time_pressure as "standard" | "gentle" | "none"
    );
  });

/** Validation par le parent (POST) : passage effectif en mode doux. */
export const applyGentleTimeProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("id, access_locked_at, is_active, time_pressure")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!child) throw new Error("Profil enfant introuvable.");
    if (child.access_locked_at) throw new Error("Ce profil est verrouillé.");
    if (child.is_active === false) throw new Error("Ce profil est désactivé par l'administrateur.");
    // Garde (review 2026-08-12, P2) : un profil 'none' (chrono désactivé par l'admin)
    // ne doit pas pouvoir être basculé en mode doux par un simple appel POST — la
    // suggestion n'est proposée qu'en mode 'standard'.
    if (child.time_pressure === "none") {
      throw new Error("Le chrono est désactivé pour ce profil — le mode doux n'est pas applicable.");
    }
    if (child.time_pressure === "gentle") return { ok: true, timePressure: "gentle" as const };

    const { data: updated, error } = await supabase
      .from("child_profiles")
      .update({ time_pressure: "gentle" })
      .eq("id", data.childId)
      .eq("user_id", userId)
      .select("time_pressure")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, timePressure: updated.time_pressure };
  });
