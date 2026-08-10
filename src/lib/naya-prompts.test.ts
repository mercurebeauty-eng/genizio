import { describe, it, expect } from "vitest";
import {
  NAYA_SYSTEM_PROMPT,
  NAYA_SYSTEM_PROMPT_JSON,
  NAYA_DIAGNOSIS_SYSTEM_REMINDERS,
  GENIZIO_PRINCIPLES,
  SAFETY_INSTRUCTION,
  PROOF_MODE_INSTRUCTION,
  ACADEMIC_REFERENTIAL_INSTRUCTION,
  ACADEMIC_SECRET_INSTRUCTION,
  AGE_DEVELOPMENT_GUIDANCE,
  MATERIAL_TAGS_INSTRUCTION,
  INTELLIGENCES_FIELD_INSTRUCTION,
  TRAIT_SUBFORM_INSTRUCTION,
  STEPS_INSTRUCTION,
  buildAvoidRepeatsInstruction,
  buildChallengePrompt,
  buildSingleChallengePrompt,
  buildHomeworkPrompt,
  buildRecommendationPrompt,
  buildHypothesisPrompt,
} from "@/lib/naya-prompts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===========================================================================
// CHANTIER 1 « Naya 3.0 » — contrat des builders purs, identité system et
// couverture des rubriques. Ces tests protègent la constitution : une future
// édition qui ferait tomber une rubrique d'un prompt la ferait tomber aussi des
// builders (source unique) et casserait ici, avant tout impact production.
// ===========================================================================

describe("NAYA_SYSTEM_PROMPT — identité experte (C1.2)", () => {
  it("porte le persona mentor d'éveil des talents, pas un placeholder générique", () => {
    expect(NAYA_SYSTEM_PROMPT).toContain("Tu es Naya");
    expect(NAYA_SYSTEM_PROMPT).toContain("5 à 16 ans");
    expect(NAYA_SYSTEM_PROMPT).toContain("Howard Gardner");
    expect(NAYA_SYSTEM_PROMPT).toContain("Afrique francophone");
    // Posture fondatrice : observation factuelle, jamais de diagnostic.
    expect(NAYA_SYSTEM_PROMPT).toContain("Tu observes, tu décris, tu proposes");
    expect(NAYA_SYSTEM_PROMPT).toContain("jamais");
  });

  it("NAYA_SYSTEM_PROMPT_JSON = persona + contrainte de format JSON brut", () => {
    expect(NAYA_SYSTEM_PROMPT_JSON).toContain(NAYA_SYSTEM_PROMPT);
    expect(NAYA_SYSTEM_PROMPT_JSON).toContain("JSON brut, sans bloc de code Markdown");
    expect(NAYA_SYSTEM_PROMPT_JSON).toContain("sans préambule ni explications");
  });

  it("le placeholder « Tu es un assistant IA précis » a disparu du module system", () => {
    expect(NAYA_SYSTEM_PROMPT).not.toContain("assistant IA précis");
    expect(NAYA_SYSTEM_PROMPT_JSON).not.toContain("Tu es un assistant IA précis.");
  });

  it("l'ancien placeholder ne subsiste plus comme littéral system dans challenges.functions.ts", () => {
    const source = readFileSync(
      resolve(__dirname, "../lib/challenges.functions.ts"),
      "utf-8"
    );
    // Le littéral d'origine était une chaîne entre guillemets droits ; les mentions
    // « … » en commentaires documentent le remplacement et sont légitimes.
    expect(source).not.toContain('"Tu es un assistant IA précis');
    expect(source).toContain("NAYA_SYSTEM_PROMPT_JSON");
  });
});

describe("buildChallengePrompt — contrat (C1.3)", () => {
  const input = {
    count: 3,
    childName: "Awa",
    childAge: 9,
    location: "Dakar, Sénégal",
    interestsPayload: "Aime démonter pour comprendre.",
    talentsJson: '{"logico_mathematique": 2}',
    completedSummary: '- Défi "Tour d\'eau" (sciences) : "très curieuse"',
    progressionInstruction: "PROGRESSION MESURÉE : mathématiques → 9 ans.",
    leastExplored: ["artisanale", "spatiale"],
    domainsText: "sciences, mathematiques",
    ignoredDomains: ["langage"],
    existingTitles: ["Défi déjà vu"],
    seasonInstruction: '- THÉMATIQUE DE SAISON ("Safari") : scénarise.',
  };

  it("injecte le profil, les observations et la progression", () => {
    const p = buildChallengePrompt(input);
    expect(p).toContain("Génère 3 défis d'apprentissage sur mesure");
    expect(p).toContain("Awa");
    expect(p).toContain("9 ans");
    expect(p).toContain("Dakar, Sénégal");
    expect(p).toContain(input.interestsPayload);
    expect(p).toContain(input.talentsJson);
    expect(p).toContain(input.completedSummary);
    expect(p).toContain(input.progressionInstruction);
    expect(p).toContain("artisanale et spatiale");
    expect(p).toContain(input.domainsText);
    expect(p).toContain("Défi déjà vu");
  });

  it("couvre toutes les rubriques partagées (couverture des rubriques)", () => {
    const p = buildChallengePrompt(input);
    const rubriques: Array<[string, string]> = [
      ["principes", GENIZIO_PRINCIPLES.slice(0, 40)],
      ["âge", AGE_DEVELOPMENT_GUIDANCE.slice(0, 30)],
      ["étapes", STEPS_INSTRUCTION.slice(0, 20)],
      ["anti-répétition", buildAvoidRepeatsInstruction(["Défi déjà vu"]).slice(0, 30)],
      ["matériaux", MATERIAL_TAGS_INSTRUCTION.slice(0, 25)],
      ["intelligences", INTELLIGENCES_FIELD_INSTRUCTION.slice(0, 25)],
      ["sous-forme", TRAIT_SUBFORM_INSTRUCTION.slice(0, 25)],
      ["sécurité", SAFETY_INSTRUCTION.slice(0, 20)],
      ["preuve", PROOF_MODE_INSTRUCTION.slice(0, 20)],
      ["référentiel", ACADEMIC_REFERENTIAL_INSTRUCTION.slice(0, 25)],
      ["secret", ACADEMIC_SECRET_INSTRUCTION.slice(0, 25)],
    ];
    for (const [nom, fragment] of rubriques) {
      expect(p, `rubrique manquante : ${nom}`).toContain(fragment);
    }
  });

  it("scénarise la saison et gère la note des domaines ignorés", () => {
    expect(buildChallengePrompt(input)).toContain(input.seasonInstruction);
    expect(buildChallengePrompt(input)).toContain("sans jamais les commencer");

    const sansIgnorés = buildChallengePrompt({ ...input, ignoredDomains: [] });
    expect(sansIgnorés).not.toContain("sans jamais les commencer");
  });

  it("conserve le schéma JSON bulk complet", () => {
    const p = buildChallengePrompt(input);
    expect(p).toContain('{"challenges":[{"domain":"..."');
    expect(p).toContain('"academic_secret":"Explication stimulante');
  });
});

describe("buildSingleChallengePrompt — contrat (C1.3)", () => {
  const input = {
    childName: "Idriss",
    childAge: 7,
    profileLocation: "Abidjan, Côte d'Ivoire",
    interestsPayload: "A besoin de bouger pour réfléchir.",
    talentsJson: '{"corporelle": 3}',
    completedSummary: "",
    existingTitles: [],
    timeAvailable: "45 min",
    immediateLocation: "Cour (Extérieur)",
    homeMaterialsLine: "- Matériaux/objets disponibles à la maison : bouteilles",
    progressionInstruction: "PROGRESSION MESURÉE : aucune mesure.",
    domainInstruction: '3. Tu DOIS générer un défi spécifiquement dans le domaine : "corporelle".',
    seasonInstruction: "",
    materialScopeInstruction: "5. MATÉRIEL (MIXTE) : Libre à toi !",
    homeMaterialsUseLine: "6. UTILISATION DES MATÉRIAUX MENTIONNÉS : Tu DOIS concevoir un défi...",
  };

  it("injecte profil, contexte immédiat et instructions conditionnelles", () => {
    const p = buildSingleChallengePrompt(input);
    expect(p).toContain("Idriss");
    expect(p).toContain("7 ans");
    expect(p).toContain("45 min");
    expect(p).toContain("Cour (Extérieur)");
    expect(p).toContain(input.homeMaterialsLine);
    expect(p).toContain(input.domainInstruction);
    expect(p).toContain(input.materialScopeInstruction);
    expect(p).toContain(input.homeMaterialsUseLine);
  });

  it("couvre toutes les rubriques numérotées 7 à 14", () => {
    const p = buildSingleChallengePrompt(input);
    expect(p).toContain(`7. ${SAFETY_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`8. ${MATERIAL_TAGS_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`9. ${INTELLIGENCES_FIELD_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`10. ${TRAIT_SUBFORM_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`11. ${STEPS_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`12. ${PROOF_MODE_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`13. ${ACADEMIC_REFERENTIAL_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`14. ${ACADEMIC_SECRET_INSTRUCTION.slice(0, 20)}`);
  });
});

describe("buildHomeworkPrompt — contrat (C1.3)", () => {
  const base = {
    childName: "Moussa",
    childAge: 10,
    gradeInfoLabel: "CM1",
    gradeInfoCycle: "Cycle 3",
    profileLocation: "Bamako, Mali",
    interestsPayload: "Aime démonter pour comprendre.",
    subjectLabel: "Mathématiques",
    subject: "maths",
    gradeLevelKey: "cm1",
    targetAge: 9,
    homeworkInstruction: "Révise les tables de multiplication",
    topicContext: '- Thème de programme suggéré : "Les tables" (Accroche : X)',
    timeAvailable: "30 min",
    homeMaterialsLine: "- Matériaux disponibles à la maison : perles",
    zpaLevel: 3,
    zpaSupportMode: "MEDIUM_SUPPORT",
    zpaRationale: "Maîtrise partielle.",
    anxietyLine: "",
    driverGuidance: "Utilise le levier déconstruire.",
    selectedDriver: "deconstruire",
    existingTitles: [],
  };

  it("injecte consigne scolaire, ZPA et levier comportemental", () => {
    const p = buildHomeworkPrompt(base);
    expect(p).toContain("Moussa");
    expect(p).toContain("CM1");
    expect(p).toContain("Révise les tables de multiplication");
    expect(p).toContain("Niveau 3 (MEDIUM_SUPPORT)");
    expect(p).toContain("Utilise le levier déconstruire.");
    expect(p).toContain(base.topicContext);
  });

  it("mappe maths → domaines/intelligences du JSON et échappe la consigne", () => {
    const p = buildHomeworkPrompt(base);
    expect(p).toContain('"domain": "Sciences"');
    expect(p).toContain('"intelligences": ["logico_mathematique"]');
    expect(p).toContain('"academic_domain": "mathematiques"');
    expect(p).toContain('"behavioral_driver": "deconstruire"');
    expect(p).toContain('"zpa_level": 3');
    expect(p).toContain('"homework_instruction": "Révise les tables de multiplication"');
  });

  it("ajoute la ligne d'anxiété quand ZPA la détecte", () => {
    const p = buildHomeworkPrompt({ ...base, anxietyLine: "- CONTEXTE D'ANXIÉTÉ DÉTECTÉ : Propose un soutien renforcé." });
    expect(p).toContain("CONTEXTE D'ANXIÉTÉ DÉTECTÉ");
    expect(buildHomeworkPrompt(base)).not.toContain("CONTEXTE D'ANXIÉTÉ DÉTECTÉ");
  });

  it("couvre les 11 règles de fusion", () => {
    const p = buildHomeworkPrompt(base);
    expect(p).toContain(`4. ${GENIZIO_PRINCIPLES.slice(0, 20)}`);
    expect(p).toContain(`6. ${STEPS_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`7. ${SAFETY_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`8. ${PROOF_MODE_INSTRUCTION.slice(0, 20)}`);
    expect(p).toContain(`11. ${ACADEMIC_SECRET_INSTRUCTION.slice(0, 20)}`);
  });
});

describe("buildRecommendationPrompt — contrat des 4 modes (C1.3)", () => {
  const commun = {
    childName: "Fatou",
    childAge: 8,
    interestsPayload: "Aime enquêter.",
  };

  it("stabilisation_cycle : rassure, domaine ciblé, cible declarative triviale", () => {
    const p = buildRecommendationPrompt({ ...commun, mode: "stabilisation_cycle", subject: "mathématiques" });
    expect(p).toContain("micro-défi de STABILISATION");
    expect(p).toContain("spécifiquement en mathématiques");
    expect(p).toContain('"domain": "mathématiques"');
    expect(p).toContain("une cible \"declarative\" doit rester trivialement atteignable");
    expect(p).toContain(STEPS_INSTRUCTION.slice(0, 20));
    expect(p).toContain(ACADEMIC_REFERENTIAL_INSTRUCTION.slice(0, 25));
  });

  it("essaimage : force → faiblesse", () => {
    const p = buildRecommendationPrompt({ ...commun, mode: "essaimage", strengthLabel: "corporelle", weaknessLabel: "langage" });
    expect(p).toContain("micro-défi d'ESSAIMAGE");
    expect(p).toContain("Utiliser sa FORCE (corporelle)");
    expect(p).toContain("compétence en progression (langage)");
    expect(p).not.toContain("trivialement atteignable");
  });

  it("stabilisation_fragilite : compétence en dents de scie + levier confort", () => {
    const p = buildRecommendationPrompt({ ...commun, mode: "stabilisation_fragilite", comfortSkillText: "sa force reconnue (spatiale)" });
    expect(p).toContain("phase instable sur une compétence");
    expect(p).toContain("appuyé sur sa force reconnue (spatiale)");
    expect(p).toContain("trivialement atteignable");

    const défaut = buildRecommendationPrompt({ ...commun, mode: "stabilisation_fragilite" });
    expect(défaut).toContain("appuyé sur quelque chose de familier et confortable");
  });

  it("exploration : cible l'intelligence la moins explorée", () => {
    const p = buildRecommendationPrompt({ ...commun, mode: "exploration", targetLabel: "artisanale" });
    expect(p).toContain("Conçois LE prochain défi d'EXPLORATION");
    expect(p).toContain('Cible en priorité l\'intelligence "artisanale"');
    expect(p).toContain('"difficulty": "moyen"');
    expect(p).not.toContain("trivialement atteignable");

    const défaut = buildRecommendationPrompt({ ...commun, mode: "exploration" });
    expect(défaut).toContain('l\'intelligence "polyvalente"');
  });

  it("tous les modes couvrent le pied de constitution", () => {
    for (const mode of ["stabilisation_cycle", "essaimage", "stabilisation_fragilite", "exploration"] as const) {
      const p = buildRecommendationPrompt({ ...commun, mode, subject: "sciences" });
      expect(p).toContain(PROOF_MODE_INSTRUCTION.slice(0, 20));
      expect(p).toContain(ACADEMIC_SECRET_INSTRUCTION.slice(0, 25));
      expect(p).toContain("Format JSON strict :");
    }
  });
});

describe("buildHypothesisPrompt — contrat (C1.3)", () => {
  it("concatène rappels system + snapshot d'investigation structuré", () => {
    const p = buildHypothesisPrompt({
      enfant: { prenom: "Awa", age: 9 },
      ecartReferentiel: { domaine: "sciences", direction: "en retard sur le référentiel", niveaux_recents_observes: [1, 2] },
      jumeauPedagogique: { moteurs: { curiosite: 0.8 }, competences_gardner: {}, interets: {} },
    });
    expect(p).toContain(NAYA_DIAGNOSIS_SYSTEM_REMINDERS);
    expect(p).toContain("PARADIGME D'INVESTIGATION");
    expect(p).toContain("Voici le cas à diagnostiquer :");
    // Les trois blocs du snapshot sont présents, avec leurs clés françaises.
    expect(p).toContain('"enfant"');
    expect(p).toContain('"ecart_referentiel"');
    expect(p).toContain('"jumeau_pedagogique"');
    expect(p).toContain('"prenom": "Awa"');
    expect(p).toContain('"domaine": "sciences"');
  });
});

describe("fragments partagés — source unique (C1.1)", () => {
  it("buildAvoidRepeatsInstruction produit la liste des titres et l'injonction de varier", () => {
    const p = buildAvoidRepeatsInstruction(["A", "B"]);
    expect(p).toContain("Ne répète pas ces titres déjà proposés à cet enfant (A | B)");
    expect(p).toContain("varie consciemment vers une autre approche");
    // Cas liste vide : "(aucun)" sans rupture.
    expect(buildAvoidRepeatsInstruction([])).toContain("(aucun)");
  });

  it("les constantes extraites restent accessibles depuis challenges.functions (ré-export)", () => {
    // Évite une régression silencieuse : challenges.functions.ts ré-exporte les
    // constantes pour les importeurs existants (hypotheses, recommendations…).
    // Chargé ici via le chemin du module pur — l'assertion porte sur la valeur
    // identique des constantes exposées, pas sur l'import croisé.
    expect(GENIZIO_PRINCIPLES).toContain("INTERDICTION DU BRICOLAGE PASSIF");
    expect(PROOF_MODE_INSTRUCTION).toContain("declarative");
    expect(STEPS_INSTRUCTION).toContain("UN SEUL geste concret");
  });
});

describe("Décision #59 — chiffres/mesures réels et benchmark international (2026-08-10)", () => {
  const input = {
    count: 2,
    childName: "Awa",
    childAge: 9,
    location: "Abidjan, Côte d'Ivoire",
    interestsPayload: "Aime mesurer et comparer.",
    talentsJson: '{"logico_mathematique": 3}',
    completedSummary: "",
    progressionInstruction: "PROGRESSION MESURÉE : mathématiques → 10 ans.",
    leastExplored: ["langage"],
    domainsText: "mathematiques, sciences",
    ignoredDomains: [],
    existingTitles: [],
    seasonInstruction: "",
  };

  it("GENIZIO_PRINCIPLES impose des chiffres et mesures réels dans les étapes", () => {
    expect(GENIZIO_PRINCIPLES).toContain("CHIFFRES ET MESURES RÉELS OBLIGATOIRES");
    expect(GENIZIO_PRINCIPLES).toContain("VALEURS EXACTES");
    expect(GENIZIO_PRINCIPLES).toContain("calcule le périmètre du potager");
    expect(GENIZIO_PRINCIPLES).toContain("méthode Singapour, Common Core US");
    expect(GENIZIO_PRINCIPLES).toContain("matière exacte que Naya nommera");
  });

  it("le benchmark international est une règle exécutée, pas une note en commentaire", () => {
    expect(ACADEMIC_REFERENTIAL_INSTRUCTION).toContain("calibrage international, pas une échelle maison");
    expect(ACADEMIC_REFERENTIAL_INSTRUCTION).toContain("Common Core US");
    expect(ACADEMIC_REFERENTIAL_INSTRUCTION).toContain("Singapore Math");
    expect(ACADEMIC_REFERENTIAL_INSTRUCTION).toContain("Chine");
    expect(ACADEMIC_REFERENTIAL_INSTRUCTION).toContain("niveau international attendu pour son âge");
  });

  it("le secret académique est ancré sur la mesure réelle et invite à la recherche personnelle", () => {
    expect(ACADEMIC_SECRET_INSTRUCTION).toContain("quatre temps");
    expect(ACADEMIC_SECRET_INSTRUCTION).toContain("Ancre le concept sur le geste et le chiffre réels");
    expect(ACADEMIC_SECRET_INSTRUCTION).toContain("périmètre");
    expect(ACADEMIC_SECRET_INSTRUCTION).toContain("invitation à la recherche personnelle adaptée à son âge");
    expect(ACADEMIC_SECRET_INSTRUCTION).toContain("8 à 11 ans");
    expect(ACADEMIC_SECRET_INSTRUCTION).toContain("mini-recherche autonome");
  });

  it("la règle de mesures réelles est injectée dans le prompt bulk", () => {
    expect(buildChallengePrompt(input)).toContain("CHIFFRES ET MESURES RÉELS OBLIGATOIRES");
    expect(buildChallengePrompt(input)).toContain("calibrage international, pas une échelle maison");
  });
});
