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
import { getAspirationHypothesesSnapshot, type AspirationStatus } from "@/lib/aspiration-confidence";
import { formatAspirationChildLine, formatAspirationParentLine } from "@/lib/aspiration-narrative";

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
