export const ALL_INTERESTS = [
  "Nature",
  "Machines",
  "Dessin",
  "Espace",
  "Sport",
  "Musique",
  "Cuisine",
  "Animaux",
  "Construction",
  "Langues",
] as const;

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
};

export type ProfileDraft = Omit<
  ChildProfile,
  "id" | "user_id" | "favorite_challenges" | "completed_challenges" | "talents"
>;

export const emptyProfileDraft = (): ProfileDraft => ({
  name: "",
  age: 10,
  interests: [],
  city: "",
  country: "",
  avatar_color: "brand",
});
