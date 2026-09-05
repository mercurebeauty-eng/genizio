import { describe, expect, it } from "vitest";
import { PRESENTATION_MODES } from "@/lib/modalities.functions";
import { GARDNER_LABELS } from "@/lib/gardner";
import {
  buildLessonDeconstructionPrompt,
  COGNITIVE_CHANNEL_BY_MODE,
  COGNITIVE_CHANNELS,
  coerceGroupSizes,
  defaultGroupSizes,
  distributionFromTalents,
  extractJsonBlock,
  FicheParseError,
  GARDNER_KEY_TO_CHANNEL,
  groupSizesFromDistribution,
  LESSON_PRESENTATION_MODES,
  parseLessonFiche,
  type LessonFiche,
} from "@/lib/educator-copilot";

// Verrou de dérive : la copie locale des modalités et des clés Gardner doit
// rester strictement égale aux sources autoritaires (pattern naya-verifier).
describe("Verrous de vocabulaire", () => {
  it("LESSON_PRESENTATION_MODES == PRESENTATION_MODES (modalities.functions)", () => {
    expect([...LESSON_PRESENTATION_MODES]).toEqual([...PRESENTATION_MODES]);
  });

  it("GARDNER_KEYS couvre exactement les 9 clés de GARDNER_LABELS", () => {
    expect([...GARDNER_KEY_TO_CHANNEL ? Object.keys(GARDNER_KEY_TO_CHANNEL) : []].sort()).toEqual(
      Object.keys(GARDNER_LABELS).sort(),
    );
  });

  it("chaque mode de présentation est mappé sur un canal valide", () => {
    for (const mode of LESSON_PRESENTATION_MODES) {
      expect(COGNITIVE_CHANNELS).toContain(COGNITIVE_CHANNEL_BY_MODE[mode]);
    }
  });
});

describe("coerceGroupSizes", () => {
  it("laisse intactes des tailles déjà cohérentes", () => {
    expect(coerceGroupSizes([10, 10, 10, 10], 40)).toEqual([10, 10, 10, 10]);
  });

  it("excès : tour de table depuis le premier groupe (retrait équitable)", () => {
    // delta -2 : -1 au groupe 0, -1 au groupe 1
    expect(coerceGroupSizes([12, 11, 10, 9], 40)).toEqual([11, 10, 10, 9]);
  });

  it("déficit : tour de table, +1 par groupe jusqu'à équilibrage", () => {
    expect(coerceGroupSizes([9, 9, 9, 9], 40)).toEqual([10, 10, 10, 10]);
  });

  it("clamp les négatifs et les non-fins à 0 avant réparation", () => {
    expect(coerceGroupSizes([-5, Number.NaN, 20, 20], 40)).toEqual([0, 0, 20, 20]);
  });

  it("ne passe jamais un groupe sous 0 en retirant", () => {
    expect(coerceGroupSizes([1, 1, 1, 1], 0)).toEqual([0, 0, 0, 0]);
    // delta -4 en tour de table : 3→2, 1→0, 1→0, 1→0
    expect(coerceGroupSizes([3, 1, 1, 1], 2)).toEqual([2, 0, 0, 0]);
  });

  it("gère les non-entiers (floor) avec tour de table", () => {
    // floor → [10, 10, 9, 9] = 38, delta +2 → +1 au 1er, +1 au 2e
    expect(coerceGroupSizes([10.9, 10.2, 9.6, 9.3], 40)).toEqual([11, 11, 9, 9]);
  });
});

describe("defaultGroupSizes", () => {
  it("répartit 25/25/25/25 pour un effectif divisible", () => {
    expect(defaultGroupSizes(40)).toEqual([10, 10, 10, 10]);
    expect(defaultGroupSizes(64)).toEqual([16, 16, 16, 16]);
  });

  it("distribue le reste 1 par 1 aux premiers groupes", () => {
    expect(defaultGroupSizes(42)).toEqual([11, 11, 10, 10]);
    expect(defaultGroupSizes(43)).toEqual([11, 11, 11, 10]);
  });

  it("effectif 0 → quatre groupes vides", () => {
    expect(defaultGroupSizes(0)).toEqual([0, 0, 0, 0]);
  });
});

describe("distributionFromTalents", () => {
  it("mappe le talent dominant de chaque enfant sur son canal", () => {
    const dist = distributionFromTalents([
      { talents: { corporelle: 90, logico_mathematique: 40 } }, // manipulatif
      { talents: { spatial: 85, linguistique: 60 } }, // visuo_spatial
      { talents: { logico_mathematique: 95 } }, // logico_abstrait
      { talents: { linguistique: 80, sociale: 75 } }, // narratif
      { talents: { artisanale: 70 } }, // manipulatif
    ]);
    expect(dist).toEqual({ manipulatif: 2, visuo_spatial: 1, logico_abstrait: 1, narratif: 1 });
  });

  it("ignore les scores invalides et les clés inconnues", () => {
    const dist = distributionFromTalents([
      { talents: { inconnue: 100, corporelle: Number.NaN, creative: 50 } },
      { talents: {} },
    ]);
    expect(dist).toEqual({ manipulatif: 0, visuo_spatial: 1, logico_abstrait: 0, narratif: 0 });
  });

  it("échantillon vide → zéros partout", () => {
    expect(distributionFromTalents([])).toEqual({
      manipulatif: 0,
      visuo_spatial: 0,
      logico_abstrait: 0,
      narratif: 0,
    });
  });
});

describe("groupSizesFromDistribution", () => {
  it("échelle l'échantillon talents vers l'effectif réel", () => {
    // 2/5 manipulatif, 1/5 visuo, 1/5 logico, 1/5 narratif sur 40 élèves
    expect(groupSizesFromDistribution({ manipulatif: 2, visuo_spatial: 1, logico_abstrait: 1, narratif: 1 }, 40))
      .toEqual([16, 8, 8, 8]);
  });

  it("échantillon vide → répartition par défaut 25/25/25/25", () => {
    expect(groupSizesFromDistribution({}, 42)).toEqual(defaultGroupSizes(42));
  });

  it("somme toujours exactement l'effectif", () => {
    const sizes = groupSizesFromDistribution({ manipulatif: 7, visuo_spatial: 3 }, 63);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(63);
  });
});

describe("extractJsonBlock", () => {
  it("extrait un JSON brut", () => {
    expect(extractJsonBlock('{"a": 1}')).toBe('{"a": 1}');
  });

  it("extrait des fences ```json", () => {
    expect(extractJsonBlock('```json\n{"a": 1}\n```')).toBe('{"a": 1}');
  });

  it("extrait l'objet noyé dans du texte", () => {
    expect(extractJsonBlock('Voici la fiche : {"a": {"b": 2}} — bon courage !')).toBe(
      '{"a": {"b": 2}}',
    );
  });

  it("lève FicheParseError(no_json) sans objet détecté", () => {
    expect(() => extractJsonBlock("aucun json ici")).toThrow(FicheParseError);
  });
});

// Fiche de référence valide — sert de base aux tests de parse.
const VALID_FICHE_RAW = JSON.stringify({
  subject: "Mathématiques",
  topic: "Périmètre et aire du rectangle",
  grade_level: "6e",
  local_anchor: {
    trade: "Maçon / carreleur",
    explanation:
      "Le carreleur calcule la quantité de carreaux pour une pièce : l'aire donne le nombre de carreaux, le périmètre la longueur de plinthe. Sans ces calculs, il achète trop ou pas assez.",
    hook_question: "Combien de carreaux faut-il pour couvrir la classe, sans gaspiller un seul carreau ?",
  },
  channel_groups: [
    {
      channel: "manipulatif",
      presentation_modes: ["manipulation", "situation_concrete"],
      group_size: 10,
      activity: {
        title: "Mesurer la classe en pas et en ficelle",
        materials: ["ficelle", "craie", "double-décimètre"],
        steps: ["Mesurer le sol en pas", "Vérifier avec la ficelle tendue", "Convertir en mètres"],
        duration_min: 15,
      },
    },
    {
      channel: "visuo_spatial",
      presentation_modes: ["image", "analogie"],
      group_size: 10,
      activity: {
        title: "Schéma couleur du rectangle",
        materials: ["craies de couleur"],
        steps: ["Dessiner le rectangle au tableau", "Colorier l'aire en bleu, le périmètre en rouge"],
        duration_min: 15,
      },
    },
    {
      channel: "logico_abstrait",
      presentation_modes: ["demonstration", "texte"],
      group_size: 10,
      activity: {
        title: "Démonstration P = 2(L+l)",
        materials: ["tableau"],
        steps: ["Décomposer le tour du rectangle", "Factoriser en 2(L+l)", "Généraliser"],
        duration_min: 15,
      },
    },
    {
      channel: "narratif",
      presentation_modes: ["histoire", "conversation"],
      group_size: 10,
      activity: {
        title: "L'énigme du tailleur malin",
        materials: ["énoncé dicté"],
        steps: ["Raconter l'énigme du tissu", "Les groupes débattent", "Restitution orale"],
        duration_min: 15,
      },
    },
  ],
  exercises: [
    {
      level: 1,
      label: "Socle",
      statement: "Un rectangle mesure 5 cm sur 3 cm. Calcule son périmètre.",
      expected_answer: "16 cm",
      common_mistake: "Oublier de multiplier par 2 la somme.",
    },
    {
      level: 2,
      label: "Standard",
      statement: "Un terrain de 12 m sur 8 m doit être clôturé sur 3 côtés. Quelle longueur de clôture ?",
      expected_answer: "32 m",
    },
    {
      level: 3,
      label: "Dépassement",
      statement: "Avec 36 m de clôture pour un rectangle de périmètre entier, trouve toutes les dimensions entières possibles et celle qui donne la plus grande aire.",
      expected_answer: "P=36 → (L,l) ∈ {(17,1),(16,2),(15,3),(14,4),(13,5),(12,6),(11,7),(10,8),(9,9)} ; aire max = 81 m² au carré 9×9",
      common_mistake: "Confondre périmètre constant et aire variable.",
    },
  ],
  board_plan: ["Date + Titre : Périmètre et aire", "Formules : P = 2(L+l), A = L × l", "Exercice modèle"],
  timing: [
    { phase: "Accroche : la question du carreleur", minutes: 5 },
    { phase: "Ateliers par canaux", minutes: 40 },
    { phase: "Mise en commun", minutes: 10 },
  ],
});

describe("parseLessonFiche", () => {
  const SEG = { headcount: 40, gradeLevel: "6e", countryContext: "Côte d'Ivoire" };

  it("parse une fiche valide sans warning, canaux et niveaux ordonnés", () => {
    const { fiche, warnings } = parseLessonFiche(VALID_FICHE_RAW, 40);
    expect(warnings).toEqual([]);
    expect(fiche.channel_groups.map((g) => g.channel)).toEqual([...COGNITIVE_CHANNELS]);
    expect(fiche.exercises.map((e) => e.level)).toEqual([1, 2, 3]);
    expect(fiche.local_anchor.trade).toBe("Maçon / carreleur");
    expect(fiche.channel_groups.every((g) => g.group_size === 10)).toBe(true);
  });

  it("accepte les fences markdown autour du JSON", () => {
    const { fiche } = parseLessonFiche("```json\n" + VALID_FICHE_RAW + "\n```", 40);
    expect(fiche.topic).toContain("Périmètre");
  });

  it("coerce des tailles incohérentes et prévient via warnings", () => {
    const raw = JSON.stringify({
      ...JSON.parse(VALID_FICHE_RAW),
      channel_groups: JSON.parse(VALID_FICHE_RAW).channel_groups.map((g: any) => ({
        ...g,
        group_size: 5,
      })),
    });
    const { fiche, warnings } = parseLessonFiche(raw, 40);
    expect(fiche.channel_groups.map((g) => g.group_size)).toEqual([10, 10, 10, 10]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("40");
  });

  it("déduplique un canal doublé (premier gagne) et garde 4 groupes", () => {
    const base = JSON.parse(VALID_FICHE_RAW);
    const dupe = { ...base.channel_groups[1], channel: "manipulatif" };
    const raw = JSON.stringify({
      ...base,
      channel_groups: [...base.channel_groups, dupe],
    });
    const { fiche } = parseLessonFiche(raw, 40);
    const channels = fiche.channel_groups.map((g) => g.channel);
    expect(channels).toEqual([...COGNITIVE_CHANNELS]);
    expect(fiche.channel_groups[1].channel).toBe("visuo_spatial");
  });

  it("filtre les modalités hors vocabulaire fermé", () => {
    const raw = JSON.stringify({
      ...JSON.parse(VALID_FICHE_RAW),
      channel_groups: JSON.parse(VALID_FICHE_RAW).channel_groups.map((g: any) => ({
        ...g,
        presentation_modes: [...g.presentation_modes, "videoprojecteur"],
      })),
    });
    const { fiche } = parseLessonFiche(raw, 40);
    for (const g of fiche.channel_groups) {
      for (const mode of g.presentation_modes) {
        expect([...LESSON_PRESENTATION_MODES]).toContain(mode);
      }
    }
  });

  it("échoue proprement sur canal manquant (on n'invente pas la pédagogie)", () => {
    const base = JSON.parse(VALID_FICHE_RAW);
    const raw = JSON.stringify({
      ...base,
      channel_groups: base.channel_groups.filter((g: any) => g.channel !== "narratif"),
    });
    expect(() => parseLessonFiche(raw, 40)).toThrow(/missing_channel/);
  });

  it("échoue proprement sur niveau d'exercice manquant", () => {
    const base = JSON.parse(VALID_FICHE_RAW);
    const raw = JSON.stringify({
      ...base,
      exercises: base.exercises.filter((e: any) => e.level !== 3),
    });
    expect(() => parseLessonFiche(raw, 40)).toThrow(/missing_exercise_level/);
  });

  it("échoue sur JSON tronqué", () => {
    expect(() => parseLessonFiche('{"subject": "Math", "topic":', 40)).toThrow(FicheParseError);
  });

  it("échoue sur structure zod invalide (activité vide)", () => {
    const base = JSON.parse(VALID_FICHE_RAW);
    base.channel_groups[0].activity.title = "";
    expect(() => parseLessonFiche(JSON.stringify(base), 40)).toThrow(FicheParseError);
  });
});

describe("buildLessonDeconstructionPrompt", () => {
  it("texte : injecte la source, la segmentation, l'effectif et le JSON spec", () => {
    const { system, user } = buildLessonDeconstructionPrompt({
      source: {
        kind: "text",
        subject: "Mathématiques",
        theme: "Périmètre",
        chapter: "Chapitre 3",
        objectives: "Maîtriser P = 2(L+l)",
      },
      segmentation: { headcount: 55, gradeLevel: "6e", countryContext: "Sénégal" },
      groupSizes: [14, 14, 14, 13],
    });

    expect(typeof user).toBe("string");
    const userStr = user as string;
    expect(system).toContain("Copilote Professeur");
    expect(system).toContain("ZÉRO ÉCRAN");
    expect(system).toContain("EXACTEMENT ces clés");
    expect(userStr).toContain("Périmètre");
    expect(userStr).toContain("55 élèves");
    expect(userStr).toContain("manipulatif : 14 élèves");
    expect(userStr).toContain("narratif : 13 élèves");
    expect(userStr).toContain("Sénégal");
  });

  it("photo : compose des content-parts avec data URL d'image", () => {
    const { user } = buildLessonDeconstructionPrompt({
      source: { kind: "photo", imageBase64: "QUJD", mediaType: "image/webp", hint: "page 42" },
      segmentation: { headcount: 40, gradeLevel: "CM2", countryContext: "Côte d'Ivoire" },
      groupSizes: [10, 10, 10, 10],
    });
    expect(Array.isArray(user)).toBe(true);
    const parts = user as NonNullable<unknown>[];
    const textPart = parts.find((p: any) => p.type === "text") as any;
    const imagePart = parts.find((p: any) => p.type === "image_url") as any;
    expect(textPart.text).toContain("page 42");
    expect(imagePart.image_url.url).toBe("data:image/webp;base64,QUJD");
  });

  it("voix : transcript intégré tel quel, sans audio", () => {
    const { user } = buildLessonDeconstructionPrompt({
      source: { kind: "voice", transcript: "Les fractions, something CM1", subject: "Maths" },
      segmentation: { headcount: 30, gradeLevel: "CM1", countryContext: "Mali" },
      groupSizes: [8, 8, 7, 7],
    });
    expect((user as string)).toContain("Les fractions");
    expect((user as string)).toContain("30 élèves");
  });
});

// Garde de forme : la fiche reste sérialisable telle quelle en base (jsonb).
describe("Fiche sérialisable", () => {
  it("JSON round-trip sans perte", () => {
    const { fiche } = parseLessonFiche(VALID_FICHE_RAW, 40);
    const round = JSON.parse(JSON.stringify(fiche)) as LessonFiche;
    expect(round).toEqual(fiche);
  });
});
