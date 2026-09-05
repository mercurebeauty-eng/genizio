// Boussole des aspirations — « Univers explorés » (analyse « Évolution de Génizio »
// §16, chantier Naya V4, 2026-08-12).
//
// Serveur : résout le snapshot des aspirations (statuts dérivés à la lecture,
// aspiration-confidence.ts) et le transforme en narration qualitative pour l'enfant
// (mode Quête) et pour le parent (Portfolio). 0 IA — les lignes sont des constantes
// choisies par statut, jamais de chiffres ni de verdict (règles de sanitisation de
// narrateForParent appliquées en code).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAspirationHypothesesSnapshot,
  type AspirationStatus,
} from "@/lib/aspiration-confidence";
import { formatAspirationChildLine, formatAspirationParentLine } from "@/lib/aspiration-narrative";
import {
  findAspirationBridge,
  GENERIC_ASPIRATION_BRIDGE,
  type AspirationBridge,
} from "@/lib/aspiration-map";
import { VALID_TALENT_KEYS } from "@/lib/talent-buckets";
import { DOMAINS, callClaude, safeJsonParse } from "@/lib/challenges.functions";

const AspirationCompassInput = z.object({ childId: z.string().uuid() });

export type AspirationCompassItem = {
  label: string;
  source: "parent" | "enfant";
  status: AspirationStatus;
  childLine: string;
  parentLine: string;
};

export const getAspirationCompass = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AspirationCompassInput.parse(input))
  .handler(async ({ data, context }): Promise<{ aspirations: AspirationCompassItem[] }> => {
    const { supabase, userId } = context;

    const { data: child } = await supabase
      .from("child_profiles")
      .select("id, name")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (!child) return { aspirations: [] };

    const snapshot = await getAspirationHypothesesSnapshot(supabase as any, data.childId);
    if (!snapshot) return { aspirations: [] };

    const aspirations = Object.values(snapshot.byLabel).map((h) => ({
      label: h.label,
      source: h.source,
      status: h.status,
      childLine: formatAspirationChildLine(h),
      parentLine: formatAspirationParentLine(h, child.name),
    }));

    return { aspirations };
  });

export const inferAspirationBridge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        label: z.string().trim().min(2).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ bridge: AspirationBridge }> => {
    // 1. Résolution locale immédiate si le métier existe déjà ou matche un token
    const local = findAspirationBridge(data.label);
    if (local !== GENERIC_ASPIRATION_BRIDGE && local.talentKeys.length > 0) {
      return { bridge: local };
    }

    // 2. Inférence intelligente par Naya pour tout métier libre inédit
    const prompt = `Tu es Naya, mentor pédagogique pour enfants en Afrique francophone.
Analyse le métier ou l'aspiration suivante : « ${data.label} ».
Détermine ses composantes cognitives, pratiques et d'apprentissage selon le modèle pédagogique Génizio.

Contraintes strictes :
1. "talentKeys" : Choisi entre 2 et 3 clés parmi EXACTEMENT cette liste d'intelligences :
${VALID_TALENT_KEYS.join(", ")}
2. "domains" : Choisi 1 ou 2 domaines parmi EXACTEMENT cette liste :
${DOMAINS.join(", ")}
3. "skillsHint" : Une liste de 3 à 4 compétences concrètes et actives que ce métier exige (ex: "mesurer et découper", "observer les proportions", "manipuler avec précision").
4. "worldAnchor" : Une phrase d'ancrage concrète dans le quotidien de l'Afrique francophone (quartier, marché, réparation, dignité du savoir-faire, utilité pour la communauté).

Réponds UNIQUEMENT par un JSON brut sans markdown avec ce format :
{
  "talentKeys": ["artisanale", "spatial"],
  "domains": ["Artisanat", "Architecture"],
  "skillsHint": ["compétence 1", "compétence 2", "compétence 3"],
  "worldAnchor": "phrase d'ancrage"
}`;

    try {
      const raw = await callClaude(prompt, true, undefined, 1000, 2);
      const parsed = safeJsonParse(raw);
      const validTalents = (parsed.talentKeys || []).filter((k: string) =>
        VALID_TALENT_KEYS.includes(k),
      );
      const validDomains = (parsed.domains || []).filter((d: string) =>
        (DOMAINS as readonly string[]).includes(d),
      );

      const bridge: AspirationBridge = {
        talentKeys: validTalents.length > 0 ? validTalents : ["artisanale", "spatial"],
        domains: validDomains.length > 0 ? validDomains : ["Artisanat"],
        skillsHint:
          Array.isArray(parsed.skillsHint) && parsed.skillsHint.length > 0
            ? parsed.skillsHint.slice(0, 5).map(String)
            : ["découvrir les outils", "observer les gestes", "réaliser une première production"],
        worldAnchor:
          typeof parsed.worldAnchor === "string" && parsed.worldAnchor.trim()
            ? parsed.worldAnchor.trim()
            : `Découvrir les gestes et l'utilité concrète de ${data.label} dans le quotidien et le quartier.`,
      };

      return { bridge };
    } catch (err) {
      console.warn("[inferAspirationBridge] Fallback local sécurisé pour:", data.label, err);
      return {
        bridge: {
          talentKeys: ["artisanale", "spatial"],
          domains: ["Artisanat"],
          skillsHint: [
            "découvrir les outils",
            "observer les gestes",
            "réaliser une première production",
          ],
          worldAnchor: `Découvrir les gestes et l'utilité concrète de ${data.label} dans le quotidien et le quartier.`,
        },
      };
    }
  });
