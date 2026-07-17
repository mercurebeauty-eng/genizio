import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
- "difficulty" ("facile" | "moyen" | "difficile") : évalue selon le temps nécessaire, le niveau d'autonomie requis, la complexité cognitive, la quantité de matériel, et le niveau de créativité/analyse demandé — reste cohérent avec la tranche d'âge.`;

// Helper to call Google AI Studio OpenAI-compatible endpoint
export async function callClaude(
  prompt: string,
  jsonMode: boolean = false,
  imageUrl?: string,
  maxRetries = 3
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API Anthropic non configurée dans .env (ANTHROPIC_API_KEY)");
  }

  const contentBlocks: any[] = [];

  if (imageUrl) {
    try {
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        throw new Error(`Impossible de récupérer l'image (${imgResp.status})`);
      }
      const arrayBuffer = await imgResp.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      const contentType = imgResp.headers.get("content-type") || "image/jpeg";
      
      let mediaType = contentType;
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(contentType)) {
        mediaType = "image/jpeg";
      }

      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
      });
    } catch (err: any) {
      console.error("Error fetching or converting image for Claude:", err);
    }
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
          max_tokens: 4000,
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
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable");

    const { data: existing } = await supabase
      .from("challenges")
      .select("title")
      .eq("child_id", data.childId);
    const existingTitles = (existing ?? []).map((c) => c.title);

    const prompt = `Tu es Naya, un mentor pédagogique pour enfants en Afrique francophone, sur la plateforme Génizio.
Génère ${data.count} défis d'apprentissage sur mesure pour cet enfant.

Profil :
- Prénom : ${child.name}
- Âge : ${child.age} ans
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Centres d'intérêt : ${(child.interests ?? []).join(", ") || "variés"}

CONSIGNES DE DÉVELOPPEMENT LIÉES À L'ÂGE :
Adapte strictement la forme, la complexité intellectuelle et la motricité requise pour le défi à l'âge exact de l'enfant :
- De 1 à 3 ans (Exploration sensorielle et motrice) : Activités purement sensorielles (toucher, manipuler, transvaser, trier des couleurs/objets simples, textures, eau, sable). Aucune règle complexe, aucune consigne de motricité fine avancée (pas de découpage précis, pas d'écriture). Étape ultra-simple en 1 action à la fois.
- De 4 à 7 ans (Phase exploratoire et imaginative) : Activités intégrant de l'imagination, des petits jeux de rôle ("fait semblant de"), du dessin, des petites manipulations de cause à effet guidées par le plaisir immédiat. L'action pratique doit primer sur la théorie.
- De 8 à 11 ans (Phase structurée et concrète) : Proposer des projets de fabrication concrets (maquettes, expériences scientifiques simples, recettes simples, bricolage) avec des règles claires, des étapes méthodiques, et de l'observation logique ou sociale.
- De 12 ans et + (Phase d'abstraction et d'analyse) : Permettre de la pensée critique, de la stratégie, des projets plus autonomes et complexes, de la logique conceptuelle (ex: coder un algorithme sur papier, déchiffrer des énigmes ou concevoir des objets élaborés).

${GENIZIO_PRINCIPLES}

Contraintes :
- Ancre les défis dans le contexte africain (matériaux locaux, réalités du quotidien, langues, marchés, agriculture, artisanat, culture).
- Choisis parmi ces domaines : ${DOMAINS.join(", ")}.
- Chaque défi doit être concret, réalisable à la maison ou dans le quartier, adapté à l'âge.
- Étapes claires (3 à 6), matériaux simples et accessibles.
- Ne répète pas ces titres déjà proposés : ${existingTitles.join(" | ") || "(aucun)"}.
- Pour "material_tags" : un tag court en minuscules, sans accent, par matériau physique achetable
  (ex: "carton", "cutter", "colle", "ampoule") — pas les objets déjà présents chez tout le monde
  (eau, table, papier). Un tableau vide si rien d'achetable n'est nécessaire.
- SÉCURITÉ ET SUPERVISION : Analyse si le défi comporte des risques (cuisine, feu, objets coupants, produits chimiques, électricité, extérieur non sécurisé). Si OUI, "requires_supervision" doit être true avec un "supervision_warning" clair pour le parent.

Réponds STRICTEMENT en JSON valide avec ce format, pour chaque défi :
{"challenges":[{"domain":"...","title":"...","description":"...","duration":"...","steps":["...","..."],"materials":["...","..."],"material_tags":["..."],"pedagogical_context":"Ce que Naya observe via cette activité","intelligences":["Intelligence dominante sollicitée"],"requires_supervision":true ou false,"supervision_warning":"..." (ou null si false),"difficulty":"facile"|"moyen"|"difficile"}]}`;

    const content = await callClaude(prompt, true);
    let parsed: { challenges?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    const list = z.array(ChallengeSchema).parse(parsed.challenges ?? []);

    const rows = list.map((c) => ({
      user_id: userId,
      child_id: data.childId,
      domain: c.domain,
      title: c.title.slice(0, 120),
      description: c.description,
      duration: c.duration,
      steps: c.steps,
      materials: c.materials,
      material_tags: c.material_tags ?? [],
      pedagogical_context: c.pedagogical_context || null,
      target_intelligences: c.intelligences || [c.domain],
      requires_supervision: c.requires_supervision,
      supervision_warning: c.supervision_warning || null,
      difficulty: c.difficulty ?? "moyen",
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
  .inputValidator((input: unknown) => UpdateInput.parse(input))
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

    const { data: row, error } = await context.supabase
      .from("challenges")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("challenges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ValidateInput = z.object({
  id: z.string().uuid(),
  proofText: z.string().max(2000).optional(),
  proofImageUrl: z.string().url().optional(),
});

export const validateChallengeProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ValidateInput.parse(input))
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
${data.proofImageUrl ? `Une image a également été fournie (vérifie l'image si possible).` : ""}

Ta mission :
1. Rédige une courte observation (2-3 phrases) très encourageante pour le parent, soulignant l'ingéniosité de l'enfant dans cette réalisation. (Tu peux t'adresser au parent). Texte brut uniquement, sans aucune syntaxe Markdown (pas de #, ##, **, tirets de liste).
2. Détermine quelles intelligences ont été mobilisées et attribue des points (de 1 à 3 par intelligence).
Les intelligences possibles sont : spatial, corporelle, sociale, entrepreneuriale, creative, artisanale, emotionnelle, logico_mathematique, linguistique.

Réponds STRICTEMENT en JSON valide avec ce format :
{
  "observations": "Ton message d'encouragement...",
  "talents_awarded": {
    "nom_de_lintelligence": 2
  }
}`;

    let aiContent = "";
    try {
      aiContent = await callClaude(prompt, true, data.proofImageUrl);
    } catch (err) {
      console.warn("Vision model call failed, falling back to text only:", err);
      aiContent = await callClaude(prompt, true);
    }

    let parsed: { observations?: string; talents_awarded?: Record<string, number> };
    try {
      parsed = JSON.parse(aiContent);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    const observations = parsed.observations ?? "Bravo pour cette belle réalisation !";
    const awarded = parsed.talents_awarded ?? {};

    const currentTalents = (challenge.child_profiles.talents as any) || {};
    const newTalents = { ...currentTalents };
    let intelligenceKeys: string[] = [];
    for (const [key, points] of Object.entries(awarded)) {
      if (typeof points === 'number') {
        // Cap points between 1 and 3 per challenge validation to ensure gradual progression
        const clampedPoints = Math.max(1, Math.min(3, points));
        newTalents[key] = (newTalents[key] || 0) + clampedPoints;
        intelligenceKeys.push(key);
      }
    }

    const { error: talentsError } = await supabase
      .from("child_profiles")
      .update({ talents: newTalents })
      .eq("id", challenge.child_profiles.id);

    if (talentsError) throw new Error(talentsError.message);

    const patch = {
      status: "completed" as const,
      progress: 100,
      completed_at: new Date().toISOString(),
      proof_image_url: data.proofImageUrl || null,
      ai_observations: observations,
      target_intelligences: intelligenceKeys,
    };

    const { data: updatedChallenge, error } = await supabase
      .from("challenges")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    
    return { 
      challenge: updatedChallenge,
      awarded_points: awarded
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
  .inputValidator((input: unknown) => AssignTemplateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();

    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const { template } = data;

    const { data: inserted, error } = await supabase
      .from("challenges")
      .insert({
        user_id: userId,
        child_id: data.childId,
        domain: template.domain,
        title: template.title,
        description: template.description,
        duration: template.duration,
        steps: template.steps,
        materials: template.materials,
        material_tags: template.material_tags ?? [],
        target_intelligences: template.intelligences ?? [],
        status: "todo",
        progress: 0,
        pedagogical_context: template.pedagogical_context ?? null,
        requires_supervision: template.requires_supervision ?? false,
        supervision_warning: template.supervision_warning ?? null,
        difficulty: template.difficulty ?? "moyen",
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
  .inputValidator((input: unknown) => GenerateSingleInput.parse(input))
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
      : `3. Choisis le domaine d'intelligence (Sciences, Art, Artisanat, Cuisine, etc.) le plus pertinent pour ce temps et ce lieu, tout en visant à renforcer une faiblesse ou exalter une force réelle. Tu peux créer des défis "hybrides" (ex: utiliser l'art pour comprendre les mathématiques).`;

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
7. SÉCURITÉ ET SUPERVISION : Analyse si le défi comporte des risques (cuisine, feu, objets coupants, produits chimiques, électricité, extérieur non sécurisé). Si OUI, tu DOIS régler "requires_supervision" à true et rédiger un "supervision_warning" clair à l'attention du parent.
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

    const content = await callClaude(prompt, true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    const c = ChallengeSchema.parse(parsed);

    // Preview only — nothing is persisted here. The Laboratoire and the Défi page's
    // single-challenge generator both show this as a draft the parent can regenerate
    // freely; assignTemplateChallenge is the only insertion point once they confirm.
    return {
      ...c,
      title: c.title.slice(0, 120),
      material_tags: c.material_tags ?? [],
      difficulty: c.difficulty ?? "moyen",
    };
  });

export const getChildAISynthesis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ childId: z.string().uuid() }).parse(input))
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
      return await callClaude(prompt, false);
    } catch (e: any) {
      console.error("AI Synthesis Error:", e.message);
      return "L'intelligence de Naya se repose quelques instants (quota de requêtes atteint). Revenez dans une petite minute pour lire la synthèse complète !";
    }
  });

const AnalyzePostInput = z.object({
  imageUrl: z.string().url(),
  domain: z.string().optional(),
});

export const analyzePostProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzePostInput.parse(input))
  .handler(async ({ data }) => {
    const prompt = `Tu es Naya, une IA experte en développement de l'enfant et intelligences multiples (Howard Gardner).
Analyse cette photo qui représente une "preuve" d'activité ou une création réalisée par un enfant. 
Le parent a indiqué que cette activité était liée au domaine : ${data.domain || 'Non spécifié'}.
Ton but est de valider cette preuve et d'y apposer ton "Tampon pédagogique".
Réponds STRICTEMENT en une seule phrase courte, chaleureuse et valorisante. Ta phrase DOIT mentionner l'intelligence principale que l'enfant a dû utiliser dans cette scène (ex: spatiale, créative, kinesthésique, logico-mathématique, naturaliste, etc.).
Exemple: "Naya détecte une forte intelligence spatiale et créative dans cette magnifique construction !"
NE mets PAS de guillemets autour de ta réponse.`;
    
    const tag = await callClaude(prompt, false, data.imageUrl);
    return tag.trim().slice(0, 150); // safety cap
  });
