// CRUD admin des matériaux locaux par pays (table country_materials) — la source
// des instructions de contextualisation locale injectées dans les prompts de Naya.
// Édition via l'onglet Naya de l'Admin OS (section « Contextualisation locale »).
//
// Le writer est le service role uniquement (RLS : SELECT authenticated, aucune
// policy d'écriture) ; la clé country_key est TOUJOURS dérivée côté serveur via
// normalizeCountryKey — jamais soumise par le client.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { normalizeCountryKey } from "@/lib/contextualization";

export interface CountryMaterialRow {
  countryKey: string;
  countryLabel: string;
  materials: string[];
  updatedAt: string | null;
}

export const getCountryMaterialsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ rows: CountryMaterialRow[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("country_materials")
      .select("country_key, country_label, materials, updated_at")
      .order("country_label", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      rows: (data ?? []).map((r) => ({
        countryKey: r.country_key,
        countryLabel: r.country_label,
        materials: r.materials ?? [],
        updatedAt: r.updated_at ?? null,
      })),
    };
  });

const UpsertCountryMaterialInput = z.object({
  /** Libellé lisible (ex: "Côte d'Ivoire") — la clé en est dérivée côté serveur. */
  countryLabel: z.string().trim().min(2).max(80),
  materials: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
  /** Clé existante lors d'une édition (permet le renommage : l'ancienne clé est
   *  supprimée si la normalisation du nouveau label en diffère). */
  originalKey: z.string().trim().min(1).max(80).optional(),
});

export const upsertCountryMaterialAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => UpsertCountryMaterialInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const countryKey = normalizeCountryKey(data.countryLabel);
    if (!countryKey) throw new Error("Libellé de pays invalide");

    // Déduplication + espaces normalisés — les matériaux arrivent en chips UI.
    const materials = [
      ...new Set(
        data.materials.map((m) => m.replace(/\s+/g, " ").trim()).filter((m) => m.length > 0),
      ),
    ];
    if (materials.length === 0) throw new Error("Au moins un matériau est requis");

    const { error } = await supabaseAdmin.from("country_materials").upsert(
      {
        country_key: countryKey,
        country_label: data.countryLabel,
        materials,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "country_key" },
    );
    if (error) throw new Error(error.message);

    // Renommage dont la clé normalisée change : l'ancienne ligne est retirée.
    if (data.originalKey && data.originalKey !== countryKey) {
      await supabaseAdmin.from("country_materials").delete().eq("country_key", data.originalKey);
    }

    return { ok: true, countryKey };
  });

const DeleteCountryMaterialInput = z.object({
  countryKey: z.string().trim().min(1).max(80),
});

export const deleteCountryMaterialAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: unknown) => DeleteCountryMaterialInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("country_materials")
      .delete()
      .eq("country_key", data.countryKey);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
