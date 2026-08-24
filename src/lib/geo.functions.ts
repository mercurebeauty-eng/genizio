import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Détection pays/ville par IP (2026-07-29, demande utilisateur) : pré-remplit
// Ville/Pays à la création d'un profil enfant sans demander de permission de
// géolocalisation précise au navigateur — sensible sur une app pour enfants, alors
// qu'un simple code pays côté serveur (fourni gratuitement par Vercel, aucune
// dépendance tierce) suffit à l'usage réel (juste situer les défis dans le bon
// quartier). Le parent reste libre de corriger/effacer avant d'enregistrer.
//
// Mappe le code ISO 3166-1 vers le libellé français déjà utilisé dans les profils
// (texte libre) — limité aux marchés réels de Génizio et quelques voisins courants ;
// un code non répertorié laisse simplement le champ pays vide plutôt que d'afficher
// un code brut à deux lettres.
const COUNTRY_LABELS_FR: Record<string, string> = {
  CI: "Côte d'Ivoire",
  SN: "Sénégal",
  FR: "France",
  ML: "Mali",
  BF: "Burkina Faso",
  TG: "Togo",
  BJ: "Bénin",
  CM: "Cameroun",
  GN: "Guinée",
  CD: "République démocratique du Congo",
  CG: "Congo",
  NE: "Niger",
  MG: "Madagascar",
  CA: "Canada",
  BE: "Belgique",
  CH: "Suisse",
  MA: "Maroc",
  TN: "Tunisie",
  DZ: "Algérie",
  GB: "Royaume-Uni",
  US: "États-Unis",
};

export const getGeoHint = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const countryCode = request?.headers.get("x-vercel-ip-country") ?? null;
  const cityRaw = request?.headers.get("x-vercel-ip-city") ?? null;

  return {
    country: countryCode ? (COUNTRY_LABELS_FR[countryCode] ?? null) : null,
    city: cityRaw ? decodeURIComponent(cityRaw) : null,
  };
});
