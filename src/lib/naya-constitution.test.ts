import { describe, it, expect } from "vitest";
import {
  aggregateAuditViolations,
  computeRecurringRules,
  buildLearnedRuleText,
  buildDecisionDraft,
  buildLearnings,
  computeAutoAckRules,
  clampAutoAckThresholds,
  ruleKeyOf,
  buildRuleJournal,
  aggregateOutcomeSignals,
  type AuditRow,
  type DecidedAuditRow,
  type LoupDecision,
  type ChallengeOutcomeRow,
  type OutcomeKind,
} from "@/lib/naya-constitution.functions";

// ============================================================================
// Naya 3.0 « Le Loup » — chantier 3 (C3 Tests) + Décision #56
// Agrégation des audits, seuils de récurrence, rédaction LEARNED_RULES,
// auto-acquittement par seuil et journal des décisions (validation hybride).
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

function decidedRow(overrides: Partial<DecidedAuditRow>): DecidedAuditRow {
  return {
    id: "audit-1",
    kind: "challenge_single",
    child_id: "child-1",
    violations: null,
    context: { domain: "spatial" },
    created_at: "2026-08-06T00:00:00Z",
    decision: "auto" as LoupDecision,
    decision_at: "2026-08-06T12:00:00Z",
    decision_by: "système",
    decision_note: null,
    ...overrides,
  };
}

function outcomeRow(overrides: Partial<ChallengeOutcomeRow>): ChallengeOutcomeRow {
  return {
    child_id: "child-1",
    kind: "deleted_uncompleted" as OutcomeKind,
    reason_chip: "pas_le_bon_moment",
    domain: "spatial",
    status_when_deleted: "todo",
    pending_duration_days: 3,
    created_at: "2026-08-09T00:00:00Z",
    ...overrides,
  };
}

describe("aggregateAuditViolations", () => {
  it("groupe par (règle, type, domaine) et compte les occurrences", () => {
    const rows: AuditRow[] = [
      auditRow({
        kind: "challenge_single",
        context: { domain: "spatial" },
        violations: [
          { rule: "challenge.no_markdown", severity: "mineur", detail: "Markdown détecté." },
        ],
      }),
      auditRow({
        kind: "challenge_bulk",
        context: { domain: "spatial" },
        violations: [
          { rule: "challenge.no_markdown", severity: "mineur", detail: "Markdown détecté." },
        ],
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
      auditRow({
        kind: "homework",
        context: { subject: "mathematiques" },
        violations: [{ rule: "r1", severity: "mineur", detail: "d" }],
      }),
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
    {
      rule: "a",
      kind: "challenge_single",
      domain: "general",
      severity: "mineur" as const,
      count: 5,
      childCount: 3,
      sampleDetails: [],
      sampleSuggestions: [],
    },
    {
      rule: "b",
      kind: "challenge_single",
      domain: "general",
      severity: "majeur" as const,
      count: 3,
      childCount: 1,
      sampleDetails: [],
      sampleSuggestions: [],
    },
    {
      rule: "c",
      kind: "homework",
      domain: "general",
      severity: "mineur" as const,
      count: 2,
      childCount: 2,
      sampleDetails: [],
      sampleSuggestions: [],
    },
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
    const { recurringRules, learnedRulesBlock, decisionDrafts } = buildLearnings(
      [aggregate, { ...aggregate, rule: "x", count: 3, childCount: 2 }],
      {
        minCount: 3,
        minChildren: 2,
      },
    );
    expect(recurringRules).toHaveLength(2);
    expect(recurringRules[0].learnedRuleText).toContain("LEARNED_RULE 1.");
    expect(recurringRules[1].learnedRuleText).toContain("LEARNED_RULE 2.");
    expect(learnedRulesBlock).toContain("## LEARNED_RULES");
    expect(learnedRulesBlock).toContain("LEARNED_RULE 2.");
    expect(decisionDrafts).toContain("Règle apprise du Loup");
  });
});

describe("auto-acquittement par seuil (Décision #56)", () => {
  const aggregates = [
    {
      rule: "a",
      kind: "challenge_single",
      domain: "general",
      severity: "mineur" as const,
      count: 6,
      childCount: 4,
      sampleDetails: [],
      sampleSuggestions: [],
    },
    {
      rule: "b",
      kind: "challenge_single",
      domain: "general",
      severity: "majeur" as const,
      count: 5,
      childCount: 3,
      sampleDetails: [],
      sampleSuggestions: [],
    },
    {
      rule: "c",
      kind: "challenge_single",
      domain: "general",
      severity: "majeur" as const,
      count: 5,
      childCount: 2,
      sampleDetails: [],
      sampleSuggestions: [],
    },
  ];

  it("ne franchit le seuil auto que sur occurrences ET enfants distincts élevés (5/3)", () => {
    const auto = computeAutoAckRules(aggregates, { minCount: 5, minChildren: 3 });
    expect(auto.map((r) => r.rule)).toEqual(["a", "b"]);
  });

  it("sous le seuil auto (3/2), la même règle reste une simple suggestion", () => {
    const auto = computeAutoAckRules(aggregates, { minCount: 3, minChildren: 2 });
    expect(auto.map((r) => r.rule)).toEqual(["a", "b", "c"]);
  });

  it("clampAutoAckThresholds borne les seuils auto au-dessus des seuils de suggestion", () => {
    const clamped = clampAutoAckThresholds(
      { minCount: 5, minChildren: 3 },
      { minCount: 3, minChildren: 2 },
    );
    expect(clamped).toEqual({ minCount: 5, minChildren: 3 });
  });

  it("ruleKeyOf produit la clé canonique kind|domaine|règle", () => {
    expect(ruleKeyOf("challenge_single", "spatial", "challenge.no_markdown")).toBe(
      "challenge_single|spatial|challenge.no_markdown",
    );
  });
});

describe("buildRuleJournal (journal des décisions, Décision #56)", () => {
  const violation = {
    rule: "challenge.no_markdown",
    severity: "majeur" as const,
    detail: "Markdown détecté.",
  };

  it("agrège les décisions par règle avec enfants distincts", () => {
    const rows: DecidedAuditRow[] = [
      decidedRow({
        id: "a1",
        child_id: "c1",
        decision: "auto",
        decision_by: "système",
        violations: [violation],
      }),
      decidedRow({
        id: "a2",
        child_id: "c1",
        decision: "auto",
        decision_by: "système",
        violations: [violation],
      }),
      decidedRow({
        id: "a3",
        child_id: "c2",
        decision: "auto",
        decision_by: "système",
        violations: [violation],
      }),
    ];
    const journal = buildRuleJournal(rows);
    expect(journal).toHaveLength(1);
    expect(journal[0].ruleKey).toBe("challenge_single|spatial|challenge.no_markdown");
    expect(journal[0].count).toBe(3);
    expect(journal[0].childCount).toBe(2);
    expect(journal[0].decision).toBe("auto");
  });

  it("la décision la plus récente prime et son auteur est conservé", () => {
    const rows: DecidedAuditRow[] = [
      decidedRow({
        id: "a1",
        decision: "auto",
        decision_at: "2026-08-06T10:00:00Z",
        decision_by: "système",
        violations: [violation],
      }),
      decidedRow({
        id: "a2",
        decision: "valide",
        decision_at: "2026-08-06T14:00:00Z",
        decision_by: "admin@genizio.com",
        violations: [violation],
      }),
    ];
    const journal = buildRuleJournal(rows);
    expect(journal[0].decision).toBe("valide");
    expect(journal[0].decidedAt).toBe("2026-08-06T14:00:00Z");
    expect(journal[0].decidedBy).toBe("admin@genizio.com");
  });

  it("ignore les audits encore en attente et porte le commentaire", () => {
    const rows: DecidedAuditRow[] = [
      decidedRow({ id: "a1", decision: "en_attente", violations: [violation] }),
      decidedRow({
        id: "a2",
        decision: "rejete",
        decision_note: "Faux positif : matériau local réel.",
        violations: [violation],
      }),
    ];
    const journal = buildRuleJournal(rows);
    expect(journal).toHaveLength(1);
    expect(journal[0].decision).toBe("rejete");
    expect(journal[0].note).toBe("Faux positif : matériau local réel.");
  });
});

describe("aggregateOutcomeSignals (signaux d'abandon, Décision #58)", () => {
  it("groupe par (raison, type, domaine) et compte les enfants distincts", () => {
    const rows: ChallengeOutcomeRow[] = [
      outcomeRow({
        child_id: "c1",
        reason_chip: "pas_le_bon_moment",
        kind: "deleted_uncompleted",
        domain: "spatial",
      }),
      outcomeRow({
        child_id: "c1",
        reason_chip: "pas_le_bon_moment",
        kind: "deleted_uncompleted",
        domain: "spatial",
      }),
      outcomeRow({
        child_id: "c2",
        reason_chip: "pas_le_bon_moment",
        kind: "deleted_uncompleted",
        domain: "spatial",
      }),
      outcomeRow({
        child_id: "c3",
        reason_chip: "pas_interesse",
        kind: "deleted_uncompleted",
        domain: "spatial",
      }),
    ];
    const signals = aggregateOutcomeSignals(rows);
    expect(signals).toHaveLength(2);
    const pasLeBonMoment = signals.find((s) => s.reasonKey === "pas_le_bon_moment");
    expect(pasLeBonMoment?.count).toBe(3);
    expect(pasLeBonMoment?.childCount).toBe(2);
  });

  it("calcule la durée moyenne d'attente avant suppression", () => {
    const rows: ChallengeOutcomeRow[] = [
      outcomeRow({ pending_duration_days: 2 }),
      outcomeRow({ pending_duration_days: 4 }),
    ];
    const signals = aggregateOutcomeSignals(rows);
    expect(signals[0].avgPendingDays).toBe(3);
  });

  it("bascule une raison NULL en 'sans_raison'", () => {
    const rows: ChallengeOutcomeRow[] = [
      outcomeRow({ reason_chip: null }),
      outcomeRow({ reason_chip: null }),
    ];
    const signals = aggregateOutcomeSignals(rows);
    expect(signals).toHaveLength(1);
    expect(signals[0].reasonKey).toBe("sans_raison");
    expect(signals[0].count).toBe(2);
  });

  it("ignore les kinds inconnus (défensif) et trie par occurrences décroissantes", () => {
    const rows: ChallengeOutcomeRow[] = [
      outcomeRow({ kind: "deleted_completed" as OutcomeKind, domain: "musical" }),
      outcomeRow({ kind: "deleted_uncompleted", domain: "musical" }),
      outcomeRow({ kind: "deleted_uncompleted", domain: "musical" }),
      outcomeRow({ kind: "inconnu" as OutcomeKind, domain: "musical" }),
    ];
    const signals = aggregateOutcomeSignals(rows);
    expect(signals).toHaveLength(2);
    expect(signals[0].count).toBe(2);
    expect(signals[0].kind).toBe("deleted_uncompleted");
  });
});
