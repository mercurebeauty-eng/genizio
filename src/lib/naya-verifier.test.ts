import { describe, it, expect } from "vitest";
import {
  verifyGeneration,
  conformityFrom,
  mergeViolations,
  buildRecadrageSuffix,
  semanticRubricFor,
  NAYA_LOCAL_TALENT_KEYS,
  NAYA_LOCAL_SUBFORMS,
  boundSemanticMaxTokens,
  truncateJsonForLoup,
  verifierEnabled,
  type VerifyVerdict,
} from "@/lib/naya-verifier.functions";
import { VALID_TALENT_KEYS } from "@/lib/talent-buckets";
import { TALENT_SUBFORMS, finalizeChallenge } from "@/lib/challenges.functions";

// ============================================================================
// Naya 3.0 « Le Loup » — chantier 2 (C2 Tests)
// Parseur de verdict, payload de vérification, couverture des rubriques et
// non-régression finalizeChallenge. Aucun mock IA : uniquement les fonctions
// pures du Loup et les filets déterministes existants.
// ============================================================================

const validChallenge = {
  title: "Mesurer l'ombre du manguier",
  description:
    "Mesure la longueur de ton ombre à trois moments de la journée et découvre pourquoi elle change de taille.",
  intelligences: ["spatial"],
  difficulty: "moyen",
  proof_mode: "photo",
  steps: [
    "Choisis un arbre",
    "Mesure son ombre le matin",
    "Recommence à midi",
    "Compare les longueurs",
  ],
  materials: ["règle", "corde", "feuille de papier"],
  material_tags: ["regle", "corde", "papier"],
  requires_supervision: false,
  supervision_warning: null,
};

describe("parseur de verdict (conformityFrom)", () => {
  it("conforme sans aucune violation", () => {
    expect(conformityFrom([])).toBe("conforme");
  });
  it("mineur pour une violation mineure seule", () => {
    expect(conformityFrom([{ rule: "r", severity: "mineur", detail: "d" }])).toBe("mineur");
  });
  it("majeur pour une violation majeure seule", () => {
    expect(conformityFrom([{ rule: "r", severity: "majeur", detail: "d" }])).toBe("majeur");
  });
  it("majeur prime sur mineur", () => {
    expect(
      conformityFrom([
        { rule: "r1", severity: "mineur", detail: "d" },
        { rule: "r2", severity: "majeur", detail: "d" },
      ]),
    ).toBe("majeur");
  });
});

describe("verifyGeneration — défis (structure déterministe)", () => {
  it("accepte un défi conforme", () => {
    const verdict = verifyGeneration("challenge_single", validChallenge, { childAge: 9 });
    expect(verdict.conformity).toBe("conforme");
  });

  it("majeur si titre ou description manquants", () => {
    const v = verifyGeneration("challenge_single", { ...validChallenge, title: " " });
    expect(v.conformity).toBe("majeur");
    expect(
      v.violations.some((x) => x.rule === "challenge.title_present" && x.severity === "majeur"),
    ).toBe(true);
  });

  it("majeur si clé d'intelligence hallucinée", () => {
    const v = verifyGeneration("challenge_single", {
      ...validChallenge,
      intelligences: ["magique"],
    });
    expect(v.conformity).toBe("majeur");
    expect(
      v.violations.some(
        (x) => x.rule === "challenge.intelligences_valid" && x.severity === "majeur",
      ),
    ).toBe(true);
  });

  it("majeur si proof_mode hors spec", () => {
    const v = verifyGeneration("challenge_single", { ...validChallenge, proof_mode: "video" });
    expect(
      v.violations.some((x) => x.rule === "challenge.proof_mode_valid" && x.severity === "majeur"),
    ).toBe(true);
  });

  it("mineur si academic_level_age incohérent avec l'âge réel", () => {
    const v = verifyGeneration(
      "challenge_single",
      {
        ...validChallenge,
        academic_domain: "mathematiques",
        academic_level_age: 16,
        academic_reference_note: "Addition posée",
      },
      { childAge: 6 },
    );
    expect(v.violations.some((x) => x.rule === "challenge.academic_level_vs_age")).toBe(true);
  });

  it("mineur si syntaxe Markdown dans un champ texte", () => {
    const v = verifyGeneration("challenge_single", {
      ...validChallenge,
      description: "**Attention** à ça",
    });
    expect(v.violations.some((x) => x.rule === "challenge.no_markdown")).toBe(true);
  });

  it("challenge_bulk audite chaque défi du lot", () => {
    const v = verifyGeneration(
      "challenge_bulk",
      { challenges: [validChallenge, { ...validChallenge, title: "" }] },
      { childAge: 9 },
    );
    expect(v.violations.filter((x) => x.rule === "challenge.title_present").length).toBe(1);
  });
});

describe("verifyGeneration — homework (fusion consigne / anti-anxiété)", () => {
  it("contexte d'anxiété + difficulty=difficile → majeur", () => {
    const v = verifyGeneration(
      "homework",
      {
        ...validChallenge,
        difficulty: "difficile",
        behavioral_driver: "deconstruire",
        zpa_level: 5,
      },
      { anxietyDamped: true },
    );
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "homework.anti_anxiety")).toBe(true);
  });

  it("behavioral_driver manquant → mineur", () => {
    const v = verifyGeneration("homework", validChallenge, {});
    expect(v.violations.some((x) => x.rule === "homework.behavioral_driver_present")).toBe(true);
  });
});

describe("verifyGeneration — recommandation (levier vs intention)", () => {
  it("stabilisation en difficulty=difficile → majeur", () => {
    const v = verifyGeneration(
      "recommendation",
      { ...validChallenge, difficulty: "difficile" },
      { requiresStabilisation: true },
    );
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "recommendation.difficulte_douce")).toBe(true);
  });

  it("stabilisation avec trop d'étapes → mineur", () => {
    const v = verifyGeneration(
      "recommendation",
      { ...validChallenge, steps: ["1", "2", "3", "4", "5", "6", "7"] },
      { requiresStabilisation: true },
    );
    expect(v.violations.some((x) => x.rule === "recommendation.difficulte_douce")).toBe(true);
  });
});

describe("verifyGeneration — hypothèses (diagnostic bayésien)", () => {
  it("somme des probabilités ≠ 1 → violation", () => {
    const v = verifyGeneration("hypothesis", {
      hypotheses: [
        {
          cause: "METHOD_MISMATCH",
          prior_probability: 0.6,
          rationale: "",
          evidence_log: [{ source_node: "n1", fact: "f" }],
        },
        {
          cause: "PERFORMANCE_ANXIETY",
          prior_probability: 0.3,
          rationale: "",
          evidence_log: [{ source_node: "n2", fact: "f" }],
        },
      ],
    });
    expect(v.violations.some((x) => x.rule === "hypothesis.probabilities_sum")).toBe(true);
  });

  it("cause hors allow-list → majeur", () => {
    const v = verifyGeneration("hypothesis", {
      hypotheses: [
        {
          cause: "ALIEN_ATTACK",
          prior_probability: 1,
          rationale: "",
          evidence_log: [{ source_node: "n1", fact: "f" }],
        },
      ],
    });
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "hypothesis.cause_valid")).toBe(true);
  });

  it("cause cohérente avec la direction → conforme", () => {
    const v = verifyGeneration(
      "hypothesis",
      {
        hypotheses: [
          {
            cause: "METHOD_MISMATCH",
            prior_probability: 0.7,
            rationale: "",
            evidence_log: [{ source_node: "n1", fact: "f" }],
          },
          {
            cause: "CONCEPTUAL_GAP",
            prior_probability: 0.3,
            rationale: "",
            evidence_log: [{ source_node: "n2", fact: "f" }],
          },
        ],
      },
      { direction: "BEHIND" },
    );
    expect(v.conformity).toBe("conforme");
  });
});

describe("verifyGeneration — textes parentaux (factualité douce, ton)", () => {
  it("vocabulaire clinique dans une narration → majeur", () => {
    const v = verifyGeneration("narrative", "Il présente un léger déficit d'attention en classe.");
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "prose.ton_non_pathologisant")).toBe(true);
  });

  it("chiffre dans une synthèse → mineur", () => {
    const v = verifyGeneration("synthesis", "Il a terminé 12 défis ce mois-ci.");
    expect(v.violations.some((x) => x.rule === "prose.zero_chiffre")).toBe(true);
  });

  it("texte vide → majeur", () => {
    const v = verifyGeneration("letter", "");
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "letter.text_present")).toBe(true);
  });
});

describe("verifyGeneration — preuve, classification, tampon", () => {
  it("proof_validation sans observations → majeur", () => {
    const v = verifyGeneration("proof_validation", {
      observations: "",
      talents_awarded: { spatial: 2 },
    });
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "proof_validation.observations_present")).toBe(true);
  });

  it("proof_validation avec clé de talent hallucinée → majeur", () => {
    const v = verifyGeneration("proof_validation", {
      observations: "Bravo !",
      talents_awarded: { spacial: 2 },
    });
    expect(
      v.violations.some(
        (x) => x.rule === "proof_validation.talents_valid" && x.severity === "majeur",
      ),
    ).toBe(true);
  });

  it("classification avec cause invalide → majeur", () => {
    const v = verifyGeneration("not_completed_classification", { cause: "BOREDOM" });
    expect(v.conformity).toBe("majeur");
    expect(v.violations.some((x) => x.rule === "classification.cause_valid")).toBe(true);
  });

  it("classification avec cause valide → conforme", () => {
    const v = verifyGeneration("not_completed_classification", { cause: "PERFORMANCE_ANXIETY" });
    expect(v.conformity).toBe("conforme");
  });

  it("proof_tampon vide → majeur", () => {
    const v = verifyGeneration("proof_tampon", { tampon: "" });
    expect(v.conformity).toBe("majeur");
  });
});

describe("couverture des rubriques sémantiques (couche 2)", () => {
  const ALL_KINDS = [
    "challenge_bulk",
    "challenge_single",
    "homework",
    "recommendation",
    "discriminant",
    "support_retest",
    "hypothesis",
    "proof_validation",
    "not_completed_classification",
    "synthesis",
    "letter",
    "narrative",
    "proof_tampon",
  ] as const;

  it("fournit une rubrique non vide pour chaque type de génération", () => {
    for (const kind of ALL_KINDS) {
      expect(
        semanticRubricFor(kind).trim().length,
        `rubrique manquante pour ${kind}`,
      ).toBeGreaterThan(50);
    }
  });

  it("la rubrique défi couvre les critères clés (observable, anti-bricolage, matériaux, non-générique…)", () => {
    const r = semanticRubricFor("challenge_single");
    for (const marker of [
      "observable",
      "anti-bricolage-passif",
      "materiaux-realistes-africains",
      "non-generique",
      "coherence-academic-level",
      "proof-mode-coherent",
      "supervision-coherent",
    ]) {
      expect(r, `marqueur manquant : ${marker}`).toContain(marker);
    }
  });

  it("la rubrique récit couvre factualité douce, ton non-pathologisant, zéro chiffre", () => {
    const r = semanticRubricFor("synthesis");
    for (const marker of ["factualite-douce", "ton-non-pathologisant", "zero-chiffre"]) {
      expect(r, `marqueur manquant : ${marker}`).toContain(marker);
    }
  });

  it("la rubrique hypothèse couvre l'ancrage aux nœuds du snapshot", () => {
    expect(semanticRubricFor("hypothesis")).toContain("evidence-snapshot");
  });
});

describe("verrouillage des tables locales du Loup", () => {
  it("les clés d'intelligence du Loup égalent VALID_TALENT_KEYS (talent-buckets)", () => {
    expect([...NAYA_LOCAL_TALENT_KEYS].sort()).toEqual([...VALID_TALENT_KEYS].sort());
  });

  it("les sous-formes du Loup égalent TALENT_SUBFORMS (challenges.functions)", () => {
    expect(NAYA_LOCAL_SUBFORMS).toEqual(TALENT_SUBFORMS);
  });
});

describe("mergeViolations", () => {
  it("déduplique par règle et fait primer la sévérité majeure", () => {
    const merged = mergeViolations(
      [{ rule: "a", severity: "mineur", detail: "1" }],
      [
        { rule: "a", severity: "majeur", detail: "2" },
        { rule: "b", severity: "mineur", detail: "3" },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((x) => x.rule === "a")?.severity).toBe("majeur");
  });
});

describe("buildRecadrageSuffix (mode enforce, C2.4)", () => {
  it("vide sans violation majeure", () => {
    const verdict: VerifyVerdict = {
      conformity: "mineur",
      violations: [{ rule: "x", severity: "mineur", detail: "d" }],
    };
    expect(buildRecadrageSuffix(verdict)).toBe("");
  });

  it("liste les règles majeures et leurs suggestions", () => {
    const verdict: VerifyVerdict = {
      conformity: "majeur",
      violations: [
        {
          rule: "challenge.intelligences_valid",
          severity: "majeur",
          detail: "Clé invalide.",
          suggestion: "Corrige la clé.",
        },
      ],
    };
    const suffix = buildRecadrageSuffix(verdict);
    expect(suffix).toContain("challenge.intelligences_valid");
    expect(suffix).toContain("Corrige la clé.");
  });
});

describe("non-régression : finalizeChallenge reste compatible avec le Loup", () => {
  const rawLLMOutput = {
    title: "Tour de magie des fractions",
    description: "Découvre le secret des fractions en découpant une galette en parts égales.",
    steps: ["Prends 4 pièces", "Cache une pièce", "Montre le tour", "Explique la fraction"],
    materials: ["pièces", "feuille"],
    intelligences: ["logico_mathematique"],
    difficulty: "difficile",
    proof_mode: "video", // hors spec — finalizeChallenge doit la résoudre
    academic_domain: "mathematiques",
    academic_level_age: 8,
    academic_reference_note: "Les fractions simples (1/2, 1/4).",
    requires_supervision: false,
  };

  it("finalizeChallenge résout toujours les champs hors spec (difficulté, proof_mode)", () => {
    const finalized = finalizeChallenge(rawLLMOutput, 8);
    expect(["facile", "moyen", "difficile"]).toContain(finalized.difficulty);
    expect(["photo", "declarative"]).toContain(finalized.proof_mode);
  });

  it("un défi finalisé (persisté) ne déclenche aucune violation majeure du Loup", () => {
    const finalized = { ...rawLLMOutput, ...finalizeChallenge(rawLLMOutput, 8) };
    const verdict = verifyGeneration("challenge_single", finalized, { childAge: 8 });
    expect(verdict.conformity).not.toBe("majeur");
  });
});

// ============================================================================
// « Le Loup » — garde-fous coût (chantier 4, C4.3)
// ============================================================================

describe("garde-fous coût du Loup (C4.3)", () => {
  it("boundSemanticMaxTokens plafonne entre 300 et 800", () => {
    expect(boundSemanticMaxTokens("999")).toBe(800);
    expect(boundSemanticMaxTokens("250")).toBe(300);
    expect(boundSemanticMaxTokens("800")).toBe(800);
    expect(boundSemanticMaxTokens("60")).toBe(300);
    expect(boundSemanticMaxTokens("abc")).toBe(800); // défaut
    expect(boundSemanticMaxTokens("")).toBe(800); // défaut
  });

  it("truncateJsonForLoup garde intacte une sortie courte", () => {
    const out = { title: "défi", steps: ["a", "b"] };
    expect(truncateJsonForLoup(out, 10_000)).toBe(JSON.stringify(out));
  });

  it("truncateJsonForLoup borne la taille envoyée au Loup", () => {
    const big = {
      items: Array.from(
        { length: 500 },
        (_, i) => `défi numéro ${i} avec une description plutôt longue pour gonfler le payload`,
      ),
    };
    const truncated = truncateJsonForLoup(big, 500);
    expect(truncated.length).toBeLessThanOrEqual(500 + 100);
    expect(truncated).toContain("[tronqué par le Louveteau");
  });

  it("verifierEnabled est actif par défaut (kill-switch off)", () => {
    expect(verifierEnabled()).toBe(true);
  });
});
