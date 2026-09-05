// Empreinte perceptuelle dHash 64 bits — pur, sans dépendance (testable).
//
// Pourquoi dHash : insensible aux recompressions/redimensions légères (le mentor
// recompresse volontairement ou non), déterministe, 64 bits suffisent à distinguer
// des scènes réelles ; deux photos du même objet pris à quelques secondes d'écart
// restent au-dessus du seuil de doublon, deux réutilisations de la MÊME photo
// tombent à ~0 bit de distance.
//
// Le hash est calculé CÔTÉ SERVEUR sur les octets uploadés : le mentor est la
// partie adverse de la détection de fraude, un hash client serait falsifiable.

/** Distance de Hamming entre deux empreintes hexadécimales de même longueur. */
export function hammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return 64;
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

/**
 * Seuils de décision (bits différents sur 64) :
 *  • ≤ DUPLICATE_CERTAIN (4)  : quasi-certain que c'est la même image.
 *  • ≤ DUPLICATE_SUSPECT (8)  : doublon suspect (recadrage/luminosité proches) —
 *    revue humaine plutôt que rejet automatique, sauf doublon EXACT du même mentor.
 */
export const DUPLICATE_CERTAIN_THRESHOLD = 4;
export const DUPLICATE_SUSPECT_THRESHOLD = 8;

export type DuplicateVerdict =
  | { kind: "certain"; distance: number }
  | { kind: "suspect"; distance: number }
  | { kind: "none"; distance: number };

export function classifyDuplicate(distance: number): DuplicateVerdict {
  if (distance <= DUPLICATE_CERTAIN_THRESHOLD) return { kind: "certain", distance };
  if (distance <= DUPLICATE_SUSPECT_THRESHOLD) return { kind: "suspect", distance };
  return { kind: "none", distance };
}

export interface GrayPixels {
  width: number;
  height: number;
  /** Luminance 0–255, row-major, length = width * height. */
  data: Uint8ClampedArray | number[];
}

/**
 * dHash 64 bits : réduit l'image en 9×8 niveaux de gris et compare chaque pixel
 * à son voisin droit (gradient horizontal) → 8×8 = 64 bits, sérialisés en hex
 * 16 caractères. Sans dépendance : les décodeurs wasm (@jsquash/*) fournissent
 * les pixels, ce module ne décide QUE de l'empreinte.
 */
export function computeDHash(pixels: GrayPixels): string {
  const { width, height, data } = pixels;
  if (width <= 0 || height <= 0 || data.length < width * height) {
    // Image vide/illisible : empreinte nulle assumée — les appelsants la traitent
    // comme "fingerprint indisponible" (détection par SHA-256 des octets seulement).
    return "0000000000000000";
  }

  // 1. Réduction 9×8 avec moyenne par bloc (box sampling) — pas de canvas,
  //    fonctionnement identique client/serveur/wasm.
  const GW = 9;
  const GH = 8;
  const grid = new Float64Array(GW * GH);
  const counts = new Float64Array(GW * GH);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(GH - 1, Math.floor((y * GH) / height));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(GW - 1, Math.floor((x * GW) / width));
      grid[gy * GW + gx] += data[y * width + x];
      counts[gy * GW + gx] += 1;
    }
  }
  for (let i = 0; i < grid.length; i++) {
    grid[i] = counts[i] > 0 ? grid[i] / counts[i] : 0;
  }

  // 2. 64 bits : grid[y][x] < grid[y][x+1] → bit à 1 (gradient horizontal).
  let bits = 0n;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW - 1; x++) {
      const idx = y * GW + x;
      if (grid[idx] < grid[idx + 1]) {
        bits |= 1n << BigInt(y * 8 + (GW - 2 - x));
      }
    }
  }

  // 3. Hex 16 caractères (64 bits, zéros non significatifs conservés).
  return bits.toString(16).padStart(16, "0");
}

/**
 * Convertit des pixels RGBA (sortie des décodeurs @jsquash) en luminance
 * (luma Rec. 709) prête pour computeDHash.
 */
export function rgbaToLuminance(rgba: Uint8ClampedArray | Uint8Array): Uint8ClampedArray {
  const px = Math.floor(rgba.length / 4);
  const out = new Uint8ClampedArray(px);
  for (let i = 0; i < px; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    out[i] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  return out;
}

/** SHA-256 des octets bruts — filet de détection des doublons EXACTS (rare mais gratuit). */
export async function computeByteSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
