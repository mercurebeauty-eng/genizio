import { describe, it, expect } from "vitest";
import {
  INTEREST_MIN_TRIALS,
  INTEREST_CONFIRM_THRESHOLD,
  INTEREST_REFUTE_THRESHOLD,
  INTEREST_PRIOR_CONFIDENCE,
  INTEREST_DECAY_WINDOW,
  INTEREST_DECAY_FLOOR,
  resolveInterestHypotheses,
  getInterestHypothesesSnapshot,
} from "@/lib/interest-confidence";
import { formatChildInterestsPayload } from "@/lib/challenges.functions";

const TAG_LOGICO = "Pose sans arrêt la question 'Pourquoi ?'"; // → logico_mathematique
const TAG_CORPORELLE = "A besoin de bouger pour réfléchir"; // → corporelle
const TAG_LINGUISTIQUE = "Retient très facilement les histoires"; // → linguistique

describe("resolveInterestHypotheses", () => {
  it("profil neuf : chaque intérêt déclaré est une hypothèse non testée (prior 0.5)", () => {
    const result = resolveInterestHypotheses({ declared: [TAG_LOGICO, TAG_CORPORELLE] });

    expect(Object.keys(result.byTag)).toHaveLength(2);
    for (const h of Object.values(result.byTag)) {
      expect(h.status).toBe("untested");
      expect(h.confidence).toBe(INTEREST_PRIOR_CONFIDENCE);
      expect(h.trials).toBe(0);
      expect(h.engagement).toBe(0);
    }
    expect(result.confirmedTags).toEqual([]);
    expect(result.refutedTags).toEqual([]);
    expect(result.untestedTags).toHaveLength(2);
    expect(result.parentInfluence).toBe(1);
    expect(result.totalEvidence).toBe(0);
  });

  it("aucun intérêt déclaré → aucune hypothèse, influence parentale maximale", () => {
    const result = resolveInterestHypotheses({ declared: null });

    expect(result.byTag).toEqual({});
    expect(result.parentInfluence).toBe(1);
    expect(result.totalEvidence).toBe(0);
  });

  it("le mapping tag → groupe Gardner est utilisé (tag logico lit la compétence logico_mathematique)", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 8 } },
    });

    expect(result.byTag[TAG_LOGICO]).toMatchObject({
      talentKey: "logico_mathematique",
      talentLabel: "🧠 Logique",
      status: "confirmed",
      completions: 8,
      abandoned: 0,
      trials: 8,
      engagement: 1,
    });
  });

  it("8 complétions validées, 0 abandon → confirmé (score 1.0)", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_CORPORELLE],
      competencies: { corporelle: { n: INTEREST_MIN_TRIALS } },
    });

    expect(result.byTag[TAG_CORPORELLE].status).toBe("confirmed");
    expect(result.byTag[TAG_CORPORELLE].confidence).toBe(1);
    expect(result.confirmedTags).toEqual([TAG_CORPORELLE]);
  });

  it("fenêtre non atteinte (7 complétions) → encore non testé, même avec un score parfait", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: INTEREST_MIN_TRIALS - 1 } },
    });

    expect(result.byTag[TAG_LOGICO].status).toBe("untested");
    expect(result.byTag[TAG_LOGICO].confidence).toBe(INTEREST_PRIOR_CONFIDENCE);
  });

  it("8 essais dont 5 abandons → écarté (le ratio net est plafonné à 0)", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 3 } },
      abandonedByTalent: { logico_mathematique: 5 },
    });

    expect(result.byTag[TAG_LOGICO].trials).toBe(8);
    expect(result.byTag[TAG_LOGICO].engagement).toBe(0);
    expect(result.byTag[TAG_LOGICO].status).toBe("refuted");
    expect(result.refutedTags).toEqual([TAG_LOGICO]);
  });

  it("ratio neutre (6 complétions / 2 abandons sur 8) → neutral", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 6 } },
      abandonedByTalent: { logico_mathematique: 2 },
    });

    // engagement = (6-2)/8 = 0.5, entre 0.35 et 0.65
    expect(result.byTag[TAG_LOGICO].engagement).toBe(0.5);
    expect(result.byTag[TAG_LOGICO].status).toBe("neutral");
  });

  it("seuil confirmé franchi (7 complétions / 1 abandon → 0.75 ≥ 0.65)", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LINGUISTIQUE],
      competencies: { linguistique: { n: 7 } },
      abandonedByTalent: { linguistique: 1 },
    });

    expect(result.byTag[TAG_LINGUISTIQUE].engagement).toBe(0.75);
    expect(result.byTag[TAG_LINGUISTIQUE].status).toBe("confirmed");
  });

  it("seuil écarté franchi (5 complétions / 3 abandons → 0.25 ≤ 0.35)", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LINGUISTIQUE],
      competencies: { linguistique: { n: 5 } },
      abandonedByTalent: { linguistique: 3 },
    });

    expect(result.byTag[TAG_LINGUISTIQUE].engagement).toBe(0.25);
    expect(result.byTag[TAG_LINGUISTIQUE].status).toBe("refuted");
  });

  it("un tag hors référentiel n'est jamais écarté (on ne lit pas de données qu'on ne sait pas rattacher)", () => {
    const result = resolveInterestHypotheses({
      declared: ["Rêve de devenir astronaute"],
      competencies: { logico_mathematique: { n: 8 } },
      abandonedByTalent: { logico_mathematique: 8 },
    });

    expect(result.byTag["Rêve de devenir astronaute"]).toMatchObject({
      talentKey: "unknown",
      status: "untested",
      confidence: INTEREST_PRIOR_CONFIDENCE,
      trials: 0,
    });
  });

  it("les observations d'un talent non déclaré n'entrent pas dans les hypothèses mais comptent pour le déclin", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 2 }, corporelle: { n: 18 } },
      abandonedByTalent: { corporelle: 2 },
    });

    expect(Object.keys(result.byTag)).toEqual([TAG_LOGICO]);
    // 2 + 18 + 2 = 22 observations → plancher d'influence atteint
    expect(result.totalEvidence).toBe(22);
    expect(result.parentInfluence).toBe(INTEREST_DECAY_FLOOR);
  });

  it("déclin linéaire de l'influence parentale sur 20 défis, plancher 20 %", () => {
    const at0 = resolveInterestHypotheses({ declared: [TAG_LOGICO] });
    const at10 = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 8 } },
      abandonedByTalent: { logico_mathematique: 2 },
    });
    const at20 = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 20 } },
    });
    const at40 = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 40 } },
    });

    expect(at0.parentInfluence).toBe(1);
    expect(at10.parentInfluence).toBe(0.5);
    expect(at20.parentInfluence).toBe(INTEREST_DECAY_FLOOR);
    expect(at40.parentInfluence).toBe(INTEREST_DECAY_FLOOR);
  });

  it("liste mixte : confirmed / refuted / untested cohabitent", () => {
    const result = resolveInterestHypotheses({
      declared: [TAG_LOGICO, TAG_CORPORELLE, TAG_LINGUISTIQUE],
      competencies: { logico_mathematique: { n: 8 }, linguistique: { n: 2 } },
      abandonedByTalent: { corporelle: 8 },
    });

    expect(result.byTag[TAG_LOGICO].status).toBe("confirmed");
    expect(result.byTag[TAG_CORPORELLE].status).toBe("refuted"); // 0 complétion / 8 abandons → engagement 0
    expect(result.byTag[TAG_LINGUISTIQUE].status).toBe("untested"); // 2 essais < 8
    expect(result.confirmedTags).toEqual([TAG_LOGICO]);
    expect(result.refutedTags).toEqual([TAG_CORPORELLE]);
    expect(result.untestedTags).toEqual([TAG_LINGUISTIQUE]);
  });
});

describe("getInterestHypothesesSnapshot", () => {
  const mkDb = (
    overrides: { child?: any; twin?: any; abandoned?: any[]; fail?: boolean } = {},
  ) => ({
    from: (table: string) => {
      if (overrides.fail) throw new Error("table indisponible");
      if (table === "child_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: overrides.child ?? { id: "c1", interests: [TAG_LOGICO, TAG_LINGUISTIQUE] },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "pedagogical_twins") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: overrides.twin ?? null, error: null }),
            }),
          }),
        };
      }
      // challenges — la chaîne se termine par un .eq() thenable (await direct)
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: overrides.abandoned ?? [], error: null }),
          }),
        }),
      };
    },
  });

  it("agrège les 3 sources : complétions du jumeau + abandons par groupe Gardner", async () => {
    const db = mkDb({
      twin: { competencies: { logico_mathematique: { n: 8 } } },
      abandoned: [
        { target_intelligences: ["linguistique"] },
        { target_intelligences: ["linguistique"] },
      ],
    });

    const result = await getInterestHypothesesSnapshot(db, "c1");

    expect(result).not.toBeNull();
    expect(result!.byTag[TAG_LOGICO].status).toBe("confirmed");
    expect(result!.byTag[TAG_LINGUISTIQUE]).toMatchObject({
      status: "untested", // 2 essais (abandons) < 8
      completions: 0,
      abandoned: 2,
    });
    expect(result!.parentInfluence).toBe(0.5); // 8 + 2 = 10 / 20
  });

  it("ne compte que les clés Gardner dans les abandons (labels décoratifs ignorés)", async () => {
    const db = mkDb({
      twin: { competencies: { linguistique: { n: 2 } } },
      abandoned: [
        { target_intelligences: ["Créativité"] }, // label décoratif de création, ignoré
        { target_intelligences: ["linguistique", "spatial"] },
      ],
    });

    const result = await getInterestHypothesesSnapshot(db, "c1");

    expect(result!.byTag[TAG_LINGUISTIQUE].abandoned).toBe(1);
    // spatial est une clé Gardner valide : non déclarée, elle ne touche aucune hypothèse
    // mais compte dans le déclin → 2 complétions + 1 abandon (linguistique) + 1 (spatial).
    expect(result!.totalEvidence).toBe(4);
  });

  it("échec de lecture → null (la génération retombe sur le formatage brut, elle ne casse pas)", async () => {
    const db = mkDb({ fail: true });

    const result = await getInterestHypothesesSnapshot(db, "c1");

    expect(result).toBeNull();
  });

  it("profil sans jumeau → hypothèses toutes non testées, jamais d'erreur", async () => {
    const db = mkDb({ twin: null, abandoned: [] });

    const result = await getInterestHypothesesSnapshot(db, "c1");

    expect(result).not.toBeNull();
    expect(Object.values(result!.byTag).every((h) => h.status === "untested")).toBe(true);
  });
});

describe("formatChildInterestsPayload (v2 pondérée)", () => {
  it("sans snapshot → comportement historique inchangé", () => {
    expect(formatChildInterestsPayload([TAG_LOGICO])).toBe(`- [🧠 Logique] "${TAG_LOGICO}"`);
    expect(formatChildInterestsPayload(["Rêve de devenir astronaute"])).toBe(
      `- [Levier d'action] "Rêve de devenir astronaute"`,
    );
    expect(formatChildInterestsPayload(undefined)).toBe(
      "Aucun levier spécifique renseigné — explorer et expérimenter avec différentes postures d'apprentissage.",
    );
  });

  it("hypothèse confirmée → créditée 'confirmé par l'expérience' + en-tête avec influence", () => {
    const hypotheses = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 8 } },
    });

    expect(formatChildInterestsPayload([TAG_LOGICO], hypotheses)).toBe(
      `Déclaration du parent, hypothèse de travail — l'expérience réelle prime (influence parentale actuelle : 60 %).\n` +
        `- [🧠 Logique] "${TAG_LOGICO}" — confirmé par l'expérience`,
    );
  });

  it("hypothèse non testée → marquée 'à confirmer (à tester en priorité)'", () => {
    const hypotheses = resolveInterestHypotheses({ declared: [TAG_CORPORELLE] });

    expect(formatChildInterestsPayload([TAG_CORPORELLE], hypotheses)).toBe(
      `Déclaration du parent, hypothèse de travail — l'expérience réelle prime (influence parentale actuelle : 100 %).\n` +
        `- [🏃 Corporelle] "${TAG_CORPORELLE}" — hypothèse du parent à confirmer (à tester en priorité)`,
    );
  });

  it("hypothèse écartée → retirée de la liste + ligne finale 'Intérêt déclaré non confirmé'", () => {
    const hypotheses = resolveInterestHypotheses({
      declared: [TAG_LOGICO, TAG_LINGUISTIQUE],
      competencies: { logico_mathematique: { n: 3 } },
      abandonedByTalent: { logico_mathematique: 5 },
    });

    const output = formatChildInterestsPayload([TAG_LOGICO, TAG_LINGUISTIQUE], hypotheses);

    expect(output).not.toContain(`- [🧠 Logique] "${TAG_LOGICO}"`); // retiré de la liste active
    expect(output).toContain(
      `Intérêt déclaré non confirmé : "${TAG_LOGICO}" — ne pas l'utiliser comme moteur d'engagement, explorer d'autres pistes.`,
    );
    expect(output).toContain(
      `"${TAG_LINGUISTIQUE}" — hypothèse du parent à confirmer (à tester en priorité)`,
    );
  });

  it("tous les leviers écartés → note 'tous les leviers déclarés ont été écartés'", () => {
    const hypotheses = resolveInterestHypotheses({
      declared: [TAG_LOGICO],
      competencies: { logico_mathematique: { n: 2 } },
      abandonedByTalent: { logico_mathematique: 6 },
    });

    const output = formatChildInterestsPayload([TAG_LOGICO], hypotheses);

    expect(output).toContain("tous les leviers déclarés ont été écartés par l'expérience");
    expect(output).toContain(`Intérêt déclaré non confirmé : "${TAG_LOGICO}"`);
  });

  it("aucun intérêt → message inchangé même avec un snapshot", () => {
    const hypotheses = resolveInterestHypotheses({ declared: [TAG_LOGICO] });

    expect(formatChildInterestsPayload(undefined, hypotheses)).toBe(
      "Aucun levier spécifique renseigné — explorer et expérimenter avec différentes postures d'apprentissage.",
    );
  });
});
