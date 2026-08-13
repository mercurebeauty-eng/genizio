import { describe, it, expect } from "vitest";
import { resolveProofEncodePlan } from "@/lib/image-proof";

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
