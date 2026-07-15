import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  childId: z.string().uuid(),
  count: z.number().int().min(1).max(6).default(4),
});

const ChallengeSchema = z.object({
  domain: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  steps: z.array(z.string()),
  materials: z.array(z.string()),
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

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const prompt = `Tu es un mentor pédagogique pour enfants en Afrique francophone (Naya).
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

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu réponds uniquement en JSON valide, sans markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) throw new Error("Trop de requêtes, réessaye dans un instant.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Ajoute des crédits pour continuer.");
    if (!resp.ok) throw new Error(`Erreur IA (${resp.status})`);

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
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
