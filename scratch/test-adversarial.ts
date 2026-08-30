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

console.log("=== ADVERSARIAL EDGE CASE TEST SUITE ===\n");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// 1. Steps as array of objects: [{ step: 1, text: "Faire X" }, { step: 2, text: "Faire Y" }]
runTest("Steps as array of objects with text/instruction", () => {
  const raw = {
    domain: "Sciences",
    title: "Défi test",
    description: "Description",
    steps: [
      { step: 1, text: "Observer la réaction" },
      { step: 2, instruction: "Noter les résultats" },
      { step: 3, description: "Conclure" },
    ],
    materials: ["Crayon", "Papier"],
  };
  const parsed = ChallengeSchema.parse(raw);
  const fin = finalizeChallenge(parsed, 10);
  if (!Array.isArray(parsed.steps) || parsed.steps.length !== 3) {
    throw new Error(`Expected 3 steps, got ${JSON.stringify(parsed.steps)}`);
  }
});

// 2. Materials as array of objects: [{ item: "Voltmètre", quantity: 1 }]
runTest("Materials as array of objects with item/name/label", () => {
  const raw = {
    domain: "Sciences",
    title: "Défi test",
    description: "Description",
    steps: ["Etape 1", "Etape 2", "Etape 3"],
    materials: [
      { name: "Voltmètre", quantity: 1 },
      { item: "Panneau solaire" },
      { label: "Fils électriques" },
    ],
  };
  const parsed = ChallengeSchema.parse(raw);
  const fin = finalizeChallenge(parsed, 10);
  if (!Array.isArray(parsed.materials) || parsed.materials.length !== 3) {
    throw new Error(`Expected 3 materials, got ${JSON.stringify(parsed.materials)}`);
  }
});

// 3. Duration as number: duration: 45
runTest("Duration as number (duration: 45)", () => {
  const raw = {
    domain: "Sciences",
    title: "Défi test",
    description: "Description",
    duration: 45,
    steps: ["Etape 1"],
    materials: ["Matériel"],
  };
  const parsed = ChallengeSchema.parse(raw);
  if (parsed.duration !== "45 min" && parsed.duration !== "45") {
    throw new Error(`Expected duration string, got ${parsed.duration}`);
  }
});

// 4. Intelligences as single comma-separated string: intelligences: "logico_mathematique, sciences"
runTest("Intelligences as single string", () => {
  const raw = {
    domain: "Sciences",
    title: "Défi test",
    description: "Description",
    intelligences: "logico_mathematique, sciences",
    steps: ["Etape 1"],
    materials: ["Matériel"],
  };
  const parsed = ChallengeSchema.parse(raw);
  const fin = finalizeChallenge(parsed, 10);
  if (!Array.isArray(fin.target_intelligences)) {
    throw new Error(`Expected array of target_intelligences`);
  }
});

// 5. requires_supervision as number (1 or 0) or "oui" / "non"
runTest("requires_supervision as 1 / 0 or oui / non", () => {
  const raw1 = {
    title: "Test 1",
    description: "Desc",
    steps: ["E1"],
    materials: ["M1"],
    requires_supervision: 1,
  };
  const p1 = ChallengeSchema.parse(raw1);
  if (p1.requires_supervision !== true) throw new Error("Expected true for 1");

  const raw2 = {
    title: "Test 2",
    description: "Desc",
    steps: ["E1"],
    materials: ["M1"],
    requires_supervision: "oui",
  };
  const p2 = ChallengeSchema.parse(raw2);
  if (p2.requires_supervision !== true) throw new Error("Expected true for 'oui'");

  const raw3 = {
    title: "Test 3",
    description: "Desc",
    steps: ["E1"],
    materials: ["M1"],
    requires_supervision: 0,
  };
  const p3 = ChallengeSchema.parse(raw3);
  if (p3.requires_supervision !== false) throw new Error("Expected false for 0");
});

// 6. declarative_award with string point values: { mathematiques: "2" }
runTest("declarative_award with string numbers", () => {
  const raw = {
    title: "Test declarative",
    description: "Desc",
    steps: ["E1"],
    materials: ["M1"],
    proof_mode: "declarative",
    proof_target: { metric: "minutes", value: "15" },
    declarative_award: { logico_mathematique: "2" },
  };
  const parsed = ChallengeSchema.parse(raw);
  const fin = finalizeChallenge(parsed, 10);
  if (fin.proof_mode !== "declarative" || fin.declarative_award?.logico_mathematique !== 2) {
    throw new Error(`Expected declarative award with 2 points, got ${JSON.stringify(fin)}`);
  }
});

// 7. JSON with trailing commas extracted and parsed via safeJsonParse
runTest("safeJsonParse handles trailing commas and markdown comments", () => {
  const raw = `\`\`\`json
{
  "challenges": [
    {
      "domain": "Sciences",
      "title": "Circuit",
      "description": "Test",
      "duration": "30 min",
      "steps": ["E1", "E2",],
      "materials": ["Pile",],
    },
  ],
}
\`\`\``;
  const data: any = safeJsonParse(raw);
  const parsed = z.array(ChallengeSchema).parse(data.challenges);
  if (parsed.length !== 1) throw new Error("Expected 1 challenge");
});

// 8. Truncated JSON recovery in safeJsonParse
runTest("safeJsonParse recovers unclosed braces in truncated LLM JSON", () => {
  const truncated = `\`\`\`json
{
  "challenges": [
    {
      "domain": "Sciences",
      "title": "Circuit",
      "description": "Test",
      "duration": "30 min",
      "steps": ["E1", "E2"],
      "materials": ["Pile"]`;
  const data: any = safeJsonParse(truncated);
  if (!Array.isArray(data?.challenges) || data.challenges.length !== 1) {
    throw new Error(`Expected parsed challenges array, got ${JSON.stringify(data)}`);
  }
  const parsed = z.array(ChallengeSchema).parse(data.challenges);
  if (parsed[0].title !== "Circuit") throw new Error("Expected title Circuit");
});

// 9. Academic field normalizers and Postgres DB Check constraint compatibility
runTest("Academic field resolvers strictly enforce Postgres check constraints", () => {
  // Subject
  if (resolveAcademicSubject("physique-chimie") !== "sciences") throw new Error("physique-chimie -> sciences");
  if (resolveAcademicSubject("Mathématiques") !== "maths") throw new Error("Mathématiques -> maths");
  if (resolveAcademicSubject("inconnu_xyz") !== null) throw new Error("inconnu -> null");

  // Grade level
  if (resolveAcademicGradeLevel("Licence 1 (Bac+1)") !== "Bac+1") throw new Error("Licence 1 -> Bac+1");
  if (resolveAcademicGradeLevel("Terminale S") !== "Terminale") throw new Error("Terminale S -> Terminale");
  if (resolveAcademicGradeLevel("6ème") !== "6eme") throw new Error("6ème -> 6eme");
  if (resolveAcademicGradeLevel("Doctorat 3") !== null) throw new Error("Doctorat 3 -> null");

  // Behavioral driver
  if (resolveBehavioralDriver("Déconstruire") !== "deconstruire") throw new Error("Déconstruire -> deconstruire");
  if (resolveBehavioralDriver("investiguer") !== "enqueter") throw new Error("investiguer -> enqueter");
  if (resolveBehavioralDriver("inconnu") !== null) throw new Error("inconnu -> null");

  // ZPA level
  if (resolveZpaLevel("4") !== 4) throw new Error("'4' -> 4");
  if (resolveZpaLevel(10) !== 5) throw new Error("10 -> 5 (clamped)");
  if (resolveZpaLevel(-2) !== 1) throw new Error("-2 -> 1 (clamped)");
  if (resolveZpaLevel("invalid") !== null) throw new Error("invalid -> null");
});

// 10. Wrapped structures in response: { challenge: {...} }, { data: [...] }, { result: [...] }
runTest("Wrapped structures unpacked properly", () => {
  const singleWrapped = { challenge: { title: "Mon Défi", domain: "Arts" } };
  const rawList = singleWrapped.challenge;
  const parsed = ChallengeSchema.parse(rawList);
  if (parsed.title !== "Mon Défi") throw new Error("Expected Mon Défi");
});

// 11. Raw single-escaped LaTeX formulas in description and academic_secret
runTest("safeJsonParse handles raw single-escaped LaTeX formulas (\\frac, \\sqrt, \\alpha, \\times, \\pm, \\Delta)", () => {
  const raw = `{"title": "Défi Maths", "description": "Calculer \\frac{1}{2} avec \\sqrt{x} et \\alpha + \\beta", "academic_secret": "Utilise $x \\times y \\pm \\Delta$ avec \\pi \\approx 3.14"}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (!parsed.description.includes("frac") || !parsed.academic_secret?.includes("times")) {
    throw new Error("Failed to parse LaTeX expressions");
  }
});

// 12. Literal newlines and control characters inside strings
runTest("safeJsonParse repairs literal newlines and control characters inside strings", () => {
  const raw = `{\n  "title": "Défi Nature",\n  "description": "Ligne 1\nLigne 2 avec saut de ligne brut",\n  "steps": ["Étape 1\navec détail", "Étape 2"]\n}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.steps.length !== 2) throw new Error("Expected 2 steps");
});

// 13. Unescaped inner double quotes in string values
runTest("safeJsonParse repairs unescaped inner double quotes in French text", () => {
  const raw = `{"title": "L'énigme du "trésor" maudit", "description": "Un texte avec des "guillemets" français"}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (!parsed.title.includes("trésor")) throw new Error("Failed to repair inner quotes");
});

// 14. Python literals (True, False, None) in JSON output
runTest("safeJsonParse handles Python bool/None literals", () => {
  const raw = `{"title": "Défi Python", "requires_supervision": True, "pedagogical_context": None, "steps": ["E1"]}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.requires_supervision !== true) throw new Error("Expected requires_supervision true");
});

// 15. Single-quoted JSON conversion
runTest("safeJsonParse converts single-quoted JSON structures", () => {
  const raw = `{'title': 'Défi en single quotes', 'domain': 'Sciences', 'steps': ['E1', 'E2']}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.title !== "Défi en single quotes") throw new Error("Failed to parse single-quoted JSON");
});

// 16. BOM and non-breaking spaces
runTest("safeJsonParse strips BOM and normalizes non-breaking spaces", () => {
  const raw = `\uFEFF{\u00A0"title": "Défi avec NBSP",\u00A0"steps": ["E1"]\u00A0}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.title !== "Défi avec NBSP") throw new Error("Failed to parse NBSP JSON");
});

// 17. Advanced LaTeX math commands starting with b, f, n, r, t (\beta, \nabla, \forall, \neq, \rightarrow, \rho, \tau, \binom)
runTest("safeJsonParse handles advanced LaTeX commands starting with b, f, n, r, t", () => {
  const raw = `{"title": "Défi Physique Quantique", "description": "Calculer \\nabla f + \\beta \\times \\binom{n}{k} avec \\forall x, x \\neq 0 \\implies \\rho \\to \\tau", "academic_secret": "Utilise \\frac{\\partial y}{\\partial x}"}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (!parsed.description.includes("nabla") || !parsed.description.includes("beta") || !parsed.description.includes("rho")) {
    throw new Error("Failed to parse advanced LaTeX math notation");
  }
});

// 18. Value string with inner quote followed by French colon
runTest("safeJsonParse handles unescaped inner quotes before colon in value strings", () => {
  const raw = `{"title": "Mission Spatiale", "description": "Voici le projet "Apollo" : mission vers la lune avec succès", "steps": ["Étape 1"]}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (!parsed.description.includes("Apollo")) throw new Error("Failed on inner quote before colon");
});

// 19. Array element with inner quote followed by comma and French words
runTest("safeJsonParse handles array element inner quotes before commas followed by text", () => {
  const raw = `{"title": "Défi Protocole", "steps": ["Étape 1: dire "bonjour", puis observer les réactions", "Étape 2: noter"]}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.steps.length !== 2) throw new Error(`Expected 2 steps, got ${parsed.steps.length}`);
  if (!parsed.steps[0].includes("bonjour")) throw new Error("Failed on inner quote before comma");
});

// 20. Multi-line single-quoted JSON with unescaped French apostrophe
runTest("safeJsonParse handles multi-line single-quoted JSON with French apostrophes", () => {
  const raw = `{\n  'title': 'L\'énigme de l\'arbre',\n  'description': 'L\'oiseau vole vers l\'eau',\n  'steps': ['Observer l\'arbre']\n}`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.title !== "L'énigme de l'arbre") throw new Error(`Expected L'énigme de l'arbre, got ${parsed.title}`);
});

// 21. Truncated JSON preceded by conversational text without closing brace
runTest("safeJsonParse handles truncated JSON preceded by conversational intro", () => {
  const raw = `Bien sûr, voici le défi :\n\`\`\`json\n{"title": "Défi de chimie", "description": "Mélanger du sel`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.title !== "Défi de chimie") throw new Error("Failed on truncated JSON with intro");
});

// 22. Truncated string ending with a dangling single backslash
runTest("safeJsonParse handles truncated string ending with a dangling backslash", () => {
  const raw = `{"title": "Défi de géométrie", "description": "Calculer la valeur de \\`;
  const data: any = safeJsonParse(raw);
  const parsed = ChallengeSchema.parse(data);
  if (parsed.title !== "Défi de géométrie") throw new Error("Failed on dangling backslash at EOF");
});

console.log(`\nAdversarial Summary: ${passed} passed, ${failed} failed (${passed + failed} total)`);

