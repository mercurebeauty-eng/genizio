import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Helper local supprimé (audit C9) — source unique : currentAcademicYear
// (academic-year.ts), même coupure août, testée.
import { currentAcademicYear as getCurrentAcademicYear } from "@/lib/academic-year";

const LinkChildSchema = z.object({
  childId: z.string().uuid(),
  schoolId: z.string().uuid(),
});

/**
 * Permet au parent de lier son enfant à une école.
 * L'ancienne école active (s'il y en a une) passe en 'past', 
 * ce qui déclenche la révocation des professeurs via le trigger SQL.
 */
export const linkChildToSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => LinkChildSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    // 1. Verify parent ownership
    const { data: child, error: childErr } = await db
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .single();
    
    if (childErr || !child) {
      throw new Error("Non autorisé ou profil introuvable.");
    }

    const academicYear = getCurrentAcademicYear();

    // 2. Set existing active to past
    await db
      .from("child_schools")
      .update({ status: "past" })
      .eq("child_id", data.childId)
      .eq("status", "active");

    // 3. Insert new active link
    const { data: newLink, error: insertErr } = await db
      .from("child_schools")
      .insert({
        child_id: data.childId,
        school_id: data.schoolId,
        status: "active",
        academic_year: academicYear,
      })
      .select()
      .single();
    
    if (insertErr) throw new Error("Erreur lors de la liaison de l'école : " + insertErr.message);

    return newLink;
  });

export interface SchoolImpactMetrics {
  totalActiveChildren: number;
  totalTeachersInvolved: number;
  anomaliesDetected: number;
  anomaliesResolved: number;
  topTalents: { name: string; count: number }[];
  recentObservations: string[]; // Anonymized
}

export const getSchoolImpactDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SchoolImpactMetrics | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = (context as any).userId || (context as any).claims?.sub || (context as any).user?.id;

    // 1. Verify caller is a school leader
    const { data: school } = await db
      .from("schools")
      .select("id")
      .eq("leader_user_id", userId)
      .maybeSingle();

    if (!school) return null;

    // 2. Count active children linked to this school
    const { count: totalActiveChildren } = await db
      .from("child_schools")
      .select("*", { count: "exact", head: true })
      .eq("school_id", school.id)
      .eq("status", "active");
    
    // Audit C7 : ces chiffres étaient INVENTÉS (12 anomalies, top talents,
    // observations fictives) et présentés comme des mesures réelles à un
    // directeur d'établissement. Zéros honnêtes en attendant les signaux
    // tripartites réels (Phase 4 les alimentera via les rapports trimestriels).
    return {
      totalActiveChildren: totalActiveChildren || 0,
      totalTeachersInvolved: 0,
      anomaliesDetected: 0,
      anomaliesResolved: 0,
      topTalents: [],
      recentObservations: []
    };
  });