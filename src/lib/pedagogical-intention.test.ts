import { describe, it, expect } from "vitest";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";

// Couvre le bug rapporté le 2026-07-22 : la carte "Intention Pédagogique" affichait le
// JSON brut ({"cycle_id":"...","target_cause":"METHOD_MISMATCH"}) au lieu d'une phrase
// lisible. Historiquement les intentions machine étaient sérialisées à la main dans
// pedagogical_context ; elles vivent désormais dans des colonnes typées de `challenges`
// (challenge_role, target_cause, recommendation_type, reformulation_of) — la fonction
// lit ces colonnes et masque tout résidu JSON non reconnu (jamais de JSON brut à l'écran).
describe("formatPedagogicalIntention", () => {
  it("renvoie null pour un défi absent ou sans intention ni prose", () => {
    expect(formatPedagogicalIntention(null)).toBeNull();
    expect(formatPedagogicalIntention(undefined)).toBeNull();
    expect(formatPedagogicalIntention({})).toBeNull();
    expect(formatPedagogicalIntention({ pedagogical_context: "" })).toBeNull();
  });

  it("laisse passer le texte humain normal inchangé", () => {
    const humanText = "Ce défi développe la persévérance face à la frustration.";
    expect(formatPedagogicalIntention({ pedagogical_context: humanText })).toBe(humanText);
  });

  it("traduit un défi discriminant en phrase lisible (aucun champ machine exposé)", () => {
    const result = formatPedagogicalIntention({
      challenge_role: "discriminant",
      target_cause: "METHOD_MISMATCH",
    });
    expect(result).not.toContain("cycle_id");
    expect(result).not.toContain("{");
    expect(result).toMatch(/manière d'enseigner/);
  });

  it("traduit chaque cause discriminante connue en texte distinct", () => {
    const causes = [
      "METHOD_MISMATCH",
      "PERFORMANCE_ANXIETY",
      "LACK_OF_ENGAGEMENT",
      "CONCEPTUAL_GAP",
      "READY_FOR_MORE",
    ];
    const results = causes.map((cause) =>
      formatPedagogicalIntention({ challenge_role: "discriminant", target_cause: cause }),
    );
    expect(new Set(results).size).toBe(causes.length);
    results.forEach((r) => expect(r).not.toBeNull());
  });

  it("traduit ESSAIMAGE/STABILISATION et masque ASPIRATION/EXPLORATION (intentions internes)", () => {
    const essaimage = formatPedagogicalIntention({ recommendation_type: "ESSAIMAGE" });
    const stabilisation = formatPedagogicalIntention({ recommendation_type: "STABILISATION" });
    expect(essaimage).not.toContain("{");
    expect(stabilisation).not.toContain("{");
    expect(essaimage).not.toBe(stabilisation);
    expect(formatPedagogicalIntention({ recommendation_type: "ASPIRATION" })).toBeNull();
    expect(formatPedagogicalIntention({ recommendation_type: "EXPLORATION" })).toBeNull();
  });

  it("traduit un retest de soutien en phrase discrète (jamais présenté comme un test)", () => {
    const result = formatPedagogicalIntention({ challenge_role: "support_retest" });
    expect(result).toMatch(/discrètement/);
    expect(result).not.toContain("test");
  });

  it("renvoie null plutôt que du JSON brut pour un résidu non reconnu", () => {
    expect(
      formatPedagogicalIntention({ pedagogical_context: '{"some_unrelated_field": true}' }),
    ).toBeNull();
  });
});
