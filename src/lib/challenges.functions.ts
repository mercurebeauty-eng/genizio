import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VALID_TALENT_KEYS, TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { z } from "zod";

const ChallengeSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  steps: z.array(z.string()),
  materials: z.array(z.string()),
  material_tags: z.array(z.string()).optional(),
  pedagogical_context: z.string().nullable().optional(),
  intelligences: z.array(z.string()).optional(),
  requires_supervision: z.boolean().default(false),
  supervision_warning: z.string().nullable().optional(),
  difficulty: z.enum(["facile", "moyen", "difficile"]).optional(),
});

// Shop Phase 1: log material tags that don't match any active product yet, so the
// admin sees what Naya is recommending most and can price it. Never breaks the
// caller's real insert if this side-tracking fails.
async function trackMaterialSuggestions(items: { material_tags: string[]; title: string }[]) {
  try {
    const allTags = Array.from(new Set(items.flatMap((i) => i.material_tags))).filter(Boolean);
    if (allTags.length === 0) return;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: activeProducts } = await supabaseAdmin
      .from("products")
      .select("material_tags")
      .eq("is_active", true);
    const covered = new Set((activeProducts ?? []).flatMap((p) => p.material_tags ?? []));

    const uncovered = allTags.filter((t) => !covered.has(t));
    if (uncovered.length === 0) return;

    for (const tag of uncovered) {
      const sample = items.find((i) => i.material_tags.includes(tag))?.title ?? null;
      const { data: existing } = await supabaseAdmin
        .from("material_suggestions")
        .select("id, seen_count")
        .eq("tag", tag)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("material_suggestions")
          .update({
            seen_count: existing.seen_count + 1,
            last_seen_at: new Date().toISOString(),
            sample_challenge_title: sample,
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("material_suggestions").insert({ tag, sample_challenge_title: sample });
      }
    }
  } catch (err) {
    console.error("trackMaterialSuggestions failed (non-fatal):", err);
  }
}

// LLMs are known to favor items earlier in a list they're asked to choose
// from, independent of actual relevance. DOMAINS is always presented in the
// same order to every generation call for every child — shuffle it per call
// so that position bias doesn't quietly skew which domain gets picked across
// the whole platform. Same principle as the talent tie-break fix: don't let
// a fixed array order stand in for what should be a random/deterministic
// choice.
function shuffle<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

const DOMAINS = [
  "Sciences",
  "Architecture",
  "Artisanat",
  "Agriculture",
  "Sport",
  "Communication",
  "Entrepreneuriat",
  "Arts",
  "Langues",
  "Tech & IA",
];

// V2 (product-intelligence-architect pass): rather than leaving "which
// intelligence needs more exploration" entirely to the model's judgment on
// a raw JSON dump of scores, compute it deterministically and name it in
// the prompt. Cheap, zero hallucination risk, and directly serves the
// product's "reveal hidden talents" pitch instead of only reinforcing
// declared interests.
function getLeastExploredTalentLabels(
  talents: Record<string, number> | null | undefined,
  count = 2
): string[] {
  const raw = talents ?? {};
  return VALID_TALENT_KEYS
    .map((key) => ({ key, score: raw[key] ?? 0 }))
    // Shuffle before the (stable) sort so ties — e.g. a brand-new profile
    // where every score defaults to 0 — don't always resolve to the same
    // two talents in VALID_TALENT_KEYS' declared order.
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(({ key }) => TALENT_KEY_LABELS[key]);
}

// V3: a deterministic safety net behind the model's own risk self-assessment.
// The model can forget to flag a risky activity; this catches it from the
// generated text itself instead of trusting the same single pass that wrote
// it. Age-differentiated on purpose (per product direction): younger
// children always get a direct "adult must be present" instruction, while
// 12+ get concrete precautions to follow rather than a blocking tone — a
// 12-year-old lighting a candle with instructions is normal, not something
// to gate behind mandatory adult presence.
// JS's \b word boundary is ASCII-only (\w never matches accented letters),
// so a plain \b...\b pattern silently fails to match a keyword that starts
// or ends with an accented character (e.g. "électricité", "dénudé") — the
// boundary can never form between two non-\w characters. Build boundaries
// with Unicode-aware lookarounds instead so accented keywords match too.
function wordBoundaryPattern(alternatives: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`, "iu");
}

const SAFETY_KEYWORDS: { pattern: RegExp; note: { under12: string; from12: string } }[] = [
  {
    pattern: wordBoundaryPattern("feu|flamme|briquet|allumettes?|bougie"),
    note: {
      under12: "Cette activité implique du feu : un adulte doit être présent et superviser directement toute la manipulation.",
      from12: "Mesures de sécurité à prendre : utilise le briquet ou les allumettes dans un endroit dégagé, loin de tissus ou de papier, garde de l'eau ou un linge humide à proximité, et éteins bien la flamme après usage. Informe un parent avant de commencer.",
    },
  },
  {
    pattern: wordBoundaryPattern("couteau|cutter|lame|ciseaux pointus"),
    note: {
      under12: "Cette activité implique un objet tranchant : un adulte doit couper ou superviser directement cette étape.",
      from12: "Mesures de sécurité à prendre : coupe toujours en éloignant tes doigts de la lame, travaille sur une surface stable, et range l'outil après usage.",
    },
  },
  {
    pattern: wordBoundaryPattern("produits? chimiques?|eau de javel|acide|soude caustique"),
    note: {
      under12: "Cette activité implique des produits chimiques : un adulte doit manipuler ou superviser directement cette étape.",
      from12: "Mesures de sécurité à prendre : manipule ces produits dans un endroit ventilé, évite tout contact avec les yeux ou la peau, et lave-toi les mains après usage.",
    },
  },
  {
    pattern: wordBoundaryPattern("électricité|prise électrique|courant électrique|fils? dénudés?"),
    note: {
      under12: "Cette activité implique de l'électricité : un adulte doit superviser directement cette étape.",
      from12: "Mesures de sécurité à prendre : ne touche jamais une prise ou un fil dénudé avec les mains mouillées, et débranche l'appareil avant toute manipulation.",
    },
  },
  {
    pattern: wordBoundaryPattern("cuisinière|plaque de cuisson|plaque chauffante|four chaud|eau bouillante|huile chaude|casserole|poêle"),
    note: {
      under12: "Cette activité implique une source de chaleur en cuisine (cuisinière, four, eau ou huile chaude) : un adulte doit être présent et superviser directement toute la manipulation.",
      from12: "Mesures de sécurité à prendre : ne laisse jamais une casserole ou une poêle sans surveillance sur le feu, utilise des maniques pour les ustensiles chauds, éloigne les manches des bords de la plaque, et informe un parent avant de commencer.",
    },
  },
  {
    // "Extérieur non sécurisé" is the one risk category the prompt asks the
    // model to catch with zero deterministic backstop behind it. Nouns only
    // where possible (piscine, toit...) plus stems (grimp\p{L}*, escalad\p{L}*)
    // for the two common verbs, so conjugated forms ("grimpe", "escalade")
    // still match — a plain infinitive-only match would miss most real
    // generated text. Deliberately excludes generic outdoor words (jardin,
    // quartier, dehors) since the app's own principles already push for
    // "réalisable... dans le quartier" — flagging that would be exactly the
    // over-caution this net is designed to avoid.
    pattern: wordBoundaryPattern(
      "piscine|rivière|fleuve|lac|étang|mer|hauteur|toit|échelle|grimp\\p{L}*|escalad\\p{L}*|falaise|circulation|serpent|scorpion|animal sauvage"
    ),
    note: {
      under12: "Cette activité se déroule dans un environnement extérieur avec un risque réel (eau profonde, hauteur, circulation ou animal) : un adulte doit être présent et superviser directement toute la manipulation.",
      from12: "Mesures de sécurité à prendre : reste dans une zone connue de tes parents, ne t'approche jamais seul d'un point d'eau profond, d'une hauteur ou d'une route très fréquentée, et informe un parent avant de commencer.",
    },
  },
];

function applySafetyNet<T extends {
  description: string;
  steps: string[];
  materials: string[];
  requires_supervision?: boolean | null;
  supervision_warning?: string | null;
}>(challenge: T, age: number): { requires_supervision: boolean; supervision_warning: string | null } {
  const haystack = [challenge.description, ...challenge.steps, ...challenge.materials].join(" \n ");
  const matched = SAFETY_KEYWORDS.find((k) => k.pattern.test(haystack));

  if (!matched) {
    return {
      requires_supervision: challenge.requires_supervision ?? false,
      supervision_warning: challenge.supervision_warning ?? null,
    };
  }

  const fallbackNote = age < 12 ? matched.note.under12 : matched.note.from12;
  return {
    requires_supervision: true,
    supervision_warning: challenge.supervision_warning?.trim() || fallbackNote,
  };
}

// The model can (and does) omit "difficulty" despite the prompt asking for
// it; defaulting straight to "moyen" masked that silently. Warn so the gap
// is at least visible in logs instead of inflating the "moyen" bucket with
// no trace of why.
function resolveDifficulty(
  difficulty: string | null | undefined,
  challengeTitle: string
): "facile" | "moyen" | "difficile" {
  if (difficulty === "facile" || difficulty === "moyen" || difficulty === "difficile") {
    return difficulty;
  }
  console.warn(`[challenges] "difficulty" manquant ou invalide pour "${challengeTitle}" — défaut "moyen" appliqué.`);
  return "moyen";
}

// Single choke point for the checks every challenge must pass through before
// it reaches a parent or the DB: the safety net, the difficulty fallback,
// title truncation, material_tags normalization. Before this existed, the
// 3 insertion points (bulk insert, single-challenge preview, template
// assignment) each called applySafetyNet/resolveDifficulty separately —
// nothing stopped a future 4th call site (or a reordering refactor) from
// silently skipping one of them. Route every insertion/preview through this
// instead of re-deriving these fields by hand.
function finalizeChallenge<T extends {
  title: string;
  description: string;
  steps: string[];
  materials: string[];
  material_tags?: string[] | null;
  requires_supervision?: boolean | null;
  supervision_warning?: string | null;
  difficulty?: string | null;
}>(c: T, age: number) {
  const safety = applySafetyNet(c, age);
  return {
    title: c.title.slice(0, 120),
    material_tags: c.material_tags ?? [],
    difficulty: resolveDifficulty(c.difficulty, c.title),
    requires_supervision: safety.requires_supervision,
    supervision_warning: safety.supervision_warning,
  };
}

// Shared constitution injected into every challenge-generation prompt (bulk
// and single). Written dense and numbered on purpose: the text-only calls
// run on Haiku (lightweight model), which needs explicit, unambiguous rules
// rather than loose guidance to reliably avoid generic/unrealistic output.
const GENIZIO_PRINCIPLES = `PRINCIPES DE GÉNÉRATION GÉNIZIO (règles strictes, à respecter impérativement) :
- CONCRET AVANT TOUT : chaque défi doit produire un résultat observable et vérifiable (objet construit, expérience réalisée, problème résolu, performance accomplie) — jamais une simple rêverie sans action physique.
- Priorise dans cet ordre : observation du réel > expérimentation > création manuelle > résolution de problème concret. L'imagination doit s'appuyer sur une action réelle, jamais la remplacer seule.
- Utilise en priorité les objets déjà disponibles chez l'enfant. N'invente jamais un défi nécessitant un achat important ou des conditions rares/spéciales.
- INTERDIT : défi irréalisable concrètement, matériel inaccessible, exercice creux sans valeur pédagogique réelle, tâche trop abstraite déconnectée du quotidien, formulation générique déjà vue mille fois ("dessine ce que tu veux", "imagine une histoire" sans ancrage réel).
- Cible explicitement 1 à 2 compétences précises et nomme-les dans "pedagogical_context" : Cognitives (logique, esprit critique, curiosité scientifique, créativité) · Pratiques (autonomie, débrouillardise/ingéniosité, méthode et rigueur, gestion du temps) · Sociales (communication, leadership, collaboration, empathie) · Personnelles (résilience face à la frustration, confiance en soi, esprit d'initiative, adaptabilité).
- Ne vise pas systématiquement le format le plus court : plus l'enfant grandit (8 ans et +), plus des formats longs et immersifs (au-delà d'une heure, voire un projet sur plusieurs jours) construisent une vraie résilience — une alternative constructive aux écrans, tant que ça reste réaliste pour le temps disponible indiqué.
- AUCUNE syntaxe Markdown dans les champs texte (pas de #, ##, **, tirets de liste) — phrases en texte brut uniquement. Les étapes vont exclusivement dans le tableau "steps", jamais mises en forme dans "description".
- "difficulty" ("facile" | "moyen" | "difficile") : évalue selon le temps nécessaire, le niveau d'autonomie requis, la complexité cognitive, la quantité de matériel, et le niveau de créativité/analyse demandé — reste cohérent avec la tranche d'âge.
- RELECTURE OBLIGATOIRE : avant de répondre, relis chaque champ texte et corrige toute faute d'orthographe, d'accent ou de grammaire. Zéro faute tolérée dans le JSON final.
- CLARTÉ POUR L'ENFANT : le titre et la description doivent être compréhensibles directement par l'enfant de cet âge, sans qu'un adulte ait besoin de les lui expliquer. Évite le jargon technique ou adulte (ex: "algorithme", "pseudo-code", "prototype") — si un tel mot est vraiment nécessaire au concept, explique-le en langage simple dans la même phrase.`;

// Was hand-copied into both prompts below and had already drifted once
// (one copy had an extra clarifying example the other lacked) — a single
// shared string, like GENIZIO_PRINCIPLES above, means a future wording
// tweak only has to be made once. Each call site prefixes its own list
// marker ("- " or "N. ") since the two prompts use different list styles.
const SAFETY_INSTRUCTION = `SÉCURITÉ ET SUPERVISION, sans excès de prudence : analyse si le défi comporte des risques réels (feu, cuisine avec source de chaleur — plaque, four, eau ou huile chaude —, objets coupants, produits chimiques, électricité, extérieur non sécurisé — eau profonde, hauteur, circulation, animaux dangereux). Si OUI, règle "requires_supervision" à true. Adapte le ton de "supervision_warning" à l'âge : avant 12 ans, précise qu'un adulte doit être présent pour cette étape ; à partir de 12 ans, un enfant peut réaliser l'étape lui-même — donne des mesures de sécurité concrètes à suivre plutôt que d'exiger la présence d'un adulte (ex: manipuler un briquet loin de matières inflammables, avec de l'eau à proximité). Ne signale pas de risque pour des activités quotidiennes sans danger réel (cuisine froide/sans cuisson, mélanger des ingrédients, extérieur familier, etc.).`;

// Helper to call Google AI Studio OpenAI-compatible endpoint
const ALLOWED_IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function callClaude(
  prompt: string,
  jsonMode: boolean = false,
  imageUrl?: string,
  // Anthropic's output-token rate limit is reserved based on this requested
  // max, not on what's actually generated — a call that only needs ~100
  // tokens but asks for 4000 can eat an entire minute's budget by itself.
  // Every call site should pass a value close to its real expected output
  // instead of relying on one size fits all.
  maxOutputTokens = 4000,
  maxRetries = 3,
  // Preferred over imageUrl when present — the caller already has the raw
  // bytes (e.g. straight from the browser's file input) and skips the
  // upload-then-fetch round trip through Supabase Storage that imageUrl
  // requires (see validateChallengeProof: that upload used to happen on
  // every submission attempt regardless of outcome, hitting the storage
  // API's own rate limit).
  imageData?: { base64: string; mediaType: string }
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API Anthropic non configurée dans .env (ANTHROPIC_API_KEY)");
  }

  const contentBlocks: any[] = [];

  if (imageData) {
    const mediaType = ALLOWED_IMAGE_MEDIA_TYPES.includes(imageData.mediaType)
      ? imageData.mediaType
      : "image/jpeg";
    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: imageData.base64,
      },
    });
  } else if (imageUrl) {
    // Let a fetch/decode failure propagate instead of silently continuing
    // text-only — callers that pass an image expect the AI to actually see
    // it, and validateChallengeProof's fallback path only works if this throws.
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`Impossible de récupérer l'image (${imgResp.status})`);
    }
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const contentType = imgResp.headers.get("content-type") || "image/jpeg";
    const mediaType = ALLOWED_IMAGE_MEDIA_TYPES.includes(contentType) ? contentType : "image/jpeg";

    contentBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data,
      },
    });
  }

  contentBlocks.push({
    type: "text",
    text: prompt,
  });

  const systemPrompt = jsonMode
    ? "Tu es un assistant IA précis. Tu dois impérativement répondre au format JSON demandé, sous forme de JSON brut, sans bloc de code Markdown, sans préambule ni explications."
    : undefined;

  // Cost-effective routing: use Claude Sonnet 5 only when analyzing an image (vision), otherwise use Claude Haiku 4.5
  const model = imageUrl ? "claude-sonnet-5" : "claude-haiku-4-5-20251001";

  let attempt = 0;
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxOutputTokens,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: contentBlocks,
            },
          ],
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API Error Response (Attempt ${attempt + 1}):`, errorText);
        
        if (response.status === 429) {
          throw new Error("Quota Anthropic atteint (429). Veuillez patienter une minute avant de réessayer.");
        }
        if (response.status === 503 || response.status >= 500) {
          throw new Error(`Erreur Anthropic API (${response.status})`); // Transient error -> trigger retry
        }
        
        throw new Error(`Erreur Anthropic API (${response.status}) - Fatal`);
      }

      const json = await response.json();
      let textContent = json.content?.[0]?.text ?? "";
      if (jsonMode) {
        textContent = textContent.trim();
        if (textContent.startsWith("```")) {
          textContent = textContent.replace(/^```[a-z]*\n/, "").replace(/\n```$/, "").trim();
        }
      }
      clearTimeout(timeoutId);
      return textContent;
    } catch (err: any) {
      clearTimeout(timeoutId);
      attempt++;
      
      const isFatal = err.message && err.message.includes("Fatal");
      if (attempt >= maxRetries || isFatal) {
        throw err;
      }
      
      const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
      console.log(`Retrying Claude API in ${Math.round(delay)}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  
  throw new Error("Erreur Claude API après plusieurs tentatives.");
}

const GenerateInput = z.object({
  childId: z.string().uuid(),
  count: z.number().int().min(1).max(6).default(4),
});

export const generateChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    // Domains repeatedly generated but never even started are a real signal
    // that's currently thrown away: the prompt only ever sees *completed*
    // challenges (below), so a domain the child ignores keeps coming back
    // just because the rotation/least-explored logic doesn't know it was
    // ignored. 14 days is long enough that "todo" genuinely means ignored,
    // not "hasn't gotten to it yet this week".
    const STALE_DOMAIN_CUTOFF = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: existing }, { data: completedChallenges }, { data: staleChallenges }] = await Promise.all([
      supabase
        .from("challenges")
        .select("title")
        .eq("child_id", data.childId)
        // Unbounded before: for a long-tenured family this list could grow
        // into a huge block of text sitting right before the safety
        // instruction later in the prompt, risking the "lost in the middle"
        // effect where instructions buried in a long context get followed
        // less reliably. The 30 most recent titles are enough to avoid
        // repeats without letting the prompt grow indefinitely.
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("challenges")
        .select("title, domain, ai_observations")
        .eq("child_id", data.childId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(6),
      supabase
        .from("challenges")
        .select("domain")
        .eq("child_id", data.childId)
        .eq("status", "todo")
        .lt("created_at", STALE_DOMAIN_CUTOFF),
    ]);
    const existingTitles = (existing ?? []).map((c) => c.title);
    const completedSummary = (completedChallenges ?? [])
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ''}"`)
      .join("\n");

    // A single unstarted challenge in a domain proves nothing (parents get
    // busy) — only flag a domain once it's happened at least twice, so this
    // is a real repeated pattern rather than noise from one busy week.
    const staleDomainCounts = (staleChallenges ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.domain] = (acc[r.domain] ?? 0) + 1;
      return acc;
    }, {});
    const ignoredDomains = Object.entries(staleDomainCounts)
      .filter(([, count]) => count >= 2)
      .map(([domain]) => domain);

    const leastExplored = getLeastExploredTalentLabels(child.talents as Record<string, number> | null);

    const prompt = `Tu es Naya, un mentor pédagogique pour enfants en Afrique francophone, sur la plateforme Génizio.
Génère ${data.count} défis d'apprentissage sur mesure pour cet enfant.

Profil :
- Prénom : ${child.name}
- Âge : ${child.age} ans
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Centres d'intérêt déclarés par le parent : ${(child.interests ?? []).join(", ") || "variés"}
- Scores de talents actuels (Radar Chart de Howard Gardner, sur les 9 intelligences) : ${JSON.stringify(child.talents || {})}

Défis déjà accomplis par l'enfant et observations de Naya :
${completedSummary || "(Aucun défi complété pour le moment)"}

CONSIGNES DE DÉVELOPPEMENT LIÉES À L'ÂGE :
Adapte strictement la forme, la complexité intellectuelle et la motricité requise pour le défi à l'âge exact de l'enfant :
- De 1 à 3 ans (Exploration sensorielle et motrice) : Activités purement sensorielles (toucher, manipuler, transvaser, trier des couleurs/objets simples, textures, eau, sable). Aucune règle complexe, aucune consigne de motricité fine avancée (pas de découpage précis, pas d'écriture). Étape ultra-simple en 1 action à la fois.
- De 4 à 7 ans (Phase exploratoire et imaginative) : Activités intégrant de l'imagination, des petits jeux de rôle ("fait semblant de"), du dessin, des petites manipulations de cause à effet guidées par le plaisir immédiat. L'action pratique doit primer sur la théorie.
- De 8 à 11 ans (Phase structurée et concrète) : Proposer des projets de fabrication concrets (maquettes, expériences scientifiques simples, recettes simples, bricolage) avec des règles claires, des étapes méthodiques, et de l'observation logique ou sociale.
- De 12 ans et + (Phase d'abstraction et d'analyse) : Permettre de la pensée critique, de la stratégie, des projets plus autonomes et complexes, de la logique conceptuelle (ex: coder un algorithme sur papier, déchiffrer des énigmes ou concevoir des objets élaborés).

${GENIZIO_PRINCIPLES}

Contraintes :
- Ignore le biais parental et utilise les données réelles : les intelligences actuellement les moins explorées chez cet enfant sont ${leastExplored.join(" et ")}. Sauf si le contexte les rend peu réalistes, au moins un des ${data.count} défis DOIT cibler l'une de ces intelligences plutôt que de renforcer uniquement les intérêts déjà connus — c'est ainsi que Naya révèle des talents cachés au lieu de se contenter de confirmer ce que le parent pense déjà savoir.
- Ancre les défis dans le contexte africain (matériaux locaux, réalités du quotidien, langues, marchés, agriculture, artisanat, culture).
- Choisis parmi ces domaines : ${shuffle(DOMAINS).join(", ")}.${ignoredDomains.length > 0 ? `\n- Cet enfant a déjà reçu plusieurs défis dans ${ignoredDomains.length > 1 ? "ces domaines" : "ce domaine"} (${ignoredDomains.join(", ")}) sans jamais les commencer : évite de reproposer ${ignoredDomains.length > 1 ? "ces domaines" : "ce domaine"}, sauf sous un angle radicalement différent de ce qui a déjà été proposé.` : ""}
- Chaque défi doit être concret, réalisable à la maison ou dans le quartier, adapté à l'âge.
- Étapes claires (3 à 6), matériaux simples et accessibles.
- Ne répète pas ces titres déjà proposés : ${existingTitles.join(" | ") || "(aucun)"}.
- Pour "material_tags" : un tag court en minuscules, sans accent, par matériau physique achetable
  (ex: "carton", "cutter", "colle", "ampoule") — pas les objets déjà présents chez tout le monde
  (eau, table, papier). Un tableau vide si rien d'achetable n'est nécessaire.
- ${SAFETY_INSTRUCTION}

Réponds STRICTEMENT en JSON valide avec ce format, pour chaque défi :
{"challenges":[{"domain":"...","title":"...","description":"...","duration":"...","steps":["...","..."],"materials":["...","..."],"material_tags":["..."],"pedagogical_context":"Ce que Naya observe via cette activité","intelligences":["Intelligence dominante sollicitée"],"requires_supervision":true ou false,"supervision_warning":"..." (ou null si false),"difficulty":"facile"|"moyen"|"difficile"}]}`;

    // Up to 6 full défis in one response — genuinely needs the full default
    // budget, unlike every other callClaude site in this file.
    const content = await callClaude(prompt, true, undefined, 4000);
    let parsed: { challenges?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    let list: z.infer<typeof ChallengeSchema>[];
    try {
      list = z.array(ChallengeSchema).parse(parsed.challenges ?? []);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    const rows = list.map((c) => ({
      user_id: userId,
      child_id: data.childId,
      domain: c.domain,
      description: c.description,
      duration: c.duration,
      steps: c.steps,
      materials: c.materials,
      pedagogical_context: c.pedagogical_context || null,
      // The model isn't told which exact tokens to use for "intelligences"
      // (it's free text, e.g. "Créativité"), so it never matches
      // VALID_TALENT_KEYS's technical keys (creative, spatial, ...) —
      // target_intelligences at creation time is decorative, not the
      // source of truth for talent scoring (that's increment_child_talents
      // at validation time, which does constrain to the 9 known keys).
      // Falling back to [c.domain] used to silently write a non-taxonomy
      // value (e.g. "Cuisine") into this column; [] keeps this consistent
      // with assignTemplateChallenge instead.
      target_intelligences: c.intelligences || [],
      ...finalizeChallenge(c, child.age),
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("challenges")
      .insert(rows)
      .select("*");
    if (insErr) throw new Error(insErr.message);
    void trackMaterialSuggestions((inserted ?? []).map((c) => ({ material_tags: c.material_tags ?? [], title: c.title })));
    return inserted;
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const patch: {
      status?: "todo" | "in_progress" | "completed";
      progress?: number;
      notes?: string | null;
      completed_at?: string | null;
    } = {};
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "completed") {
        patch.progress = 100;
        patch.completed_at = new Date().toISOString();
      } else if (data.status === "todo") {
        patch.progress = 0;
        patch.completed_at = null;
      } else {
        patch.completed_at = null;
      }
    }
    if (data.progress !== undefined) {
      patch.progress = data.progress;
      if (data.progress === 100) {
        patch.status = "completed";
        patch.completed_at = new Date().toISOString();
      } else if (data.progress > 0) {
        patch.status = "in_progress";
        patch.completed_at = null;
      }
    }
    if (data.notes !== undefined) patch.notes = data.notes;

    // Ownership is enforced by RLS too, but every other mutation in this file
    // checks it explicitly — do the same here instead of relying solely on RLS.
    const { data: row, error } = await context.supabase
      .from("challenges")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("challenges")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ValidateInput = z.object({
  id: z.string().uuid(),
  proofText: z.string().max(2000).optional(),
  // Raw bytes instead of a pre-uploaded Storage URL — the image is only
  // persisted to Storage after the AI confirms it's actually relevant (see
  // below), instead of on every submission attempt regardless of outcome.
  proofImageBase64: z.string().optional(),
  proofImageMediaType: z.string().optional(),
});

export const validateChallengeProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ValidateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: challenge, error: challengeErr } = await supabase
      .from("challenges")
      .select("*, child_profiles(*)")
      .eq("id", data.id)
      .single();

    if (challengeErr || !challenge) throw new Error("Défi introuvable");
    if (challenge.user_id !== userId) throw new Error("Accès refusé.");

    const prompt = `Tu es un mentor pédagogique et un expert en psychologie de l'enfant (Inspiré par Howard Gardner et les intelligences multiples).
L'enfant (Prénom: ${challenge.child_profiles.name}, Âge: ${challenge.child_profiles.age}) vient de terminer le défi : "${challenge.title}".
Domaine : ${challenge.domain}
Description du défi : ${challenge.description}

Le parent a soumis cette preuve de réalisation :
${data.proofText ? `Texte/Notes : "${data.proofText}"` : ""}
${data.proofImageBase64 ? `Une image a également été fournie (vérifie l'image si possible).` : ""}

Ta mission :
1. Vérifie D'ABORD si cette preuve correspond réellement à CE défi précis (le texte décrit-il une activité liée au défi ? l'image montre-t-elle quelque chose en rapport ?). Si la preuve est manifestement hors-sujet ou sans rapport avec le défi, n'écris AUCUN message de félicitations : explique poliment et brièvement au parent que la preuve ne semble pas correspondre à ce défi et invite à en soumettre une nouvelle. Dans ce cas, "talents_awarded" doit être un objet vide {}. IMPORTANT : le parent ne peut joindre qu'UNE SEULE photo à la fois (jamais plusieurs) — ne demande jamais "des photos" au pluriel ni plusieurs preuves différentes ; suggère UNE seule photo montrant l'aspect le plus représentatif du défi.
2. Si (et seulement si) la preuve correspond bien au défi, rédige une courte observation (2-3 phrases) encourageante pour le parent, soulignant l'ingéniosité de l'enfant dans cette réalisation. (Tu peux t'adresser au parent). Texte brut uniquement, sans aucune syntaxe Markdown (pas de #, ##, **, tirets de liste).
3. Dans ce cas seulement, détermine quelles intelligences ont été réellement mobilisées et attribue des points (de 1 à 3 par intelligence, selon la qualité réelle de la réalisation — ne distribue jamais de points par défaut).
Les intelligences possibles sont : spatial, corporelle, sociale, entrepreneuriale, creative, artisanale, emotionnelle, logico_mathematique, linguistique.

Réponds STRICTEMENT en JSON valide avec ce format :
{
  "observations": "Ton message d'encouragement...",
  "talents_awarded": {
    "nom_de_lintelligence": 2
  }
}`;

    let aiContent = "";
    let imageAnalyzed = !!data.proofImageBase64;
    const imageData = data.proofImageBase64
      ? { base64: data.proofImageBase64, mediaType: data.proofImageMediaType ?? "image/jpeg" }
      : undefined;
    // A short observation + a small talents_awarded object — nowhere near
    // the 4000-token default sized for a batch of full défis. Reserving
    // that much per call was the main way this endpoint could exhaust the
    // org's per-minute output-token budget on a single request.
    try {
      aiContent = await callClaude(prompt, true, undefined, 500, 3, imageData);
    } catch (err) {
      // A 429 isn't specific to the image — it's the whole API key rate
      // limited. Falling back to a second full retry cycle (3 more attempts)
      // on the exact same key almost always hits the same wall, burns ~6
      // requests total, and used to surface as the confusing "Réponse IA
      // invalide" instead of the real cause once both attempts failed.
      // Surface the actual rate-limit message immediately instead.
      if (err instanceof Error && err.message.includes("429")) {
        throw err;
      }
      console.warn("Vision model call failed, falling back to text only:", err);
      imageAnalyzed = false;
      aiContent = await callClaude(prompt, true, undefined, 500);
    }

    let parsed: { observations?: string; talents_awarded?: Record<string, number> };
    try {
      parsed = JSON.parse(aiContent);
    } catch {
      throw new Error("Réponse IA invalide — réessayez dans quelques instants.");
    }

    const observations = parsed.observations ?? "Bravo pour cette belle réalisation !";
    const awarded = parsed.talents_awarded ?? {};

    const validTalentKeys = new Set(VALID_TALENT_KEYS);
    const deltas: Record<string, number> = {};
    let intelligenceKeys: string[] = [];
    for (const [key, points] of Object.entries(awarded)) {
      // Drop anything the AI returns outside the 9 known intelligences — a
      // hallucinated or misspelled key would otherwise pollute talents forever.
      if (typeof points === 'number' && validTalentKeys.has(key)) {
        // Floor was previously 1 — meaning even when the model correctly
        // judged a submission irrelevant/low-effort and tried to award 0,
        // the code silently bumped it back up to 1, guaranteeing every
        // submission got rewarded regardless of what the AI concluded.
        // Floor of 0 lets a genuine "no merit" verdict actually result in
        // no points, instead of masking it.
        const clamped = Math.max(0, Math.min(3, Math.round(points)));
        if (clamped > 0) {
          deltas[key] = clamped;
          intelligenceKeys.push(key);
        }
      }
    }

    if (Object.keys(deltas).length > 0) {
      // Atomic increment (row-locked, see increment_child_talents) instead of a
      // client-side read-modify-write, so two near-simultaneous validations for
      // the same child can't silently drop one set of points.
      const { error: talentsError } = await supabase.rpc("increment_child_talents", {
        p_child_id: challenge.child_profiles.id,
        p_deltas: deltas,
      });
      if (talentsError) throw new Error(talentsError.message);
    }

    const relevant = Object.keys(deltas).length > 0;

    // A rejected submission used to still write ai_observations to the DB —
    // and the UI only ever renders this whole validation card while
    // ai_observations is null, so writing it here permanently hid the
    // "submit again" form the AI's own rejection message just promised the
    // parent. Only persist the outcome (and only upload the photo) once the
    // AI actually confirms the submission is relevant.
    let updatedChallenge: any = challenge;
    if (relevant) {
      let proofImageUrl: string | null = null;
      if (data.proofImageBase64) {
        const mediaType = data.proofImageMediaType ?? "image/jpeg";
        const ext = mediaType.split("/")[1] ?? "jpg";
        const fileName = `${challenge.child_id}/${challenge.id}-${Math.random()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("proofs")
          .upload(fileName, Buffer.from(data.proofImageBase64, "base64"), { contentType: mediaType });
        if (uploadError) {
          console.error("Erreur d'upload de la preuve (non bloquant):", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage.from("proofs").getPublicUrl(fileName);
          proofImageUrl = publicUrlData.publicUrl;
        }
      }

      const patch = {
        status: "completed" as const,
        progress: 100,
        completed_at: new Date().toISOString(),
        proof_image_url: proofImageUrl,
        ai_observations: observations,
        target_intelligences: intelligenceKeys,
      };

      const { data: updated, error } = await supabase
        .from("challenges")
        .update(patch)
        .eq("id", data.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      updatedChallenge = updated;
    }

    return {
      challenge: updatedChallenge,
      observations,
      awarded_points: awarded,
      imageAnalyzed,
      relevant,
    };
  });

const AssignTemplateInput = z.object({
  childId: z.string().uuid(),
  template: ChallengeSchema.extend({ 
    intelligences: z.array(z.string()).optional(),
    pedagogical_context: z.string().optional(),
  }),
});

export const assignTemplateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AssignTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, age")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const { template } = data;
    // Re-run the deterministic checks here rather than trusting
    // template.requires_supervision/supervision_warning/difficulty as-is:
    // this is a client-supplied value (round-tripped from
    // generateSingleChallenge's preview) and this insert is the actual
    // point of truth in the DB.
    const { data: inserted, error } = await supabase
      .from("challenges")
      .insert({
        user_id: userId,
        child_id: data.childId,
        domain: template.domain,
        description: template.description,
        duration: template.duration,
        steps: template.steps,
        materials: template.materials,
        target_intelligences: template.intelligences ?? [],
        status: "todo",
        progress: 0,
        pedagogical_context: template.pedagogical_context ?? null,
        ...finalizeChallenge(template, child.age),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    void trackMaterialSuggestions([{ material_tags: inserted.material_tags ?? [], title: inserted.title }]);
    return inserted;
  });

const GenerateSingleInput = z.object({
  childId: z.string().uuid(),
  timeAvailable: z.string().optional(),
  location: z.string().optional(),
  homeMaterials: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
});

export const generateSingleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateSingleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    const { data: completedChallenges } = await supabase
      .from("challenges")
      .select("title, domain, ai_observations")
      .eq("child_id", data.childId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(6);

    const completedSummary = (completedChallenges ?? [])
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? ''}"`)
      .join("\n");

    const timeAvailable = data.timeAvailable || "30 min";
    const location = data.location || "Maison (Intérieur)";
    const targetDomain = data.domain && data.domain !== "all" ? data.domain : null;

    const domainInstruction = targetDomain
      ? `3. Tu DOIS générer un défi spécifiquement dans le domaine d'intelligence ou la catégorie suivante : "${targetDomain}". Adapte l'activité pour cibler ce domaine précis.`
      : `3. Les intelligences actuellement les moins explorées chez cet enfant sont ${getLeastExploredTalentLabels(child.talents as Record<string, number> | null).join(" et ")}. Sauf si le temps/lieu disponible les rend peu réalistes, choisis un domaine d'intelligence qui cible l'une de ces intelligences plutôt que de renforcer un talent déjà confirmé. Tu peux créer des défis "hybrides" (ex: utiliser l'art pour comprendre les mathématiques).`;

    const prompt = `Tu es Naya, un mentor pédagogique d'élite spécialisé dans la psychologie de l'enfant et les Intelligences Multiples d'Howard Gardner, opérant en Afrique francophone.
Génère un défi d'apprentissage sur-mesure, hautement interactif et passionnant pour cet enfant, en respectant son contexte immédiat.

Profil de l'enfant :
- Prénom : ${child.name}
- Âge : ${child.age} ans
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Centres d'intérêt initiaux (déclarés par le parent) : ${(child.interests ?? []).join(", ") || "aucun"}
- Scores de talents actuels (Radar Chart de Howard Gardner) : ${JSON.stringify(child.talents || {})}

CONSIGNES DE DÉVELOPPEMENT LIÉES À L'ÂGE :
Adapte strictement la forme, la complexité intellectuelle et la motricité requise pour le défi à l'âge exact de l'enfant :
- De 1 à 3 ans (Exploration sensorielle et motrice) : Activités purement sensorielles (toucher, manipuler, transvaser, trier des couleurs/objets simples, textures, eau, sable). Aucune règle complexe, aucune consigne de motricité fine avancée (pas de découpage précis, pas d'écriture). Étape ultra-simple en 1 action à la fois.
- De 4 à 7 ans (Phase exploratoire et imaginative) : Activités intégrant de l'imagination, des petits jeux de rôle ("fait semblant de"), du dessin, des petites manipulations de cause à effet guidées par le plaisir immédiat. L'action pratique doit primer sur la théorie.
- De 8 à 11 ans (Phase structurée et concrète) : Proposer des projets de fabrication concrets (maquettes, expériences scientifiques simples, recettes simples, bricolage) avec des règles claires, des étapes méthodiques, et de l'observation logique ou sociale.
- De 12 ans et + (Phase d'abstraction et d'analyse) : Permettre de la pensée critique, de la stratégie, des projets plus autonomes et complexes, de la logique conceptuelle (ex: coder un algorithme sur papier, déchiffrer des énigmes ou concevoir des objets élaborés).

${GENIZIO_PRINCIPLES}

Défis déjà accomplis par l'enfant et observations de Naya :
${completedSummary || "(Aucun défi complété pour le moment)"}

Contexte immédiat (TRÈS IMPORTANT) :
- Temps disponible : ${timeAvailable}
- Lieu / Environnement : ${location}
${data.homeMaterials ? `- Matériaux/objets disponibles à la maison : ${data.homeMaterials}` : ""}

Ta mission (Ignorer le biais parental et utiliser les données réelles) :
1. Analyse la carte des talents (Radar Chart), les intérêts déclarés par le parent, ET les observations des défis passés.
2. Détecte les biais : Si le parent a déclaré certains intérêts, mais que les observations passées montrent que l'enfant bloque dessus ou excelle ailleurs, Naya doit prendre l'initiative de pivoter.
${domainInstruction}
4. Le défi doit s'adapter EXACTEMENT au temps disponible. S'il n'y a que 10 minutes, propose un "mini-défi" immédiat. Si c'est 1h+, propose un projet structuré.
5. Le défi doit être réalisable avec les objets de ce lieu précis.
${
  data.homeMaterials
    ? `6. UTILISATION DES MATÉRIAUX DE LA MAISON : Tu DOIS concevoir un défi qui utilise en priorité ou exclusivement les matériaux indiqués par le parent ("${data.homeMaterials}"). Si ces matériaux ne suffisent pas ou ne sont pas propices à une activité d'apprentissage stimulante dans le domaine choisi, tu PEUX inclure d'autres ustensiles simples ou matériaux courants, mais signale-le de façon transparente dans la description et les étapes (et liste le matériel additionnel nécessaire). Si les matériaux fournis ne permettent vraiment rien d'intéressant, génère le défi sans cette contrainte et explique-le brièvement dans la description ou le contexte pédagogique.`
    : ""
}
7. ${SAFETY_INSTRUCTION}
8. Pour "material_tags" : un tag court en minuscules, sans accent, par matériau physique achetable
   (ex: "carton", "cutter", "colle", "ampoule") — pas les objets déjà présents chez tout le monde
   (eau, table, papier). Un tableau vide si rien d'achetable n'est nécessaire.

Réponds STRICTEMENT en JSON valide avec ce format exact :
{
  "domain": "Domaine choisi",
  "title": "Titre accrocheur du défi",
  "description": "Pitch pour l'enfant",
  "duration": "Durée estimée",
  "steps": ["Étape 1", "Étape 2..."],
  "materials": ["Outil 1", "Matériau 2..."],
  "material_tags": ["outil-1", "materiau-2"],
  "pedagogical_context": "Ce que Naya observe via cette activité",
  "intelligences": ["Intelligence dominante sollicitée"],
  "requires_supervision": true ou false,
  "supervision_warning": "Attention: Manipulez le couteau avec l'enfant" (ou null si false),
  "difficulty": "facile" | "moyen" | "difficile"
}`;

    // A single défi, not a batch — the 4000 default (sized for up to 6 défis
    // in generateChallenges) would needlessly reserve most of the org's
    // per-minute output-token budget for a response that only needs a
    // fraction of that.
    const content = await callClaude(prompt, true, undefined, 1200);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    let c: z.infer<typeof ChallengeSchema>;
    try {
      c = ChallengeSchema.parse(parsed);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    // Preview only — nothing is persisted here. The Laboratoire and the Défi page's
    // single-challenge generator both show this as a draft the parent can regenerate
    // freely; assignTemplateChallenge re-applies the same checks server-side at the
    // real insertion point, since this preview is round-tripped through the client.
    return {
      ...c,
      ...finalizeChallenge(c, child.age),
    };
  });

export const getChildAISynthesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .single();

    if (!child) throw new Error("Profil introuvable");

    const { data: completed } = await supabase
      .from("challenges")
      .select("title, domain, ai_observations")
      .eq("child_id", data.childId)
      .eq("status", "completed");

    if (!completed || completed.length === 0) {
      return "Naya attend que l'enfant réalise ses premiers défis pour analyser son profil et dresser une synthèse de ses talents émergents. Dès qu'un défi sera complété et validé par l'IA, vous retrouverez ici ses points forts et styles d'apprentissage préférentiels.";
    }

    // Regenerated at most once a week instead of on every page load (this
    // function used to call the AI fresh every single time, including on
    // every remount and after every challenge validation). The 7-day window
    // rolls forward from the last successful generation, not a fixed
    // calendar boundary — visiting again 8 days after the last regeneration
    // triggers a new one, and the next window starts from that moment.
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastGeneratedAt = child.ai_synthesis_generated_at ? new Date(child.ai_synthesis_generated_at).getTime() : 0;
    if (child.ai_synthesis && Date.now() - lastGeneratedAt < ONE_WEEK_MS) {
      return child.ai_synthesis;
    }

    const completedSummary = completed
      .map((c) => `- Défi "${c.title}" (${c.domain}) : "${c.ai_observations ?? 'Pas d\'observation'}"`)
      .join("\n");

    const prompt = `Tu es Naya, une IA mentore pédagogique.
Analyse les accomplissements suivants de l'enfant ${child.name} (${child.age} ans, centres d'intérêt: ${(child.interests ?? []).join(", ")}) :
${completedSummary}

Rédige une synthèse pédagogique bienveillante et constructive à l'attention des parents (2 paragraphes courts maximum).
Mets en lumière ses formes d'intelligence dominantes qui ressortent de ses actions, ses points forts comportementaux, et donne 1-2 recommandations de domaines à explorer ensuite pour cultiver son potentiel.
Écris dans un style fluide, chaleureux et professionnel, en texte brut uniquement — aucune syntaxe Markdown (pas de #, ##, **, tirets de liste), sépare les deux paragraphes par un simple retour à la ligne.`;

    try {
      // 2 short paragraphs, not a batch of défis.
      const synthesis = await callClaude(prompt, false, undefined, 700);
      // Only refresh the cache on a genuine success — a transient
      // quota/API failure must not lock in the fallback message as "the"
      // synthesis for the next 7 days.
      await supabase
        .from("child_profiles")
        .update({ ai_synthesis: synthesis, ai_synthesis_generated_at: new Date().toISOString() })
        .eq("id", data.childId);
      return synthesis;
    } catch (e: any) {
      console.error("AI Synthesis Error:", e.message);
      // Prefer a real (if stale) previous synthesis over the generic
      // "please wait" message when one exists.
      return (
        child.ai_synthesis ||
        "L'intelligence de Naya se repose quelques instants (quota de requêtes atteint). Revenez dans une petite minute pour lire la synthèse complète !"
      );
    }
  });

const AnalyzePostInput = z.object({
  imageUrl: z.string().url(),
  domain: z.string().optional(),
});

export const analyzePostProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AnalyzePostInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Tu es Naya, une IA experte en développement de l'enfant et intelligences multiples (Howard Gardner).
Analyse cette photo qui représente une "preuve" d'activité ou une création réalisée par un enfant. 
Le parent a indiqué que cette activité était liée au domaine : ${data.domain || 'Non spécifié'}.
Ton but est de valider cette preuve et d'y apposer ton "Tampon pédagogique".
Réponds STRICTEMENT en une seule phrase courte, chaleureuse et valorisante. Ta phrase DOIT mentionner l'intelligence principale que l'enfant a dû utiliser dans cette scène (ex: spatiale, créative, kinesthésique, logico-mathématique, naturaliste, etc.).
Exemple: "Naya détecte une forte intelligence spatiale et créative dans cette magnifique construction !"
NE mets PAS de guillemets autour de ta réponse.`;
    
    // One short sentence, capped at 150 chars below — 4000 was ~25x more
    // budget than this could ever use.
    const tag = await callClaude(prompt, false, data.imageUrl, 200);
    return tag.trim().slice(0, 150); // safety cap
  });
