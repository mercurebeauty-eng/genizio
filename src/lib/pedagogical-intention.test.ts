import { describe, it, expect } from "vitest";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";

// Couvre le bug rapporté le 2026-07-22 : la carte "Intention Pédagogique" affichait le
// JSON brut ({"cycle_id":"...","target_cause":"METHOD_MISMATCH"}) au lieu d'une phrase
// lisible pour les défis discriminants (hypotheses.functions.ts) et de recommandation
// (recommendations.functions.ts), qui réutilisent pedagogical_context comme stockage
// JSON interne plutôt que comme texte pédagogique humain.
describe("formatPedagogicalIntention", () => {
  it("renvoie null pour une valeur vide ou absente", () => {
    expect(formatPedagogicalIntention(null)).toBeNull();
    expect(formatPedagogicalIntention(undefined)).toBeNull();
    expect(formatPedagogicalIntention("")).toBeNull();
  });

  it("laisse passer le texte humain normal inchangé", () => {
    const humanText = "Ce défi développe la persévérance face à la frustration.";
    expect(formatPedagogicalIntention(humanText)).toBe(humanText);
  });

  it("traduit le JSON d'un défi discriminant en phrase lisible", () => {
    const raw = JSON.stringify({
      cycle_id: "4caf342b-3758-4ad7-be42-f965431d2e39",
      target_cause: "METHOD_MISMATCH",
      is_discriminant: true,
      subject: "mathematiques",
    });
    const result = formatPedagogicalIntention(raw);
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
      formatPedagogicalIntention(
        JSON.stringify({ is_discriminant: true, target_cause: cause, cycle_id: "x" }),
      ),
    );
    expect(new Set(results).size).toBe(causes.length);
    results.forEach((r) => expect(r).not.toBeNull());
  });

  it("traduit le JSON d'une recommandation ESSAIMAGE/STABILISATION en phrase lisible", () => {
    const essaimage = formatPedagogicalIntention(
      JSON.stringify({ is_recommendation: true, type: "ESSAIMAGE" }),
    );
    const stabilisation = formatPedagogicalIntention(
      JSON.stringify({ is_recommendation: true, type: "STABILISATION" }),
    );
    expect(essaimage).not.toContain("{");
    expect(stabilisation).not.toContain("{");
    expect(essaimage).not.toBe(stabilisation);
  });

  it("renvoie null plutôt que du JSON brut pour une forme JSON inconnue", () => {
    const result = formatPedagogicalIntention(JSON.stringify({ some_unrelated_field: true }));
    expect(result).toBeNull();
  });
});
