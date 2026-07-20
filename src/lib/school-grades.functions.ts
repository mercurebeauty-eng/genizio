import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// NAYA 2.0 Phase 2 — signaux scolaires (cf. genizio-decisions #31). Le trigger
// detect_grade_anomaly() (Phase 2, DB) fait le travail statistique à l'insertion —
// ce fichier ne fait que persister la saisie du parent avec les mêmes garde-fous
// d'ownership que le reste de l'app (context.supabase est déjà RLS-scopé, la
// vérification explicite est une défense en profondeur, cohérent avec
// challenges.functions.ts).

const CreateGradeInput = z.object({
  childId: z.string().uuid(),
  subject: z.string().min(1).max(120),
  grade: z.number().min(0),
  maxGrade: z.number().positive().default(20),
  evaluationType: z.string().max(60).nullable().optional(),
  context: z.string().max(1000).nullable().optional(),
  gradedAt: z.string().optional(), // ISO date (yyyy-mm-dd) — défaut serveur si absent
});

export const createSchoolGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CreateGradeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.grade > data.maxGrade) {
      throw new Error("La note ne peut pas dépasser le barème.");
    }

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    const { data: row, error } = await supabase
      .from("school_grades")
      .insert({
        child_id: data.childId,
        user_id: userId,
        subject: data.subject,
        grade: data.grade,
        max_grade: data.maxGrade,
        evaluation_type: data.evaluationType || null,
        context: data.context || null,
        ...(data.gradedAt ? { graded_at: data.gradedAt } : {}),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSchoolGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("school_grades")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
