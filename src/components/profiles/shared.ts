import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";

// Centres d'intérêt organisés par clé de talent Gardner (les mêmes 9 clés que
// child_profiles.talents et TALENT_KEY_LABELS dans talent-buckets.ts) plutôt
// qu'une liste plate sans lien avec le reste de l'app. Chaque tag reste une
// formulation concrète et reconnaissable par un parent — pas le nom brut de
// l'intelligence — pour que le choix serve à la fois de signal de contexte
// pour la génération IA et de reflet direct du potentiel déjà suivi ailleurs
// (carte des talents, domaines de défis, Guildes). Le label vient directement
// de TALENT_KEY_LABELS pour ne plus être retapé à la main en parallèle.
export const INTERESTS_BY_TALENT: Record<string, { label: string; tags: readonly string[] }> = {
  spatial: {
    label: TALENT_KEY_LABELS.spatial,
    tags: ["Construction & Lego", "Dessin & Design", "Puzzles & Cartes", "Orientation & Exploration"],
  },
  corporelle: {
    label: TALENT_KEY_LABELS.corporelle,
    tags: ["Sport & Mouvement", "Danse", "Théâtre & Mime", "Bricolage manuel"],
  },
  sociale: {
    label: TALENT_KEY_LABELS.sociale,
    tags: ["Aime jouer en groupe", "Leadership naturel", "Aide les autres", "Sens de la négociation"],
  },
  entrepreneuriale: {
    label: TALENT_KEY_LABELS.entrepreneuriale,
    tags: ["A des idées de projets", "Aime vendre / échanger", "Aime organiser des choses", "Curieux du commerce"],
  },
  creative: {
    label: TALENT_KEY_LABELS.creative,
    tags: ["Dessin & Peinture", "Musique", "Invente des histoires", "Bricolage créatif"],
  },
  artisanale: {
    label: TALENT_KEY_LABELS.artisanale,
    tags: ["Cuisine", "Couture & Tissage", "Répare des objets", "Travaux manuels"],
  },
  emotionnelle: {
    label: TALENT_KEY_LABELS.emotionnelle,
    tags: ["Empathique", "Comprend ses émotions", "Attentif aux autres", "Calme sous pression"],
  },
  logico_mathematique: {
    label: TALENT_KEY_LABELS.logico_mathematique,
    tags: ["Aime les chiffres", "Résout des énigmes", "Sciences & Expériences", "Jeux de stratégie"],
  },
  linguistique: {
    label: TALENT_KEY_LABELS.linguistique,
    tags: ["Aime parler & raconter", "Prise de parole en public", "Aime lire", "Écriture & Poésie"],
  },
};

export const ALL_INTERESTS = Object.values(INTERESTS_BY_TALENT).flatMap((g) => g.tags);

export const AVATAR_COLORS = [
  { key: "brand", cls: "bg-brand" },
  { key: "leaf", cls: "bg-leaf" },
  { key: "sky", cls: "bg-sky" },
  { key: "ink", cls: "bg-ink" },
] as const;

export type ChildProfile = {
  id: string;
  user_id: string;
  name: string;
  age: number;
  interests: string[];
  city: string | null;
  country: string | null;
  avatar_color: string;
  favorite_challenges: string[];
  completed_challenges: string[];
  talents: Record<string, number>;
  pdf_unlocked: boolean;
};

export type ProfileDraft = Omit<
  ChildProfile,
  "id" | "user_id" | "favorite_challenges" | "completed_challenges" | "talents" | "pdf_unlocked"
>;

export const emptyProfileDraft = (): ProfileDraft => ({
  name: "",
  age: 10,
  interests: [],
  city: "",
  country: "",
  avatar_color: "brand",
});
