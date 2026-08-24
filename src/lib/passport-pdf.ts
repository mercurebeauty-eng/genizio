// ────────────────────────────────────────────────────────────
// GÉNIZIO — Export PDF du Passeport d'Excellence (@react-pdf/renderer)
//
// Enregistrement des polices + constantes partagées avec le composant
// PassportPdf. Les fichiers sont servis depuis /public/fonts (voir note
// dans PassportPdf.tsx) : Fredoka pour les titres (police d'affichage de
// la marque), Inter pour le corps de texte.
// ────────────────────────────────────────────────────────────
import { Font } from "@react-pdf/renderer";

export const PASSPORT_FONT_DISPLAY = "Fredoka";
export const PASSPORT_FONT_BODY = "Inter";

// Les registrations sont idempotentes : ce module peut être importé plusieurs
// fois (route + composant) sans dupliquer les polices.
//
// En Node (tests, SSR), on ne s'enregistre pas : les chemins /fonts/… sont
// réservés au navigateur (fetch). Les tests injectent leurs propres sources en
// data-URI avant de rendre le document — c'est la seule registration en jeu.
export function registerPassportFonts() {
  if (typeof window === "undefined") return;

  Font.register({
    family: PASSPORT_FONT_DISPLAY,
    fonts: [
      { src: "/fonts/Fredoka-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/Fredoka-Medium.ttf", fontWeight: 500 },
      { src: "/fonts/Fredoka-SemiBold.ttf", fontWeight: 600 },
      { src: "/fonts/Fredoka-Bold.ttf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: PASSPORT_FONT_BODY,
    fonts: [
      { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/Inter-Medium.ttf", fontWeight: 500 },
      { src: "/fonts/Inter-SemiBold.ttf", fontWeight: 600 },
      { src: "/fonts/Inter-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
      { src: "/fonts/Inter-SemiBoldItalic.ttf", fontWeight: 600, fontStyle: "italic" },
    ],
  });
}

// Palette hex du design system Génizio (conversion OKLCH → sRGB, cf. tokens
// dans src/styles.css). react-pdf ne gère pas l'OKLCH : on passe par des hex.
export const PDF_COLORS = {
  brand: "#bb4717",
  brandDark: "#923002",
  brandGlow: "#f7a062",
  ink: "#07121e",
  inkSoft: "#3a4756",
  inkMuted: "#5b6b7b",
  leaf: "#17843f",
  leafDark: "#005820",
  skyDark: "#005477",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  emerald: "#059669",
  emeraldSoft: "#ecfdf5",
  purple: "#9333ea",
  purpleSoft: "#f5f3ff",
  skySoft: "#eef6ff",
  surface: "#fcf8f1",
  white: "#ffffff",
  divider: "#07121e",
  dividerSoft: "#d9dee4",
} as const;

// Couleurs d'affinité par Guilde (les barres de la section orientation).
export const GUILD_BAR_COLORS: Record<string, string> = {
  batisseurs: PDF_COLORS.leaf,
  inventeurs: PDF_COLORS.brand,
  explorateurs: PDF_COLORS.skyDark,
  createurs: PDF_COLORS.purple,
  strateges: PDF_COLORS.amber,
  protecteurs: PDF_COLORS.leaf,
};

/** Découpe la liste des défis en pages PDF (max 2 par page, 1 seule page dès
 *  qu'un défi de la paire a une photo de preuve — la photo prend la place). */
export function paginateChallenges<T extends { proof_image_url: string | null }>(
  challenges: T[],
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  for (const c of challenges) {
    if (
      current.length >= 2 ||
      (current.length === 1 && (current[0].proof_image_url || c.proof_image_url))
    ) {
      pages.push(current);
      current = [];
    }
    current.push(c);
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

/** Retire l'émoji de tête des libellés (« 🧠 Logique » → « Logique ») : les
 *  émojis couleur ne se rendent pas dans un PDF vectoriel. */
export function stripEmoji(label: string): string {
  return label.replace(/^[\p{Extended_Pictographic}\s]+/u, "");
}

/** Nom de fichier de téléchargement, sans caractères illégaux. */
export function passportFileName(childName: string): string {
  const safe = childName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `Passeport-Excellence-${safe || "Enfant"}.pdf`;
}
