import { describe, it, expect } from "vitest";
import { resolveProofEncodePlan, isHeicProofFile, normalizeProofMediaType } from "@/lib/image-proof";

// D-04 (review 2026-08-13) : compression sans perte de qualité visible — la DÉCISION
// est pure et testée ; l'exécution (canvas) relève du navigateur.

describe("resolveProofEncodePlan — compression de preuve sans perte visible", () => {
  it("petit fichier raisonnable → passthrough (0 dégradation)", () => {
    expect(resolveProofEncodePlan(400 * 1024, 1200, 900, "image/jpeg")).toEqual({
      action: "passthrough",
      mediaType: "image/jpeg",
    });
  });

  it("grande photo JPEG (4000px) → resize WebP haute qualité", () => {
    const plan = resolveProofEncodePlan(5 * 1024 * 1024, 4000, 3000, "image/jpeg");
    expect(plan.action).toBe("resize");
    expect(plan.mediaType).toBe("image/webp");
    expect((plan as { quality?: number }).quality).toBeCloseTo(0.92);
  });

  it("PNG lourd et grand → resize PNG (lossless)", () => {
    const plan = resolveProofEncodePlan(3 * 1024 * 1024, 3000, 2000, "image/png");
    expect(plan).toEqual({ action: "resize", mediaType: "image/png" });
  });

  it("PNG lourd mais déjà ≤ 1920px → passthrough (le ré-encodage canvas n'aide pas)", () => {
    expect(resolveProofEncodePlan(2 * 1024 * 1024, 1600, 1200, "image/png")).toEqual({
      action: "passthrough",
      mediaType: "image/png",
    });
  });

  it("photo déjà légère mais surdimensionnée → resize quand même (les 4000px ne servent à rien)", () => {
    const plan = resolveProofEncodePlan(500 * 1024, 3200, 2400, "image/jpeg");
    expect(plan.action).toBe("resize");
  });
});

// D-07 (review 2026-08-15) : Live Photos iOS livrées en HEIC — détection pure.
describe("isHeicProofFile — détection HEIC/HEIF (Live Photos iOS)", () => {
  it("types MIME HEIC/HEIF reconnus", () => {
    expect(isHeicProofFile("image/heic", "IMG_0001.heic")).toBe(true);
    expect(isHeicProofFile("image/heif", "IMG_0001.heif")).toBe(true);
    expect(isHeicProofFile("image/heic-sequence", "a.heic")).toBe(true);
    expect(isHeicProofFile("image/heif-sequence", "a.heif")).toBe(true);
  });

  it("type MIME avec paramètres (ex. 'image/heic;format=heic')", () => {
    expect(isHeicProofFile("image/heic;format=heic", "IMG_0001.heic")).toBe(true);
  });

  it("type vide mais extension .heic/.heif (quirk iOS : photo sans type MIME)", () => {
    expect(isHeicProofFile("", "IMG_0002.heic")).toBe(true);
    expect(isHeicProofFile("", "IMG_0002.heif")).toBe(true);
  });

  it("cas minuscules/majuscules et espaces", () => {
    expect(isHeicProofFile("IMAGE/HEIC", "IMG.heic")).toBe(true);
    expect(isHeicProofFile(" image/heic ", "IMG.heic")).toBe(true);
  });

  it("faux positifs : png/jpg/webp", () => {
    expect(isHeicProofFile("image/png", "capture.png")).toBe(false);
    expect(isHeicProofFile("image/jpeg", "photo.jpg")).toBe(false);
    expect(isHeicProofFile("image/webp", "photo.webp")).toBe(false);
    expect(isHeicProofFile("", "capture.png")).toBe(false);
  });
});

describe("normalizeProofMediaType — type MIME normalisé", () => {
  it("retire les paramètres et met en minuscules", () => {
    expect(normalizeProofMediaType("image/jpeg; charset=binary", "a.jpg")).toBe("image/jpeg");
    expect(normalizeProofMediaType("Image/PNG", "a.png")).toBe("image/png");
  });

  it("type vide → repli extension uniquement pour heic/heif", () => {
    expect(normalizeProofMediaType("", "a.heic")).toBe("image/heic");
    expect(normalizeProofMediaType("", "a.png")).toBe("");
    expect(normalizeProofMediaType("", "sans-extension")).toBe("");
  });
});
