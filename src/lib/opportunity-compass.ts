// "Boussole d'Opportunités" — V3 du chantier "orientation fine" (2026-07-22, cf.
// genizio-decisions #40). Séparée volontairement du Profil d'Aptitudes (la carte des talents,
// les sous-formes agrégées : le signal mesuré, propriété durable de Génizio) : ceci est une
// COUCHE D'INTERPRÉTATION — "selon notre compréhension actuelle du monde, voici où ce profil
// pourrait s'exprimer" — datée, non permanente, à réviser. Ne jamais présenter ce contenu comme
// une prédiction fiable ou une orientation définitive : les données de l'app (défis à domicile,
// sans vidéo ni capteurs) ne permettent structurellement pas de trancher entre disciplines
// précises avec certitude (cf. discussion produit du 2026-07-22 — comparer à aiScout, qui lui
// s'appuie sur de la vision par ordinateur sur des tests physiques standardisés).
//
// Gating : affichée uniquement à partir de 12 ans (décision utilisateur explicite, 2026-07-22)
// — avant cet âge, seul le Profil d'Aptitudes est montré, pour ne pas rétrécir prématurément le
// champ des possibles d'un jeune enfant.
//
// Révision prévue : même cadence que le référentiel académique (semestrielle, décision #39).

export const OPPORTUNITY_COMPASS_VERSION = "Vision 2026";
export const OPPORTUNITY_COMPASS_DISCLAIMER =
  "À réviser chaque semestre — ne remplace pas un vrai bilan professionnel (sportif, académique ou professionnel).";
export const OPPORTUNITY_COMPASS_MIN_AGE = 12;

export const CORPORELLE_SUBFORM_OPPORTUNITIES: Record<string, string[]> = {
  endurance: ["Athlétisme (fond/demi-fond)", "Football", "Natation", "Cyclisme"],
  explosivite: ["Basketball", "Athlétisme (sprint/saut)", "Volleyball", "Sports de combat"],
  coordination_fine: ["Tennis de table", "Escrime", "Arts martiaux techniques", "Métiers manuels de précision"],
  coordination_collective: ["Handball", "Football", "Basketball", "Rugby"],
  precision: ["Tir à l'arc", "Golf", "Pétanque", "Gymnastique"],
};
