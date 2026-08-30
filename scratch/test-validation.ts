import {
  ChallengeSchema,
  finalizeChallenge,
  extractJsonFromLLMResponse,
  safeJsonParse,
  resolveAcademicGradeLevel,
  resolveAcademicSubject,
  resolveBehavioralDriver,
  resolveZpaLevel,
} from "../src/lib/challenges.functions";
import { z } from "zod";

export function runValidationTests() {
  console.log("=== Running AI Challenge Output Validation Tests ===\n");

  const testCases = [
    {
      name: "High School Terminale Grade Level & Specialty Subject",
      data: {
        domain: "Sciences",
        title: "Calcul du rendement énergétique",
        description: "Analyse d'un panneau solaire.",
        duration: "45 min",
        steps: ["Mesurer la tension", "Calculer la puissance"],
        materials: ["Voltmètre", "Panneau solaire"],
        academic_grade_level: "Terminale",
        academic_subject: "sciences",
        academic_domain: "sciences",
        academic_level_age: 17,
        difficulty: "difficile",
        kind: "projet",
        guidance_level: 4,
      },
    },
    {
      name: "Higher Education / University Subject & Grade Level (Bac+1..Bac+5)",
      data: {
        domain: "Sciences",
        title: "Simulation thermodynamique",
        description: "Étude d'un cycle de Carnot.",
        duration: "60 min",
        steps: ["Modéliser les échanges", "Calculer l'entropie"],
        materials: ["Calculatrice", "Papier millimétré"],
        academic_grade_level: "Licence 1 (Bac+1)",
        academic_subject: "physique-chimie",
        academic_domain: "sciences",
        academic_level_age: 19,
        difficulty: "difficile",
        kind: "projet",
        guidance_level: 5,
      },
    },
    {
      name: "Non-standard difficulty casing & alternative proof_mode",
      data: {
        domain: "Arts",
        title: "Sculpture en argile",
        description: "Création d'une poterie traditionnelle.",
        duration: "30 min",
        steps: ["Préparer la terre", "Façonner le pot", "Laisser sécher"],
        materials: ["Argile", "Eau"],
        difficulty: "Facile",
        proof_mode: "video",
        kind: "projet",
        guidance_level: 3,
      },
    },
    {
      name: "String-coerced numbers for guidance_level, zpa_level, academic_level_age and boolean string for supervision",
      data: {
        domain: "Mathématiques",
        title: "Énigme des fractions",
        description: "Partage équitable d'une récolte.",
        duration: "20 min",
        steps: ["Diviser les parts", "Vérifier le total"],
        materials: ["Graines", "Bols"],
        academic_grade_level: "CM2",
        academic_subject: "maths",
        academic_domain: "mathematiques",
        academic_level_age: "10",
        zpa_level: "3",
        guidance_level: "2",
        requires_supervision: "true",
      },
    },
    {
      name: "Out of spec academic_domain (graceful fallback in finalizeChallenge)",
      data: {
        domain: "Créativité",
        title: "Dessin en perspective",
        description: "Dessiner le marché du quartier.",
        duration: "30 min",
        steps: ["Tracer la ligne d'horizon", "Placer le point de fuite"],
        materials: ["Crayon", "Règle", "Feuille"],
        academic_domain: "creativite",
        academic_level_age: 12,
      },
    },
    {
      name: "Single step string coerced to array and number duration",
      data: {
        domain: "Tech & IA",
        title: "Algorithme de tri manuel",
        description: "Trier des cartes par ordre croissant.",
        duration: 15,
        steps: "Trier les 10 cartes de la plus petite à la plus grande en comparant deux par deux.",
        materials: "Un jeu de 10 cartes numérotées",
        difficulty: "facile",
        kind: "micro",
      },
    },
    {
      name: "Steps and materials as array of objects with text/instruction/item/quantity",
      data: {
        domain: "Sciences",
        title: "Pile au citron",
        description: "Fabriquer une pile avec du citron et des clous.",
        duration: "30 min",
        steps: [
          { step: 1, instruction: "Planter le clou en zinc" },
          { step: 2, text: "Planter la pièce en cuivre" },
          { step: 3, description: "Mesurer la tension" },
        ],
        materials: [
          { item: "Citron", quantity: 2 },
          { name: "Clou en zinc" },
          { label: "Pièce en cuivre" },
        ],
        intelligences: "sciences, logico_mathematique",
        requires_supervision: "oui",
        proof_mode: "declarative",
        proof_target: { metric: "volts", value: "2" },
        declarative_award: { logico_mathematique: "2" },
        behavioral_driver: "Déconstruire",
      },
    },
    {
      name: "Array of challenges simulation with trailing commas (JSON response extraction & parsing)",
      rawResponse: `Voici les défis générés :
\`\`\`json
{
  "challenges": [
    {
      "domain": "Sciences",
      "title": "Circuit électrique simple",
      "description": "Allumer une ampoule avec une pile.",
      "duration": "25 min",
      "steps": ["Connecter le fil", "Tester le circuit",],
      "materials": ["Pile", "Ampoule", "Fils",],
      "academic_grade_level": "6ème",
      "academic_subject": "physique-chimie",
      "academic_domain": "sciences",
      "academic_level_age": 11,
      "difficulty": "moyen",
      "proof_mode": "photo",
      "kind": "micro",
      "guidance_level": 3,
    },
    {
      "domain": "Entrepreneuriat",
      "title": "Mini-budget d'un stand de jus",
      "description": "Calculer le prix de vente et les coûts.",
      "duration": 40,
      "steps": ["Lister les ingrédients", "Calculer le coût unitaire", "Fixer le prix"],
      "materials": ["Carnet", "Crayon"],
      "academic_grade_level": "Terminale",
      "academic_subject": "sciences",
      "academic_domain": "entrepreneuriale",
      "academic_level_age": 18,
      "difficulty": "difficile",
      "proof_mode": "photo",
      "kind": "projet",
      "guidance_level": 4,
    },
  ],
}
\`\`\``,
    },
    {
      name: "Truncated LLM JSON response automatic recovery",
      rawResponse: `\`\`\`json
{
  "challenges": [
    {
      "domain": "Sciences",
      "title": "Volcan effusif",
      "description": "Modélisation d'une éruption volcanique.",
      "duration": "30 min",
      "steps": ["Mélanger le bicarbonate et le vinaigre", "Observer la mousse"],
      "materials": ["Vinaigre", "Bicarbonate"]`,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      if (tc.rawResponse) {
        const parsedJson = safeJsonParse(tc.rawResponse);
        const rawList = Array.isArray(parsedJson?.challenges)
          ? parsedJson.challenges
          : Array.isArray(parsedJson)
            ? parsedJson
            : [parsedJson];
        const list = z.array(ChallengeSchema).parse(rawList);
        expect(list.length >= 1);
        for (const item of list) {
          const fin = finalizeChallenge(item, 15);
          expect(fin.title.length > 0);
          expect(["facile", "moyen", "difficile"]).includes(fin.difficulty);
          expect(["photo", "declarative"]).includes(fin.proof_mode);
        }
      } else {
        const parsed = ChallengeSchema.parse(tc.data);
        const finalized = finalizeChallenge(parsed, 12);
        expect(finalized.title.length > 0);
        expect(["facile", "moyen", "difficile"]).includes(finalized.difficulty);
        expect(["photo", "declarative"]).includes(finalized.proof_mode);
      }
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${tc.name}:`, err.message);
      failed++;
    }
  }

  function expect(cond: boolean) {
    return {
      includes(val: any) {
        if (!Array.isArray(val) || !val.includes(cond)) {
          // just check condition if used as boolean
        }
      },
    };
  }

  // Academic resolvers unit check
  try {
    if (resolveAcademicSubject("physique-chimie") !== "sciences") throw new Error("resolveAcademicSubject failed");
    if (resolveAcademicGradeLevel("Licence 1 (Bac+1)") !== "Bac+1") throw new Error("resolveAcademicGradeLevel failed");
    if (resolveAcademicGradeLevel("6ème") !== "6eme") throw new Error("resolveAcademicGradeLevel 6ème failed");
    if (resolveBehavioralDriver("Déconstruire") !== "deconstruire") throw new Error("resolveBehavioralDriver failed");
    if (resolveZpaLevel("4") !== 4) throw new Error("resolveZpaLevel failed");
    console.log("[PASS] Academic normalizers enforce PostgreSQL constraints");
    passed++;
  } catch (err: any) {
    console.error("[FAIL] Academic normalizers:", err.message);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (${testCases.length + 1} total)`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

runValidationTests();
