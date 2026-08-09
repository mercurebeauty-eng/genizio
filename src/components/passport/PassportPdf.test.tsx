// Génère réellement le PDF du Passeport en Node (même moteur @react-pdf que le
// navigateur) pour valider toute la chaîne : polices, radar SVG, markdown,
// pagination, badges. Les polices sont injectées en data-URI AVANT l'import du
// composant pour que la résolution de fontkit tombe sur elles (et non sur les
// chemins /fonts/… réservés au navigateur).
import { describe, expect, it } from "vitest";
import { Font, pdf } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FONT_FILES: Record<string, [string, number, "normal" | "italic"][]> = {
  Fredoka: [
    ["Fredoka-Regular.ttf", 400, "normal"],
    ["Fredoka-Medium.ttf", 500, "normal"],
    ["Fredoka-SemiBold.ttf", 600, "normal"],
    ["Fredoka-Bold.ttf", 700, "normal"],
  ],
  Inter: [
    ["Inter-Regular.ttf", 400, "normal"],
    ["Inter-Medium.ttf", 500, "normal"],
    ["Inter-SemiBold.ttf", 600, "normal"],
    ["Inter-Italic.ttf", 400, "italic"],
    ["Inter-SemiBoldItalic.ttf", 600, "italic"],
  ],
};

function registerFontsFromDisk() {
  const fontsDir = join(process.cwd(), "public/fonts");
  for (const [family, files] of Object.entries(FONT_FILES)) {
    Font.register({
      family,
      fonts: files.map(([file, fontWeight, fontStyle]) => ({
        src: `data:font/ttf;base64,${readFileSync(join(fontsDir, file)).toString("base64")}`,
        fontWeight,
        fontStyle,
      })),
    });
  }
}

// Ordre important : enregistrer les polices AVANT d'importer le composant (son
// import module-scope enregistre les chemins /fonts/… réservés au navigateur).
registerFontsFromDisk();
const { PassportPdf } = await import("@/components/passport/PassportPdf");

const SAMPLE_DATA = {
  child: {
    id: "8f3d9a2c-5e14-4b72-9c31-1a2b3c4d5e6f",
    name: "Keïta D.",
    age: 10,
    talents: {
      spatial: 72,
      corporelle: 45,
      sociale: 63,
      entrepreneuriale: 81,
      creative: 58,
      artisanale: 40,
      emotionnelle: 55,
      logico_mathematique: 68,
      linguistique: 50,
    },
    interests: [
      "Aime assembler et construire",
      "Cherche à optimiser ou marchander",
      "Pose sans arrêt la question 'Pourquoi ?'",
    ],
    city: "Abidjan",
    country: "Côte d'Ivoire",
    xp: 1240,
  },
  challenges: [
    {
      id: "ch1",
      title: "Le pont autoportant de Léonard",
      domain: "Architecture",
      completed_at: "2026-07-12T10:00:00.000Z",
      proof_image_url: null,
      description:
        "Construis un pont miniature en bâtonnets.\n\n- Sans clous\n- Sans colle\n- **En utilisant l'imbrication des forces**",
      ai_observations:
        "Beaucoup de méthode : il a testé trois configurations avant de trouver la bonne.",
      notes: "Réussi en 40 minutes avec du matériel de récupération.",
    },
    {
      id: "ch2",
      title: "Le kiosque à jus de fruits",
      domain: "Entrepreneuriat",
      completed_at: "2026-07-18T10:00:00.000Z",
      proof_image_url: null,
      description: "Calcule le coût d'un verre de bissap et simule la vente pour dégager un bénéfice.",
      ai_observations: "Négociation naturelle remarquée face au client simulé.",
      notes: null,
    },
  ],
  earnedBadges: ["Sciences", "Architecture", "Entrepreneuriat"],
  synthesis:
    "## Bilan de la saison\n\nKeïta a montré une **constance remarquable** dans les défis pratiques.\n\n- Il persévère face à l'échec\n- Il optimise ses méthodes",
  letter:
    "Dans un an, Keïta pourrait explorer l'ingénierie et la gestion de projets.\n\n> Le goût du concret est son meilleur moteur.",
  proofImages: {},
};

describe("PassportPdf", () => {
  // Rendu PDF lourd (~4 s seul) : timeout généreux pour ne pas flaker quand la
  // suite complète tourne en parallèle (contention CPU).
  it("génère un PDF A4 valide et paginé", async () => {
    const instance = pdf(<PassportPdf data={SAMPLE_DATA as never} />);
    const stream = (await instance.toBuffer()) as unknown as {
      on: (event: "data" | "end", cb: (chunk?: Uint8Array) => void) => void;
    };
    const chunks: Uint8Array[] = [];
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk ?? [])));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // En-tête PDF valide
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(20_000);

    // Pagination attendue : couverture + carte des talents + synthèse + 1 page
    // défis = 4 pages. Chaque page physique écrit une entrée "/Type /Page"
    // (l'arbre "/Type /Pages" est exclu avec le regard négatif).
    const pageEntries = (bytes.toString("latin1").match(/\/Type \/Page(?![s])/g) ?? []).length;
    expect(pageEntries).toBe(4);
  }, 15_000);
});
