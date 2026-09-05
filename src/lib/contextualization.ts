// Double contextualisation local → global (chantier 6, spec NAYA V4 — analyse §30-31) :
// le défi part des matériaux et réalités LOCAUX du pays, puis escalier vers outils
// technologiques simples et standards internationaux — **jamais d'enfermement dans
// l'environnement immédiat** (le local est le point de départ, jamais le plafond).
//
// Source de vérité : la table `country_materials` (éditable via l'Admin OS — onglet
// Naya — ou Supabase Studio, chargée par loadLocalMaterialsForCountry dans
// country-materials.ts). Les constantes ci-dessous ne servent plus qu'au REPLI de
// résilience : pays inconnu de la table ou erreur DB — le prompt ne doit jamais
// casser. Le seed SQL de la table reproduit fidèlement ces données.

/** Matériaux locaux typiques par pays (clés normalisées sans accents ni articles).
 *  REPLI de résilience uniquement — la source de vérité est la table
 *  `country_materials` (seed identique, éditable sans déploiement). */
const LOCAL_MATERIALS_BY_COUNTRY: Record<string, string[]> = {
  "cote ivoire": [
    "bois local (iroko, sipo)",
    "bambou",
    "argile",
    "raffia",
    "coques de cacao",
    "matériaux recyclés",
  ],
  senegal: ["bois local", "argile", "coquillages", "textile (pagne)", "matériaux recyclés"],
  cameroun: ["bambou", "bois (ayous, ébène)", "raphia", "argile", "matériaux recyclés"],
  mali: ["argile (banco)", "bois", "coton", "cuir", "matériaux recyclés"],
  "burkina faso": ["argile", "bois", "coton", "matériaux recyclés"],
  niger: ["argile", "bois", "cuir", "matériaux recyclés"],
  togo: ["bois", "argile", "textile (pagne)", "matériaux recyclés"],
  benin: ["bois", "argile", "bambou", "textile", "matériaux recyclés"],
  guinee: ["bambou", "bois", "argile", "palmier", "matériaux recyclés"],
  gabon: ["bois (okoumé)", "bambou", "raphia", "matériaux recyclés"],
  congo: ["bois", "bambou", "argile", "raphia", "matériaux recyclés"],
  tchad: ["argile", "bois", "cuir", "matériaux recyclés"],
  madagascar: ["bois", "bambou", "raphia", "matériaux recyclés"],
  france: [
    "carton",
    "bois",
    "bouteilles plastique",
    "textile recyclé",
    "matériaux de récupération",
  ],
};

/** Repli pour tout pays non listé dans la table `country_materials` (laquelle est le
 *  registre officiel des pays supportés et alimente aussi le sélecteur de pays du
 *  formulaire de profil) : matériaux réellement accessibles partout — marché, maison,
 *  nature — en Afrique francophone comme en diaspora. Jamais un vide (le prompt ne
 *  doit jamais casser). */
export const GENERIC_LOCAL_MATERIALS = [
  "bambou",
  "bois local",
  "argile",
  "calebasses",
  "carton",
  "sable",
  "pierres",
  "ficelle et corde",
  "bouteilles plastique",
  "textile",
  "boîtes métalliques",
  "matériaux recyclés",
];

/** Normalise un nom de pays : minuscules, sans accents, sans articles/qualificatifs. */
export function normalizeCountryKey(country: string): string {
  const accents: Record<string, string> = {
    à: "a",
    â: "a",
    é: "e",
    è: "e",
    ê: "e",
    ë: "e",
    î: "i",
    ï: "i",
    ô: "o",
    ù: "u",
    û: "u",
    ü: "u",
    ç: "c",
    ñ: "n",
  };
  return country
    .toLowerCase()
    .split("")
    .map((ch) => accents[ch] ?? ch)
    .join("")
    .replace(/['`]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w &&
        ![
          "le",
          "la",
          "les",
          "du",
          "de",
          "des",
          "d",
          "l",
          "et",
          "republique",
          "democratique",
          "rd",
          "rca",
        ].includes(w),
    )
    .join(" ");
}

/** Matériaux locaux d'un pays (0 IA) — repli générique si inconnu. */
export function localMaterialsForCountry(country: string | null | undefined): string[] {
  if (!country) return GENERIC_LOCAL_MATERIALS;
  return LOCAL_MATERIALS_BY_COUNTRY[normalizeCountryKey(country)] ?? GENERIC_LOCAL_MATERIALS;
}

/**
 * Instruction de double contextualisation injectée dans les prompts de génération.
 * `location` est la chaîne « Ville, Pays » ou « non précisé » — le pays en est
 * extrait (dernier segment). `localMaterials` est fourni par l'appelant depuis la
 * table `country_materials` (loadLocalMaterialsForCountry) ; sans lui, repli sur
 * les constantes ci-dessus. L'escalier local → technologique → monde est la règle,
 * l'interdiction d'enfermement est non-négociable.
 */
export function buildContextualizationInstruction(
  location: string | null | undefined,
  localMaterials?: string[],
): string {
  const country = location?.split(",").pop()?.trim() || null;
  const materials = (localMaterials ?? localMaterialsForCountry(country)).join(", ");
  return `DOUBLE CONTEXTUALISATION (local → global) : pars des matériaux et réalités du pays (${materials}, marchés, quartier) puis suis l'ESCALIER : (1) ancrage local concret avec ces matériaux → (2) un outil ou mécanisme technologique simple (levier, poulie, boussole, circuit électrique de base…) → (3) une ouverture vers le monde (outil numérique, standard international, exemple d'un autre pays). Ne JAMAIS enfermer l'enfant dans son environnement immédiat : le local est le point de départ, jamais le plafond. Le contenu académique reste calibré sur les standards internationaux (référentiel).`;
}
