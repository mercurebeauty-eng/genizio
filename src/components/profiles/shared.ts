import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import type { AbilityValue, Aspiration, LearningProfile } from "@/lib/profile-context";
import type { TimePressure } from "@/lib/time-limit";

// Centres d'intérêt organisés par clé de talent Gardner (les mêmes 9 clés que
// child_profiles.talents et TALENT_KEY_LABELS dans talent-buckets.ts) plutôt
// qu'une liste plate sans lien avec le reste de l'app. Chaque tag reste une
// formulation concrète et reconnaissable par un parent — pas le nom brut de
// l'intelligence — pour que le choix serve à la fois de signal de contexte
// pour la génération IA et de reflet direct du potentiel déjà suivi ailleurs
// (carte des talents, domaines de défis, Guildes). Le label vient directement
// de TALENT_KEY_LABELS pour ne plus être retapé à la main en parallèle.
//
// Dédoublonné le 2026-07-20 (cf. genizio-decisions #24) : la contrainte "4 tags
// par groupe" forçait des quasi-synonymes déroutants pour le parent. Retirés —
// "Dessin & Design" (doublon de "Dessin & Peinture"), "Bricolage manuel" +
// "Bricolage créatif" + "Travaux manuels" (le côté fabrication-à-la-main reste
// couvert par Cuisine/Couture/Répare des objets sous Artisanale), et "Attentif
// aux autres" (doublon d'"Empathique" DANS le même groupe). Les groupes ont
// désormais 3 ou 4 tags, tous distincts. Signal doux (n'alimente pas la carte
// des talents) : les anciens tags encore stockés sur des profils existants
// restent du texte libre inoffensif, pas de migration de données.
//
// Diversifié le 2026-07-20 (cf. genizio-decisions #24) : deux domaines entiers de
// génération de défis (DOMAINS dans challenges.functions.ts : "Agriculture",
// "Tech & IA" — et la vision produit qui les cite explicitement) n'avaient AUCUN
// tag correspondant, alors que 7 des 10 domaines en avaient un. "Nature & Animaux"
// (logico_mathematique — curiosité scientifique envers le vivant) et "Robotique &
// Programmation" (spatial — construction/assemblage) comblent ces deux trous.
export const INTERESTS_BY_TALENT: Record<string, { label: string; tags: readonly string[] }> = {
  spatial: {
    label: TALENT_KEY_LABELS.spatial,
    tags: [
      "Démonte pour comprendre",
      "Remarque les petits détails visuels",
      "Aime assembler et construire",
      "S'oriente facilement dans l'espace",
    ],
  },
  corporelle: {
    label: TALENT_KEY_LABELS.corporelle,
    tags: [
      "A besoin de bouger pour réfléchir",
      "Touche tout ce qu'il voit",
      "Apprend en imitant les gestes",
    ],
  },
  sociale: {
    label: TALENT_KEY_LABELS.sociale,
    tags: [
      "Joue souvent le médiateur",
      "Comprend vite les règles du groupe",
      "Aime organiser les autres",
    ],
  },
  entrepreneuriale: {
    label: TALENT_KEY_LABELS.entrepreneuriale,
    tags: [
      "Invente ses propres règles de jeu",
      "Négocie toujours (même le coucher)",
      "Cherche à optimiser ou marchander",
    ],
  },
  creative: {
    label: TALENT_KEY_LABELS.creative,
    tags: [
      "Détourne les objets de leur usage",
      "A un imaginaire débordant",
      "Préfère inventer que suivre la notice",
    ],
  },
  artisanale: {
    label: TALENT_KEY_LABELS.artisanale,
    tags: [
      "Préfère faire de ses propres mains",
      "Aime les résultats concrets et finis",
      "S'applique sur les tâches minutieuses",
    ],
  },
  emotionnelle: {
    label: TALENT_KEY_LABELS.emotionnelle,
    tags: [
      "Ressent intensément l'humeur ambiante",
      "A besoin de solitude pour se recharger",
      "Très sensible à l'injustice",
    ],
  },
  logico_mathematique: {
    label: TALENT_KEY_LABELS.logico_mathematique,
    tags: [
      "Pose sans arrêt la question 'Pourquoi ?'",
      "Aime classer, trier et mesurer",
      "Cherche la logique cachée des choses",
      "Fasciné par le lien cause/effet",
    ],
  },
  linguistique: {
    label: TALENT_KEY_LABELS.linguistique,
    tags: [
      "Retient très facilement les histoires",
      "Joue avec les mots et les sons",
      "Argumente pour défendre ses idées",
    ],
  },
};

export const AVATAR_COLORS = [
  { key: "brand", cls: "bg-brand", bg: "bg-brand", text: "text-white" },
  { key: "leaf", cls: "bg-leaf", bg: "bg-leaf", text: "text-white" },
  { key: "sky", cls: "bg-sky", bg: "bg-sky", text: "text-ink" },
  { key: "ink", cls: "bg-ink", bg: "bg-ink", text: "text-white" },
] as const;

export type ChildProfile = {
  id: string;
  user_id: string;
  username: string;
  name: string;
  age: number;
  birthdate: string | null;
  interests: string[];
  city: string | null;
  country: string | null;
  avatar_color: string;
  favorite_challenges: string[];
  completed_challenges: string[];
  talents: Record<string, number>;
  pdf_unlocked: boolean;
  xp: number;
  streak: number;
  last_activity_date: string | null;
  access_locked_at: string | null;
  // Profil multidimensionnel (2026-08-12, chantier « porte d'entrée ») — tout est
  // optionnel et déclaré par le parent ; les CHECKs en base bornent le vocabulaire.
  school_level: string | null;
  languages: string[];
  ability_profile: Record<string, AbilityValue>;
  school_relation: string | null;
  life_context: string[];
  aspirations: Aspiration[];
  learning_profile?: LearningProfile;
  time_pressure: TimePressure;
  is_active: boolean;
};

export type ProfileDraft = Omit<
  ChildProfile,
  | "id"
  | "user_id"
  | "favorite_challenges"
  | "completed_challenges"
  | "talents"
  | "pdf_unlocked"
  | "access_locked_at"
>;

export const emptyProfileDraft = (): ProfileDraft => ({
  username: "",
  name: "",
  age: 10,
  birthdate: null,
  interests: [],
  city: "",
  country: "",
  avatar_color: "brand",
  xp: 0,
  streak: 0,
  last_activity_date: null,
  school_level: null,
  languages: [],
  ability_profile: {},
  school_relation: null,
  life_context: [],
  aspirations: [],
  learning_profile: {},
  time_pressure: "standard",
  is_active: true,
});
