// Lien déclaré par l'adulte à l'inscription (2026-07-30, cf. discussion produit) — sert
// d'abord à débloquer un quota d'enfants élevé pour les comptes "educateur" vouchés par une
// organisation via une campagne (jamais par la seule auto-déclaration). Le prénom de l'enfant
// reste le mécanisme principal pour éviter "votre enfant" dans les textes — ce type n'entraîne
// volontairement pas de refonte de copy à grande échelle.
export const RELATIONSHIP_TYPES = [
  { value: "parent", label: "Parent" },
  { value: "tuteur", label: "Tuteur / Tutrice légal(e)" },
  { value: "grand_parent", label: "Grand-parent" },
  { value: "oncle_tante", label: "Oncle / Tante" },
  { value: "educateur", label: "Éducateur / Éducatrice (structure d'accueil)" },
  { value: "autre", label: "Autre proche" },
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]["value"];
