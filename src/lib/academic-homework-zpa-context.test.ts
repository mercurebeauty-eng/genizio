import { describe, it, expect } from "vitest";
import { computeHomeworkZPAContext } from "@/lib/challenges.functions";

// Couvre le bug trouvé en auditant feat/naya-academic-homework-fusion (2026-07-22) :
// calculateZPADifficulty (pure function) était bien testée isolément, mais jamais alimentée
// par de vraies données — AcademicHomeworkInput.tsx n'exposait même pas masteryScore/
// hypothesisCauses/anxietyProb dans son interface, donc le "moteur ZPA bayésien" tournait
// systématiquement sur les valeurs par défaut (masteryScore=3, anxietyProb=0.1), peu importe
// l'historique réel de l'enfant. Ces tests verrouillent que computeHomeworkZPAContext calcule
// bien des valeurs différentes selon les données réelles, pas juste que la formule est juste.
//
// computeHomeworkZPAContext interroge .from() jusqu'à 3 fois dans l'ordre :
// [lastAcademic (challenges), openCycle (hypothesis_cycles), lastHomework (challenges)] — sauf
// pour un sujet sans domaine académique équivalent (histoire_geo), où le premier appel est
// court-circuité (Promise.resolve direct, pas de .from()) et il n'y en a donc que 2.
// `responses` fournit les réponses dans l'ordre RÉEL des appels .from() pour chaque cas.
function makeFakeSupabase(responses: (any | null)[]) {
  let callIndex = 0;
  return {
    from() {
      const index = callIndex++;
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        not: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: responses[index] ?? null }),
      };
      return chain;
    },
  };
}

describe("computeHomeworkZPAContext", () => {
  it("renvoie le repli neutre (masteryScore=3, pas de cause) quand rien n'est mesuré", async () => {
    const supabase = makeFakeSupabase([null, null, null]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "maths", 8);
    expect(ctx.masteryScore).toBe(3);
    expect(ctx.hypothesisCauses).toEqual([]);
    expect(ctx.anxietyProb).toBe(0);
    expect(ctx.currentLevel).toBeUndefined();
  });

  it("dérive un masteryScore réel de l'écart academic_level_age vs classe cible", async () => {
    // Enfant mesuré 2 ans au-dessus du niveau de la classe visée -> masteryScore = 3 + 2 = 5
    const supabase = makeFakeSupabase([{ academic_level_age: 10 }, null, null]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "maths", 8);
    expect(ctx.masteryScore).toBe(5);
  });

  it("clampe le masteryScore dérivé entre 1 et 5", async () => {
    const supabase = makeFakeSupabase([{ academic_level_age: 3 }, null, null]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "maths", 14);
    expect(ctx.masteryScore).toBe(1);
  });

  it("remonte les vraies causes diagnostiquées quand le cycle ouvert cible le même domaine", async () => {
    const supabase = makeFakeSupabase([
      null,
      {
        trigger_domain: "mathematiques",
        hypotheses: [{ cause: "PERFORMANCE_ANXIETY", current_probability: 0.72 }],
      },
      null,
    ]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "maths", 8);
    expect(ctx.hypothesisCauses).toEqual(["PERFORMANCE_ANXIETY"]);
    expect(ctx.anxietyProb).toBe(0.72);
  });

  it("ignore le cycle ouvert s'il cible un autre domaine que la matière du devoir", async () => {
    const supabase = makeFakeSupabase([
      null,
      {
        trigger_domain: "sociale",
        hypotheses: [{ cause: "PERFORMANCE_ANXIETY", current_probability: 0.9 }],
      },
      null,
    ]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "maths", 8);
    expect(ctx.hypothesisCauses).toEqual([]);
    expect(ctx.anxietyProb).toBe(0);
  });

  it("remonte le zpa_level du dernier devoir de la même matière comme currentLevel", async () => {
    const supabase = makeFakeSupabase([null, null, { zpa_level: 4 }]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "maths", 8);
    expect(ctx.currentLevel).toBe(4);
  });

  it("reste au repli neutre pour histoire_geo (aucun domaine académique équivalent, 1 seul appel .from() court-circuité)", async () => {
    // Séquence réelle pour un domaine non mappé : seulement [openCycle, lastHomework].
    const supabase = makeFakeSupabase([
      {
        trigger_domain: "mathematiques",
        hypotheses: [{ cause: "READY_FOR_MORE", current_probability: 0.8 }],
      },
      null,
    ]);
    const ctx = await computeHomeworkZPAContext(supabase, "child-1", "histoire_geo", 8);
    expect(ctx.masteryScore).toBe(3);
    expect(ctx.hypothesisCauses).toEqual([]);
  });
});
