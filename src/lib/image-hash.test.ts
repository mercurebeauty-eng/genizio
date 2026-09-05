import { describe, expect, it } from "vitest";
import {
  classifyDuplicate,
  computeByteSha256,
  computeDHash,
  DUPLICATE_CERTAIN_THRESHOLD,
  DUPLICATE_SUSPECT_THRESHOLD,
  hammingDistance,
  rgbaToLuminance,
} from "@/lib/image-hash";

// Fabrique une image de gradient horizontal (noir → gauche, blanc → droite).
function gradient(width: number, height: number): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = Math.round((x / (width - 1)) * 255);
    }
  }
  return { width, height, data };
}

// Fabrique un motif à bandes verticales (contraste fort entre colonnes).
function stripes(width: number, height: number, period: number): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = Math.floor(x / period) % 2 === 0 ? 20 : 230;
    }
  }
  return { width, height, data };
}

describe("hammingDistance", () => {
  it("distance 0 pour des empreintes identiques", () => {
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });

  it("compte les bits différents", () => {
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1);
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64);
  });

  it("distance 64 si longueurs différentes (sécurité)", () => {
    expect(hammingDistance("abc", "abcdef")).toBe(64);
  });
});

describe("classifyDuplicate", () => {
  it("classe selon les seuils 4 / 8", () => {
    expect(classifyDuplicate(0).kind).toBe("certain");
    expect(classifyDuplicate(DUPLICATE_CERTAIN_THRESHOLD).kind).toBe("certain");
    expect(classifyDuplicate(DUPLICATE_CERTAIN_THRESHOLD + 1).kind).toBe("suspect");
    expect(classifyDuplicate(DUPLICATE_SUSPECT_THRESHOLD).kind).toBe("suspect");
    expect(classifyDuplicate(DUPLICATE_SUSPECT_THRESHOLD + 1).kind).toBe("none");
  });
});

describe("computeDHash", () => {
  it("déterministe : même image → même empreinte, distance 0", () => {
    const a = computeDHash(stripes(320, 240, 8));
    const b = computeDHash(stripes(320, 240, 8));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(hammingDistance(a, b)).toBe(0);
  });

  it("image uniforme → empreinte nulle valide (aucun gradient)", () => {
    const uniform = { width: 100, height: 100, data: new Uint8ClampedArray(100 * 100).fill(128) };
    expect(computeDHash(uniform)).toBe("0000000000000000");
  });

  it("gradient horizontal → bits allumés, stable au redimensionnement", () => {
    const big = computeDHash(gradient(640, 480));
    const small = computeDHash(gradient(160, 120));
    expect(big).toMatch(/^[0-9a-f]{16}$/);
    // Le gradient croissant allume les bits dans le même ordre : le hash reste
    // identique après rééchantillonnage de la même image.
    expect(hammingDistance(big, small)).toBeLessThanOrEqual(DUPLICATE_SUSPECT_THRESHOLD);
  });

  it("images réellement différentes → distance nettement au-dessus du seuil suspect", () => {
    const a = computeDHash(stripes(320, 240, 8));
    const b = computeDHash(stripes(320, 240, 21)); // période différente
    const c = computeDHash(gradient(320, 240));
    expect(hammingDistance(a, b)).toBeGreaterThan(DUPLICATE_SUSPECT_THRESHOLD);
    expect(hammingDistance(a, c)).toBeGreaterThan(DUPLICATE_SUSPECT_THRESHOLD);
  });

  it("décalage uniforme de luminosité → empreinte identique", () => {
    // dHash ne capture que le SENS des gradients : une photo du même objet prise
    // plus sombre ou plus claire (shift uniforme) ne change rien. En revanche une
    // inversion (négatif) inverserait les bits — propriété assumée, pas un bug.
    const normal = stripes(320, 240, 8);
    const darker = { ...normal, data: Uint8ClampedArray.from(normal.data, (v) => Math.max(0, v - 15)) };
    const lighter = { ...normal, data: Uint8ClampedArray.from(normal.data, (v) => Math.min(255, v + 15)) };
    const base = computeDHash(normal);
    expect(hammingDistance(base, computeDHash(darker))).toBe(0);
    expect(hammingDistance(base, computeDHash(lighter))).toBe(0);
  });

  it("image vide/illisible → empreinte nulle sans exception", () => {
    expect(computeDHash({ width: 0, height: 0, data: new Uint8ClampedArray(0) })).toBe("0000000000000000");
    expect(computeDHash({ width: 10, height: 10, data: new Uint8ClampedArray(50) })).toBe("0000000000000000");
  });
});

describe("rgbaToLuminance", () => {
  it("convertit le blanc en 255, le noir en 0", () => {
    const luma = rgbaToLuminance(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]));
    expect(luma[0]).toBe(255);
    expect(luma[1]).toBe(0);
  });

  it("produit width*height pixels", () => {
    expect(rgbaToLuminance(new Uint8ClampedArray(4 * 120)).length).toBe(120);
  });
});

describe("computeByteSha256", () => {
  it("hash déterministe en hexadécimal 64 caractères", async () => {
    const a = await computeByteSha256(new TextEncoder().encode("génizio"));
    const b = await computeByteSha256(new TextEncoder().encode("génizio"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    const c = await computeByteSha256(new TextEncoder().encode("Génizio"));
    expect(c).not.toBe(a);
  });
});
