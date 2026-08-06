import { describe, it, expect } from "vitest";
import {
  aggregateAuditViolations,
  computeRecurringRules,
  buildLearnedRuleText,
  buildDecisionDraft,
  buildLearnings,
  type AuditRow,
} from "@/lib/naya-constitution.functions";

// ============================================================================
// Naya 3.0 « Le Loup » — chantier 3 (C3 Tests)
// Agrégation des audits, seuils de récurrence, rédaction LEARNED_RULES.
// Fonctions pures uniquement — aucun mock IA ni base de données.
// ============================================================================

function auditRow(overrides: Partial<AuditRow>): AuditRow {
  return {
    kind: "challenge_single",
    child_id: "child-1",
    violations: null,
    created_at: "2026-08-06T00:00:00Z",
    ...overrides,
  };
}

describe("aggregateAuditViolations", () => {
  it("groupe par (règle, type, domaine) et compte les occurrences", () => {
    const rows: AuditRow[] = [
      auditRow({
        kind: "challenge_single",
        context: { domain: "spatial" },
        violations: [{ rule: "challenge.no_markdown", severity: "mineur", detail: "Markdown détecté." }],
      }),
      auditRow({
        kind: "challenge_bulk",
        context: { domain: "spatial" },
        violations: [{ rule: "challenge.no_markdown", severity: "mineur", detail: "Markdown détecté." }],
      }),
    ];
    const agg = aggregateAuditViolations(rows);
    expect(agg).toHaveLength(2);
    expect(agg.find((a) => a.kind === "challenge_single")?.count).toBe(1);
    expect(agg.find((a) => a.kind === "challenge_bulk")?.count).toBe(1);
  });

  it("compte les enfants DISTINCTS par agrégat, pas les occurrences", () => {
    const rows: AuditRow[] = [
      auditRow({ child_id: "c1", violations: [{ rule: "r1", severity: "mineur", detail: "d" }] }),
      auditRow({ child_id: "c1", violations: [{ rule: "r1", severity: "mineur", detail: "d" }] }),
      auditRow({ child_id: "c2", violations: [{ rule: "r1", severity: "mineur", detail: "d" }] }),
    ];
    const agg = aggregateAuditViolations(rows);
    expect(agg).toHaveLength(1);
    expect(agg[0].count).toBe(3);
    expect(agg[0].childCount).toBe(2);
  });

  it("sévérité majeure prime sur mineure dans le même agrégat", () => {
    const rows: AuditRow[] = [
      auditRow({ violations: [{ rule: "r1", severity: "mineur", detail: "d" }] }),
      auditRow({ violations: [{ rule: "r1", severity: "majeur", detail: "d" }] }),
    ];
    const agg = aggregateAuditViolations(rows);
    expect(agg[0].severity).toBe("majeur");
  });

  it("extrait le domaine du contexte (subject pour les devoirs)", () => {
    const rows: AuditRow[] = [
      auditRow({ kind: "homework", context: { subject: "mathematiques" }, violations: [{ rule: "r1", severity: "mineur", detail: "d" }] }),
    ];
    const agg = aggregateAuditViolations(rows);
    expect(agg[0].domain).toBe("mathematiques");
    expect(agg[0].kind).toBe("homework");
  });

  it("ignore les lignes sans violations et déduplique les détails", () => {
    const rows: AuditRow[] = [
      auditRow({ violations: null }),
      auditRow({ violations: [] }),
      auditRow({ violations: [{ rule: "r1", severity: "mineur", detail: "même détail" }] }),
      auditRow({ violations: [{ rule: "r1", severity: "mineur", detail: "même détail" }] }),
    ];
    const agg = aggregateAuditViolations(rows);
    expect(agg).toHaveLength(1);
    expect(agg[0].count).toBe(2);
    expect(agg[0].sampleDetails).toEqual(["même détail"]);
  });
});

describe("computeRecurringRules (seuils de récurrence)", () => {
  const aggregates = [
    { rule: "a", kind: "challenge_single", domain: "general", severity: "mineur" as const, count: 5, childCount: 3, sampleDetails: [], sampleSuggestions: [] },
    { rule: "b", kind: "challenge_single", domain: "general", severity: "majeur" as const, count: 3, childCount: 1, sampleDetails: [], sampleSuggestions: [] },
    { rule: "c", kind: "homework", domain: "general", severity: "mineur" as const, count: 2, childCount: 2, sampleDetails: [], sampleSuggestions: [] },
  ];

  it("ne retient que les règles ≥ N occurrences ET ≥ M enfants distincts", () => {
    const recurring = computeRecurringRules(aggregates, { minCount: 3, minChildren: 2 });
    expect(recurring.map((r) => r.rule)).toEqual(["a"]);
  });

  it("un seul enfant très générateur ne suffit pas à franchir le seuil enfants", () => {
    const recurring = computeRecurringRules(aggregates, { minCount: 2, minChildren: 2 });
    expect(recurring.map((r) => r.rule)).toEqual(["a", "c"]);
    expect(recurring.some((r) => r.rule === "b")).toBe(false);
  });

  it("seuils par défaut : 3 occurrences / 2 enfants", () => {
    const recurring = computeRecurringRules(aggregates);
    expect(recurring.some((r) => r.rule === "a")).toBe(true);
  });
});

describe("rédaction LEARNED_RULES (C3.2)", () => {
  const aggregate = {
    rule: "challenge.intelligences_valid",
    kind: "challenge_single",
    domain: "spatial",
    severity: "majeur" as const,
    count: 4,
    childCount: 2,
    sampleDetails: ["Clé d'intelligence invalide : magique."],
    sampleSuggestions: ["Utilise uniquement les clés techniques exactes des 9 intelligences."],
  };

  it("buildLearnedRuleText numérote et cite règle, preuve et correctif", () => {
    const text = buildLearnedRuleText(1, aggregate);
    expect(text).toContain("LEARNED_RULE 1.");
    expect(text).toContain("challenge.intelligences_valid");
    expect(text).toContain("challenge_single");
    expect(text).toContain("spatial");
    expect(text).toContain("4 occurrence(s)");
    expect(text).toContain("Utilise uniquement les clés techniques");
  });

  it("buildDecisionDraft produit un brouillon prêt pour genizio_decisions.md", () => {
    const draft = buildDecisionDraft(aggregate);
    expect(draft).toContain("Règle apprise du Loup");
    expect(draft).toContain("**Verdict** : validée / rejetée");
    expect(draft).toContain("Clé d'intelligence invalide : magique.");
  });

  it("buildLearnings assemble un bloc numéroté en continu", () => {
    const { recurringRules, learnedRulesBlock, decisionDrafts } = buildLearnings([aggregate, { ...aggregate, rule: "x", count: 3, childCount: 2 }], {
      minCount: 3,
      minChildren: 2,
    });
    expect(recurringRules).toHaveLength(2);
    expect(recurringRules[0].learnedRuleText).toContain("LEARNED_RULE 1.");
    expect(recurringRules[1].learnedRuleText).toContain("LEARNED_RULE 2.");
    expect(learnedRulesBlock).toContain("## LEARNED_RULES");
    expect(learnedRulesBlock).toContain("LEARNED_RULE 2.");
    expect(decisionDrafts).toContain("Règle apprise du Loup");
  });
});
