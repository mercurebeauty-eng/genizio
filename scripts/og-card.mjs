// ────────────────────────────────────────────────────────────
// GÉNIZIO — Générateur de la carte de partage sociale (og:image)
//
// Produit public/og-card.jpg en 1200×630 (le format recommandé par
// WhatsApp, Facebook, X et LinkedIn), avec le logotype et la promesse
// produit actuelle. À relancer après chaque changement de promesse.
//
// Usage : node scripts/og-card.mjs
// ────────────────────────────────────────────────────────────
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const W = 1200;
const H = 630;

// Palette de la marque (styles.css, tokens oklch convertis en sRGB).
const INK = "#05070d"; // fond sombre du hero
const BRAND_GLOW = "#ed591f"; // orange vif (gradients hero)
const AMBER = "#f59e0b";
const WHITE = "#ffffff";
const TEXT_SOFT = "#aab3c0";

// Police d'affichage du site (Fredoka 700) embarquée en base64 : sans elle,
// le rendu dépendrait des polices installées sur la machine qui exécute le
// script. Le .ttf vit dans scripts/fonts/ pour pouvoir régénérer la carte.
const FONT_FILE = new URL("./fonts/fredoka-700.ttf", import.meta.url);
const LOGO_FILE = new URL("../public/web-app-manifest-512x512.png", import.meta.url);
const OUT_FILE = new URL("../public/og-card.jpg", import.meta.url);

if (!existsSync(FONT_FILE)) {
  console.error("Polices manquantes : téléchargez Fredoka 700 dans scripts/fonts/.");
  console.error("  https://cdn.jsdelivr.net/fontsource/fonts/fredoka@latest/latin-700-normal.ttf");
  process.exit(1);
}

const fontB64 = readFileSync(FONT_FILE).toString("base64");
const logoB64 = readFileSync(LOGO_FILE).toString("base64");

// Les glyphes Fredoka descendent sous la ligne de base : les coordonnées y
// ci-dessous intègrent une remontée (~40 % de la taille) pour centrer l'œil.
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: "Fredoka";
        font-weight: 700;
        src: url("data:font/ttf;base64,${fontB64}") format("truetype");
      }
      .eyebrow { font: 700 13px "Fredoka", sans-serif; letter-spacing: 6px; fill: ${BRAND_GLOW}; }
      .h1 { font: 700 50px "Fredoka", sans-serif; fill: ${WHITE}; }
      .h2 { font: 700 50px "Fredoka", sans-serif; fill: url(#gradB); }
      .sub { font: 500 21px "Fredoka", sans-serif; fill: ${TEXT_SOFT}; }
      .brand { font: 700 32px "Fredoka", sans-serif; letter-spacing: 3px; fill: ${WHITE}; }
      .pill { font: 700 18px "Fredoka", sans-serif; fill: ${INK}; }
      .url { font: 500 17px "Fredoka", sans-serif; fill: #6b7480; }
    </style>
    <radialGradient id="g1" cx="0.05" cy="0" r="0.65">
      <stop offset="0" stop-color="${BRAND_GLOW}" stop-opacity="0.38"/>
      <stop offset="1" stop-color="${BRAND_GLOW}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="1" cy="1" r="0.7">
      <stop offset="0" stop-color="${AMBER}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gradB" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd9a0"/>
      <stop offset="1" stop-color="${BRAND_GLOW}"/>
    </linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- Logotype + marque -->
  <image href="data:image/png;base64,${logoB64}" x="80" y="52" width="92" height="92"/>
  <text x="192" y="114" class="brand">GÉNIZIO</text>

  <!-- Promesse -->
  <text x="80" y="262" class="eyebrow">POUR VOTRE ENFANT DE 5 À 16 ANS</text>
  <text x="80" y="338" class="h1">Découvrez qui est votre enfant.</text>
  <text x="80" y="398" class="h2">Développez ce qu'il peut devenir.</text>
  <text x="80" y="452" class="sub">Des défis concrets à la maison · 9 intelligences · Des réalisations validées par vous</text>

  <!-- Preuve de confiance -->
  <rect x="80" y="492" width="486" height="46" rx="23" fill="${BRAND_GLOW}"/>
  <text x="323" y="522" class="pill" text-anchor="middle">Le premier profil est gratuit — sans carte bancaire</text>

  <text x="1120" y="586" class="url" text-anchor="end">www.genizio.com</text>
</svg>`;

// Le texte est la partie fragile (embed de police) : on vérifie qu'il a bien
// été rendu en comparant la densité de pixels clairs de la zone de promesse à
// celle du fond. Un fond quasiment vide (tout le texte absent) ne passe pas.
// `density` par défaut = 72 : un SVG de 1200×630 sort donc en 1200×630, sans
// densité ajoutée. On le force explicitement pour que le rendu soit déterministe.
const IMG = sharp(Buffer.from(svg), { density: 72 });
await IMG.jpeg({ quality: 88, mozjpeg: true }).toFile(fileURLToPath(OUT_FILE));

const outPath = fileURLToPath(OUT_FILE);
const meta = await sharp(outPath).metadata();
if (meta.width !== 1200 || meta.height !== 630) {
  console.error(`Dimensions inattendues : ${meta.width}x${meta.height} (attendu 1200x630).`);
  process.exit(1);
}

const stats = await sharp(outPath).stats();
const [r, g, b] = stats.channels;
const mean = (r.mean + g.mean + b.mean) / 3;
const min = Math.min(r.min, g.min, b.min);

// Zone de la promesse (h1 + h2, soit y 250→470) : le texte clair sur fond sombre
// doit y produire des pixels lumineux. Si la police n'est pas rendue, la zone
// reste vide et le canal max ne dépasse pas le fond.
const band = await sharp(outPath)
  .extract({ left: 60, top: 250, width: 1080, height: 220 })
  .stats();
const bandMax = Math.max(...band.channels.map((c) => c.max));

if (mean < 8 || min > 245 || bandMax < 170) {
  console.error("Alerte : le texte semble ne pas avoir été rendu (densité inattendue).");
  process.exit(1);
}
console.log(
  `Carte générée : ${outPath} (${meta.width}x${meta.height}, luminosité moyenne ${mean.toFixed(1)}, pic zone texte ${bandMax})`,
);
