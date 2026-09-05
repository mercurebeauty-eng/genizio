// Chargement des matériaux locaux par pays depuis la table `country_materials`
// (source de vérité éditable — Admin OS onglet Naya / Supabase Studio).
//
// Résilience non négociable : toute erreur ou absence (table vide, pays inconnu,
// DB injoignable) retombe sur les constantes de contextualization.ts — la
// génération de défis ne dépend jamais de la disponibilité de cette table.

import {
  GENERIC_LOCAL_MATERIALS,
  localMaterialsForCountry,
  normalizeCountryKey,
} from "./contextualization";

/** Matériaux locaux d'un pays, lus en base ; repli constantes si absent/erreur. */
export async function loadLocalMaterialsForCountry(
  db: any,
  country: string | null | undefined,
): Promise<string[]> {
  if (!country) return GENERIC_LOCAL_MATERIALS;
  try {
    const { data, error } = await db
      .from("country_materials")
      .select("materials")
      .eq("country_key", normalizeCountryKey(country))
      .maybeSingle();
    if (!error && data?.materials?.length) return data.materials as string[];
  } catch {
    // repli ci-dessous
  }
  return localMaterialsForCountry(country);
}
