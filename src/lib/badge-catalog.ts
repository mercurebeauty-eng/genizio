// Catalogue des badges (audit UI V3.1) — module PUR séparé de
// challenges.functions.ts (serveur uniquement) : PassportPdf côté client
// l'importait et tirait tout le moteur serveur dans le bundle.
export const BADGE_CATALOG: Record<string, { title: string; description: string }> = {
  Sciences: {
    title: "Scientifique en herbe",
    description:
      "Tu as mené 3 expériences. Tu observes, tu questionnes, tu comprends le monde qui t'entoure.",
  },
  Architecture: {
    title: "Bâtisseur·se en herbe",
    description:
      "Tu as terminé 3 défis de construction. Tu penses déjà comme quelqu'un qui bâtit des choses solides.",
  },
  Artisanat: {
    title: "Artisan·e en herbe",
    description:
      "Tu as fabriqué 3 objets de tes propres mains. Le geste précis devient une seconde nature.",
  },
  Agriculture: {
    title: "Cultivateur·rice en herbe",
    description:
      "Tu as mené 3 défis liés à la nature et au vivant. Tu sais prendre soin de ce qui pousse.",
  },
  Sport: {
    title: "Athlète en herbe",
    description: "Tu as relevé 3 défis physiques. Ton corps devient un allié de plus en plus sûr.",
  },
  Communication: {
    title: "Orateur·rice en herbe",
    description: "Tu as réussi 3 défis de communication. Tes mots portent de plus en plus loin.",
  },
  Entrepreneuriat: {
    title: "Entrepreneur·se en herbe",
    description:
      "Tu as mené 3 projets à la manière d'un vrai petit commerce. Tu sais transformer une idée en réalité.",
  },
  Arts: {
    title: "Artiste en herbe",
    description: "Tu as créé 3 œuvres. Ton regard sur le monde devient de plus en plus unique.",
  },
  Langues: {
    title: "Linguiste en herbe",
    description:
      "Tu as relevé 3 défis de langue et d'écriture. Les mots deviennent un vrai terrain de jeu.",
  },
  "Tech & IA": {
    title: "Ingénieur·e numérique en herbe",
    description:
      "Tu as relevé 3 défis de logique et de technologie. Tu commences à penser comme la machine — puis mieux qu'elle.",
  },
};

