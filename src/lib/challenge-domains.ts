// Définition pure des domaines de défis Génizio
// Sans aucune dépendance serveur ni cycle d'importation.

export const DOMAINS = [
  "Sciences",
  "Architecture",
  "Artisanat",
  "Agriculture",
  "Sport",
  "Communication",
  "Entrepreneuriat",
  "Arts",
  "Langues",
  "Tech & IA",
] as const;

export type Domain = (typeof DOMAINS)[number];
