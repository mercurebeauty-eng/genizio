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
  pedagogical_context: z.string().optional(),
  intelligences: z.array(z.string()).optional(),
});

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

Contraintes :
- Ancre les défis dans le contexte africain (matériaux locaux, réalités du quotidien, langues, marchés, agriculture, artisanat, culture).
- Choisis parmi ces domaines : ${DOMAINS.join(", ")}.
- Chaque défi doit être concret, réalisable à la maison ou dans le quartier, adapté à l'âge.
- Étapes claires (3 à 6), matériaux simples et accessibles.
- Ne répète pas ces titres déjà proposés : ${existingTitles.join(" | ") || "(aucun)"}.

Réponds STRICTEMENT en JSON valide avec ce format :
{"challenges":[{"domain":"...","title":"...","description":"...","duration":"...","steps":["...","..."],"materials":["...","..."]}]}`;

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
      pedagogical_context: c.pedagogical_context || null,
      target_intelligences: c.intelligences || [c.domain],
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("challenges")
      .insert(rows)
      .select("*");
    if (insErr) throw new Error(insErr.message);
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

    const prompt = `Tu es un mentor pédagogique et un expert en psychologie de l'enfant (Inspiré par Howard Gardner et les intelligences multiples).
L'enfant (Prénom: ${challenge.child_profiles.name}, Âge: ${challenge.child_profiles.age}) vient de terminer le défi : "${challenge.title}".
Domaine : ${challenge.domain}
Description du défi : ${challenge.description}

Le parent a soumis cette preuve de réalisation :
${data.proofText ? `Texte/Notes : "${data.proofText}"` : ""}
${data.proofImageUrl ? `Une image a également été fournie (vérifie l'image si possible).` : ""}

Ta mission :
1. Rédige une courte observation (2-3 phrases) très encourageante pour le parent, soulignant l'ingéniosité de l'enfant dans cette réalisation. (Tu peux t'adresser au parent).
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
        newTalents[key] = (newTalents[key] || 0) + points;
        intelligenceKeys.push(key);
      }
    }

    await supabase
      .from("child_profiles")
      .update({ talents: newTalents })
      .eq("id", challenge.child_profiles.id);

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
        target_intelligences: template.intelligences ?? [],
        status: "todo",
        progress: 0,
        pedagogical_context: template.pedagogical_context ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

const GenerateSingleInput = z.object({
  childId: z.string().uuid(),
  domain: z.string(),
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

    // Fetch completed challenges to bypass parental bias & understand child context
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

    const prompt = `Tu es Naya, un mentor pédagogique d'élite spécialisé dans la psychologie de l'enfant et les Intelligences Multiples d'Howard Gardner, opérant en Afrique francophone.
Génère un défi d'apprentissage sur-mesure, hautement interactif et passionnant pour cet enfant.

Profil de l'enfant :
- Prénom : ${child.name}
- Âge : ${child.age} ans
- Ville / pays : ${[child.city, child.country].filter(Boolean).join(", ") || "non précisé"}
- Centres d'intérêt initiaux (déclarés par le parent) : ${(child.interests ?? []).join(", ") || "aucun"}
- Scores de talents actuels (Radar Chart de Howard Gardner) : ${JSON.stringify(child.talents || {})}

Défis déjà accomplis par l'enfant et observations de Naya :
${completedSummary || "(Aucun défi complété pour le moment)"}

Domaine requis : ${data.domain === 'all' || !data.domain ? 'Choix Intelligent de Naya' : data.domain}

Ta mission (Bannir le biais parental) :
1. Analyse objectivement le profil de l'enfant et ses réalisations passées.
2. Si le domaine requis est "Choix Intelligent de Naya", choisis stratégiquement un domaine inexploré ou faible dans ses scores pour faire du diagnostic proactif, OU au contraire, choisis de renforcer une force naissante.
3. Si le parent a forcé un domaine (ex: Sciences) mais que tu observes par le passé que l'enfant performe mieux ou a des blocages, formule un défi "hybride" (formule de croisement) : utilise son intelligence forte (ex: dessin/spatial, musique) pour aborder et résoudre le sujet du domaine requis.
4. Le défi doit être extrêmement pratique, ancré dans le quotidien local en Afrique francophone (ex: Côte d'Ivoire, Sénégal, RDC...) en utilisant des objets simples de récupération ou du quartier (briques, carton, calebasses, sable, emballages, etc.).

Réponds STRICTEMENT en JSON valide avec ce format exact :
{
  "title": "Titre du défi",
  "domain": "Domaine de l'intelligence",
  "description": "Description stimulante expliquant le but du défi",
  "duration": "Durée estimée (ex: 2h, 1 après-midi)",
  "steps": ["Étape 1...", "Étape 2..."],
  "materials": ["Matériel 1...", "Matériel 2..."],
  "pedagogical_context": "En quoi ce défi développe le potentiel de l'enfant et comment ton diagnostic a combiné ses talents pour outrepasser la subjectivité parentale.",
  "intelligences": ["spatial", "creative", "logico_mathematique", "artisanale", "sociale", "entrepreneuriale", "linguistique", "corporelle", "emotionnelle"]
}`;

    const content = await callClaude(prompt, true);
    
    try {
      return JSON.parse(content);
    } catch {
      throw new Error("Réponse IA illisible.");
    }
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
Écris dans un style fluide, chaleureux et professionnel.`;

    try {
      return await callClaude(prompt, false);
    } catch (e: any) {
      console.error("AI Synthesis Error:", e.message);
      return "L'intelligence de Naya se repose quelques instants (quota de requêtes atteint). Revenez dans une petite minute pour lire la synthèse complète !";
    }
  });
