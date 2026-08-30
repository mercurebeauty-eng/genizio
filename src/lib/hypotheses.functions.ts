import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRateLimit } from "@/lib/rate-limit.middleware";
import {
  callClaude,
  finalizeChallenge,
  PROOF_MODE_INSTRUCTION,
  ACADEMIC_REFERENTIAL_INSTRUCTION,
  ACADEMIC_SECRET_INSTRUCTION,
  ACADEMIC_DOMAIN_LABELS,
  STEPS_INSTRUCTION,
  INTELLIGENCES_FIELD_INSTRUCTION,
  TRAIT_SUBFORM_INSTRUCTION,
  formatChildInterestsPayload,
  extractJsonFromLLMResponse,
  safeJsonParse,
} from "@/lib/challenges.functions";
import { buildHypothesisPrompt } from "@/lib/naya-prompts";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { getInterestHypothesesSnapshot } from "@/lib/interest-confidence";
import { z } from "zod";
// « Le Loup de Naya » (chantier 2, Naya 3.0) : audit shadow non-bloquant des
// générations (narrations, hypothèses, discriminants, retests).
import { verifyAndLog } from "@/lib/naya-verifier.functions";

// NAYA 2.0 Phase 3a — moteur de génération d'hypothèses causales (cf. genizio-decisions #32).
// Premier point IA du pipeline NAYA. Rôle *raisonnement* → Sonnet (décision #27 : on paie le
// modèle premium quand le système doit réfléchir, ici uniquement sur anomalie détectée, volume
// faible). Résout la question ouverte sync/async du plan §7 en faveur du synchrone : server
// function TanStack réutilisant callClaude (pattern déjà éprouvé pour generateChallenges/
// validateChallengeProof), aucune nouvelle infra Edge Function, latence hors du chemin critique
// (déclenché en fire-and-forget au chargement du Portfolio, pas sur une action urgente).

const ALLOWED_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
  // Cause "en avance" (cf. genizio-decisions #38) : l'enfant réussit sans effort des défis
  // dont le contenu correspond en fait à des enfants plus âgés — signe possible qu'il n'est
  // pas assez challengé. Seule cause qui n'est PAS un problème à résoudre — l'utilisateur a
  // explicitement demandé le même traitement (investigation) pour ce cas que pour un retard.
  "READY_FOR_MORE",
  "OTHER",
] as const;

// Étape 4 — "faire redescendre le soutien renforcé, pas rester figé" (brainstorm produit,
// 2026-08-02). Causes pour lesquelles un accompagnement renforcé (défis "Stabilisation")
// a du sens une fois confirmées — READY_FOR_MORE va dans l'autre sens (plus de défi, pas
// plus de soutien) et OTHER est trop vague pour justifier une accommodation ciblée.
const ACCOMMODATION_CAUSES = [
  "METHOD_MISMATCH",
  "PERFORMANCE_ANXIETY",
  "LACK_OF_ENGAGEMENT",
  "CONCEPTUAL_GAP",
] as const;

// NAYA 2.0 Phase 3a, reconstruit (cf. genizio-decisions #38) : le déclencheur d'origine
// (note scolaire anormale) a été retiré en décision #37 — remplacé par un écart RÉPÉTÉ entre
// le référentiel académique interne et l'âge réel de l'enfant, mesuré sur ses défis
// RÉELLEMENT complétés dans l'app (jamais déclaratif). 0 IA pour la détection elle-même,
// exactement comme l'ancien Z-score — Sonnet n'intervient qu'une fois un écart confirmé,
// pour raisonner sur le POURQUOI.
const GAP_WINDOW = 4; // nombre de défis consécutifs requis dans le même sens (décision utilisateur)
const GAP_THRESHOLD_YEARS = 1; // écart minimal (en années) pour compter comme "en retard"/"en avance"

// Étape 3 — "classer automatiquement le commentaire du parent" (brainstorm produit,
// 2026-08-02) : détecte si, pour un domaine donné, les GAP_WINDOW derniers défis non
// réussis partagent tous la même cause classée — même seuil et même discipline
// "consécutif" que l'écart âge/référentiel ci-dessus (décision utilisateur explicite de
// garder 4, pas 2, pour ce chantier aussi). Pure et testable indépendamment de la requête
// DB et de l'appel IA qui l'entourent dans ensureHypothesesForChild.
export function findRepeatedNotCompletedCause(
  recentNotCompleted: { domain: string | null; cause: string | null; title: string | null }[],
  openDomains: Set<string>,
): { domain: string; cause: string; evidence: { cause: string; title: string }[] } | null {
  const byDomainCause = new Map<string, { cause: string; title: string }[]>();
  for (const c of recentNotCompleted) {
    if (!c.domain || !c.cause) continue;
    const arr = byDomainCause.get(c.domain) ?? [];
    if (arr.length < GAP_WINDOW) arr.push({ cause: c.cause, title: c.title ?? "" });
    byDomainCause.set(c.domain, arr);
  }

  for (const [domain, entries] of byDomainCause.entries()) {
    if (entries.length < GAP_WINDOW || openDomains.has(domain)) continue;
    const first = entries[0].cause;
    if (entries.every((e) => e.cause === first)) {
      return { domain, cause: first, evidence: entries };
    }
  }

  return null;
}

async function narrateForParent(
  childName: string,
  childAge: number,
  domainLabel: string,
  direction: "BEHIND" | "AHEAD",
  hypotheses: { cause: string; evidence_log: { fact: string }[] }[],
): Promise<string | null> {
  const sanitizeFact = (fact: string) => {
    return fact
      .replace(/z\s*=\s*-?\d+(\.\d+)?/gi, "écart significatif")
      .replace(/\b\d+(\.\d+)?\s*\/\s*\d+\b/g, "évaluation récente")
      .replace(/\b0\.\d+\b/g, "niveau très élevé")
      .replace(/\b\d+\s*observations?\b/gi, "plusieurs observations")
      .replace(/\b\d{1,2}\s*ans?\b/gi, "cette tranche d'âge");
  };

  const top = hypotheses.slice(0, 2).map((h) => ({
    piste: h.cause,
    elements_observes: h.evidence_log.map((e) => sanitizeFact(e.fact)),
  }));

  const toneInstruction =
    direction === "AHEAD"
      ? `Le ton doit être ENTHOUSIASTE et valorisant — ${childName} semble prêt·e pour des défis plus stimulants en ${domainLabel}, ce n'est jamais un problème, c'est une bonne nouvelle à explorer.`
      : `Le ton doit être chaleureux et jamais alarmiste — c'est une observation provisoire que Naya continue d'explorer, pas un jugement sur ${childName} ni sur le parent.`;

  const prompt = `Tu es Naya, la mentore IA bienveillante de Génizio. Tu écris directement pour le PARENT de ${childName}, ${childAge} ans, à propos d'une observation récente en ${domainLabel}.

RÈGLES ABSOLUES, sans exception :
- INTERDICTION TOTALE de tout nombre, pourcentage, score ou âge précis dans ta réponse — même si les données ci-dessous en contiennent. Traduis TOUJOURS en tendances qualitatives, en langage courant.
- INTERDICTION d'utiliser les étiquettes techniques ("METHOD_MISMATCH", "READY_FOR_MORE", etc.) ou tout mot à consonance clinique/diagnostique ("trouble", "déficit", "anomalie", "cause", "diagnostic").
- Ne présente JAMAIS ceci comme une conclusion, un verdict ou un jugement définitif. ${toneInstruction}
- Commence par la piste la plus probable ; n'évoque la seconde que si elle semble vraiment plausible aussi.
- 2 à 3 phrases courtes maximum, en français naturel, comme si tu parlais directement au parent.

Ce que Naya a observé (données internes à traduire fidèlement en langage humain, ne JAMAIS citer telles quelles) :
${JSON.stringify(top, null, 2)}

Réponds uniquement avec le texte final, sans guillemets, sans préambule, sans Markdown.`;

  try {
    const text = (await callClaude(prompt, false, undefined, 1500, 2)).trim();
    if (!text) return null;

    let cleaned = text.replace(/^[\d\s.#-]+/gm, "").trim();
    const digitWords: Record<string, string> = {
      "0": "zéro",
      "1": "un",
      "2": "deux",
      "3": "trois",
      "4": "quatre",
      "5": "cinq",
      "6": "six",
      "7": "sept",
      "8": "huit",
      "9": "neuf",
    };
    cleaned = cleaned.replace(/\b([0-9])\b/g, (m) => digitWords[m] || m);

    if (/\d/.test(cleaned)) {
      console.warn(
        "narrateForParent: chiffre détecté malgré la consigne, narration rejetée:",
        cleaned,
      );
      return null;
    }
    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant du texte final livré.
    void verifyAndLog({
      kind: "narrative",
      output: cleaned,
      context: { childAge, direction, domain: domainLabel },
      sourceFunction: "narrateForParent",
      model: "deepseek-v4-flash",
    });
    return cleaned;
  } catch (err) {
    console.error("narrateForParent failed (non-fatal, cycle stocké sans narration):", err);
    return null;
  }
}

const EnsureInput = z.object({ childId: z.string().uuid() });

// Ferme un fil déjà câblé mais jamais déclenché : processDiscriminantResult accepte
// "ABANDONED" depuis sa création (cf. sa propre logique bayésienne pour ce cas —
// un abandon sur une hypothèse anxiété/désengagement la renforce plutôt que de
// simplement l'ignorer), mais rien ne l'appelait jamais avec cette valeur : un défi
// discriminant abandonné restait invisible du moteur de diagnostic. Repère les
// défis discriminants toujours "todo"/"in_progress" au-delà du même seuil que
// STALE_DOMAIN_CUTOFF (14 jours, cf. generateChallenges), traite chacun une seule
// fois — flag "abandoned_processed" dans pedagogical_context, pour ne pas
// réappliquer le multiplicateur bayésien à chaque visite du Portfolio.
async function processAbandonedDiscriminantChallenges(
  supabase: any,
  childId: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleCandidates } = await supabase
    .from("challenges")
    .select("id, pedagogical_context")
    .eq("child_id", childId)
    .in("status", ["todo", "in_progress"])
    .lt("created_at", cutoff)
    .not("pedagogical_context", "is", null);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (const c of staleCandidates ?? []) {
    let ctx: any;
    try {
      ctx = JSON.parse(c.pedagogical_context);
    } catch {
      continue;
    }
    if (!ctx?.is_discriminant || ctx?.abandoned_processed) continue;

    await processDiscriminantResult(c.id, "ABANDONED");
    // Marqué "traité" indépendamment du résultat (ex: cycle déjà résolu autrement
    // entre-temps) — retenter n'apporterait rien, autant arrêter de le revérifier
    // à chaque visite.
    await supabaseAdmin
      .from("challenges")
      .update({ pedagogical_context: JSON.stringify({ ...ctx, abandoned_processed: true }) })
      .eq("id", c.id);
  }
}

export const ensureHypothesesForChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => EnsureInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    try {
      await processAbandonedDiscriminantChallenges(supabase, data.childId);
    } catch (err) {
      console.error("Non-fatal: processAbandonedDiscriminantChallenges failed", err);
    }

    const { data: existingCycles } = await supabase
      .from("hypothesis_cycles")
      .select("id, trigger_domain, status, hypotheses, parent_narrative")
      .eq("child_id", data.childId);

    // Résilience : un cycle déjà raisonné (Sonnet) mais dont la narration (Haiku) a échoué
    // précédemment n'a pas besoin de repasser par le raisonnement — seule la narration,
    // moins coûteuse, est retentée.
    const unnarrated = (existingCycles ?? []).find((c) => !c.parent_narrative);
    if (unnarrated) {
      const hyps =
        (unnarrated.hypotheses as { cause: string; evidence_log: { fact: string }[] }[]) || [];
      const domainLabel =
        ACADEMIC_DOMAIN_LABELS[unnarrated.trigger_domain ?? ""] ?? "apprentissage";
      const direction =
        hyps[0]?.cause === "READY_FOR_MORE" ? ("AHEAD" as const) : ("BEHIND" as const);
      const narrative = await narrateForParent(child.name, child.age, domainLabel, direction, hyps);
      if (narrative) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: updated } = await supabaseAdmin
          .from("hypothesis_cycles")
          .update({ parent_narrative: narrative })
          .eq("id", unnarrated.id)
          .select("*")
          .single();
        return { generated: true as const, cycle: updated };
      }
      return { generated: false as const };
    }

    // Détection : les GAP_WINDOW derniers défis académiques complétés, groupés par domaine.
    const { data: recentAcademic } = await supabase
      .from("challenges")
      .select("academic_domain, academic_level_age, completed_at")
      .eq("child_id", data.childId)
      .eq("status", "completed")
      .not("academic_domain", "is", null)
      .order("completed_at", { ascending: false })
      .limit(30);

    const byDomain = new Map<string, number[]>();
    for (const c of recentAcademic ?? []) {
      if (!c.academic_domain || c.academic_level_age == null) continue;
      const arr = byDomain.get(c.academic_domain) ?? [];
      if (arr.length < GAP_WINDOW) arr.push(c.academic_level_age);
      byDomain.set(c.academic_domain, arr);
    }

    const openDomains = new Set(
      (existingCycles ?? [])
        .filter((c) => c.status === "open" && c.trigger_domain)
        .map((c) => c.trigger_domain as string),
    );

    let triggerDomain: string | null = null;
    let direction: "BEHIND" | "AHEAD" | null = null;
    for (const [domain, levels] of byDomain.entries()) {
      if (levels.length < GAP_WINDOW || openDomains.has(domain)) continue;
      const allBehind = levels.every((l) => child.age - l >= GAP_THRESHOLD_YEARS);
      const allAhead = levels.every((l) => l - child.age >= GAP_THRESHOLD_YEARS);
      if (allBehind || allAhead) {
        triggerDomain = domain;
        direction = allBehind ? "BEHIND" : "AHEAD";
        break;
      }
    }

    if (!triggerDomain || !direction) {
      // Étape 3 — "classer automatiquement le commentaire du parent" (brainstorm produit,
      // 2026-08-02) : seconde stratégie de détection, même esprit que l'écart âge/référentiel
      // ci-dessus (0 raisonnement IA pour la détection elle-même — ici la preuve est déjà
      // directe, la cause déjà classée par défi au moment de la soumission, cf.
      // classifyNotCompletedReason dans challenges.functions.ts). Motif retenu : les
      // GAP_WINDOW derniers défis non réussis d'un même domaine partagent tous la même cause
      // classée — même seuil que l'écart académique (décision utilisateur explicite de garder
      // 4, pas 2, pour ce chantier aussi).
      const { data: recentNotCompleted } = await supabase
        .from("challenges")
        .select("domain, not_completed_cause, title, not_completed_at")
        .eq("child_id", data.childId)
        .eq("status", "not_completed")
        .not("not_completed_cause", "is", null)
        .order("not_completed_at", { ascending: false })
        .limit(30);

      const pattern = findRepeatedNotCompletedCause(
        (recentNotCompleted ?? []).map((c) => ({
          domain: c.domain,
          cause: c.not_completed_cause,
          title: c.title,
        })),
        openDomains,
      );

      if (!pattern) return { generated: false as const };
      const { domain: ncDomain, cause: ncCause, evidence: ncEvidence } = pattern;

      // Le témoignage du parent est une preuve plus faible qu'une observation IA sur photo
      // (cf. brainstorm) : le cycle s'ouvre "open" (0.6 < seuil de résolution 0.65), jamais
      // directement "resolved" — un vrai défi discriminant doit encore tester l'hypothèse
      // avant que Naya ne la considère confirmée.
      const ncHypotheses = [
        {
          cause: ncCause,
          prior_probability: 0.6,
          current_probability: 0.6,
          rationale: `Les ${GAP_WINDOW} derniers défis non réussis de ce domaine ont tous été classés par l'IA comme relevant de cette cause, à partir de l'explication donnée par le parent.`,
          evidence_log: ncEvidence.map((e) => ({
            source_node: "not_completed_reason",
            fact: `Défi "${e.title}" non réussi (cause classée : ${e.cause})`,
            weight_impact: "NEGATIVE",
          })),
        },
        {
          cause: "OTHER",
          prior_probability: 0.4,
          current_probability: 0.4,
          rationale: "Part réservée à d'autres facteurs non encore identifiés.",
          evidence_log: [],
        },
      ];

      const ncNarrative = await narrateForParent(
        child.name,
        child.age,
        ncDomain,
        "BEHIND",
        ncHypotheses,
      );

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: ncCycleRow, error: ncInsertErr } = await supabaseAdmin
        .from("hypothesis_cycles")
        .insert({
          child_id: data.childId,
          user_id: userId,
          trigger_domain: ncDomain,
          hypotheses: ncHypotheses,
          model: "deterministic:not_completed_pattern",
          status: "open",
          parent_narrative: ncNarrative,
        })
        .select("*")
        .single();

      if (ncInsertErr) throw new Error(ncInsertErr.message);
      return { generated: true as const, cycle: ncCycleRow };
    }

    const domainLabel = ACADEMIC_DOMAIN_LABELS[triggerDomain] ?? triggerDomain;

    // Snapshot du Jumeau Pédagogique pour le débruitage (même logique qu'avant le retrait
    // des notes : une compétence Gardner déjà forte dans le domaine change la lecture).
    const { data: twin } = await supabase
      .from("pedagogical_twins")
      .select("drivers, competencies, interests")
      .eq("child_id", data.childId)
      .maybeSingle();

    // Snapshot du Jumeau Pédagogique pour le débruitage (même logique qu'avant le retrait
    // des notes : une compétence Gardner déjà forte dans le domaine change la lecture).
    // Assemblage du prompt délégué au builder pur buildHypothesisPrompt (chantier 1
    // « Naya 3.0 ») : rappels du rôle system + snapshot, testé unitairement.

    // DeepSeek Reasoner (R1) remplace Claude Sonnet 5 pour ce rôle de raisonnement
    // depuis le passage à DeepSeek (2026-07-21) — Sonnet est désormais réservé à
    // la vision uniquement (cf. callClaude dans challenges.functions.ts).
    const NAYA_REASONING_MODEL = "deepseek-reasoner";
    const raw = await callClaude(
      buildHypothesisPrompt({
        enfant: { prenom: child.name, age: child.age },
        ecartReferentiel: {
          domaine: domainLabel,
          direction:
            direction === "BEHIND"
              ? "en retard sur le référentiel"
              : "en avance sur le référentiel",
          niveaux_recents_observes: byDomain.get(triggerDomain),
        },
        jumeauPedagogique: {
          moteurs: twin?.drivers ?? {},
          competences_gardner: twin?.competencies ?? {},
          interets: twin?.interests ?? {},
        },
      }),
      true,
      undefined,
      4000,
      3,
      undefined,
      NAYA_REASONING_MODEL,
    );

    let parsed: { hypotheses?: unknown };
    try {
      parsed = safeJsonParse(raw);
    } catch (err) {
      console.error(
        "Error parsing LLM response in runHypothesisEngine:",
        err,
        "Raw response:",
        raw,
      );
      throw new Error("Réponse IA invalide (JSON non parsable).");
    }

    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute
    // (avant normalisation bayésienne — on audite ce que l'IA a réellement produit).
    void verifyAndLog({
      kind: "hypothesis",
      output: parsed,
      context: { childAge: child.age, childName: child.name, direction },
      sourceFunction: "runHypothesisEngine",
      childId: data.childId,
      model: NAYA_REASONING_MODEL,
    });

    const HypothesisSchema = z.object({
      cause: z.string(),
      prior_probability: z.number(),
      rationale: z.string().default(""),
      evidence_log: z
        .array(
          z.object({
            source_node: z.string().default(""),
            fact: z.string().default(""),
            weight_impact: z.string().default("POSITIVE_LOW"),
          }),
        )
        .default([]),
    });

    let list: z.infer<typeof HypothesisSchema>[];
    try {
      list = z.array(HypothesisSchema).parse(parsed.hypotheses ?? []);
    } catch {
      throw new Error("Réponse IA invalide (schéma d'hypothèses).");
    }

    list = list.filter(
      (h) => (ALLOWED_CAUSES as readonly string[]).includes(h.cause) && h.prior_probability > 0,
    );
    if (list.length === 0) throw new Error("Aucune hypothèse valide générée.");

    const total = list.reduce((s, h) => s + h.prior_probability, 0);
    const hypotheses = list
      .map((h) => {
        const prior = Number((h.prior_probability / total).toFixed(4));
        return {
          cause: h.cause,
          prior_probability: prior,
          current_probability: prior,
          rationale: h.rationale,
          evidence_log: h.evidence_log,
        };
      })
      .sort((a, b) => b.prior_probability - a.prior_probability);

    const parentNarrative = await narrateForParent(
      child.name,
      child.age,
      domainLabel,
      direction,
      hypotheses,
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cycle, error: insertErr } = await supabaseAdmin
      .from("hypothesis_cycles")
      .insert({
        child_id: data.childId,
        user_id: userId,
        trigger_domain: triggerDomain,
        hypotheses,
        model: NAYA_REASONING_MODEL,
        status: "open",
        parent_narrative: parentNarrative,
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return { generated: true as const, cycle };
  });

// ── NAYA 2.0 Phase 3b — Génération de Défi Discriminant & Boucle Bayésienne ──

const DiscriminantInput = z.object({
  childId: z.string().uuid(),
});

export const generateDiscriminantChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => DiscriminantInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Ownership & profil enfant
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, interests, talents")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable.");

    // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
    // confiance est dérivée à la lecture (complétions vs abandons, par groupe de talents).
    const interestHypotheses = await getInterestHypothesesSnapshot(
      supabase as any,
      data.childId,
    ).catch(() => null);

    // 2. Récupère le cycle ouvert le plus récent
    const { data: cycle, error: cycleErr } = await supabase
      .from("hypothesis_cycles")
      .select("id, hypotheses, trigger_domain")
      .eq("child_id", data.childId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycleErr || !cycle) {
      return { ok: false as const, reason: "NO_OPEN_CYCLE" as const };
    }

    const hypotheses = (cycle.hypotheses as { cause: string; current_probability: number }[]) || [];
    if (hypotheses.length === 0) return { ok: false as const, reason: "NO_HYPOTHESES" as const };

    // Hypothèse prioritaire (celle avec la plus grande probabilité actuelle)
    const topHypothesis = hypotheses[0];
    const isReadyForMore = topHypothesis.cause === "READY_FOR_MORE";

    // Domaine concerné — stocké directement sur le cycle depuis le nouveau déclencheur
    // (cf. genizio-decisions #38), plus simple que l'ancienne indirection par anomalie.
    const subject = ACADEMIC_DOMAIN_LABELS[cycle.trigger_domain ?? ""] ?? "apprentissage";

    // 3. Prompt d'IA pour concevoir le défi discriminant
    const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);
    const objective = isReadyForMore
      ? `vérifier si ${child.name} est vraiment prêt·e pour un niveau plus avancé en ${subject}`
      : `tester l'hypothèse causale "${topHypothesis.cause}" concernant des difficultés récentes en ${subject}`;
    const prompt = `Tu es Naya, la mentore IA. Tu dois concevoir un DÉFI DISCRIMINANT sur mesure pour ${child.name}, ${child.age} ans.
Objectif pédagogique : ${objective}.

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

Règles de conception selon l'hypothèse à tester :
- Si METHOD_MISMATCH : Propose un défi hautement pratique, visuel ou manipulatoire en ${subject} qui contourne la présentation scolaire théorique habituelle.
- Si PERFORMANCE_ANXIETY : Propose un défi ludique, décontracté et sans pression de temps ni d'évaluation, axé uniquement sur le plaisir d'essayer.
- Si LACK_OF_ENGAGEMENT : Ancre le défi à 100% sur les leviers comportementaux et la posture d'action préférentielle de l'enfant (décrits ci-dessus) pour raviver immédiatement sa curiosité et son engagement.
- Si CONCEPTUAL_GAP : Propose une micro-activité fondamentale pas-à-pas très accessible pour vérifier les bases de manière amusante.
- Si READY_FOR_MORE : Propose un défi sensiblement PLUS AVANCÉ que d'habitude en ${subject} (niveau au-dessus de l'âge de l'enfant selon le référentiel ci-dessous), présenté comme une mission spéciale/bonus valorisante — jamais comme un test ou une punition.

${STEPS_INSTRUCTION}

${INTELLIGENCES_FIELD_INSTRUCTION}

${TRAIT_SUBFORM_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}

${ACADEMIC_REFERENTIAL_INSTRUCTION}

${ACADEMIC_SECRET_INSTRUCTION}

Réponds EXCLUSIVEMENT avec un objet JSON strict au format suivant :
{
  "title": "Titre stimulant et captivant",
  "domain": "Domaine (ex: Logique, Créativité, Sciences, etc.)",
  "description": "Consigne claire, encourageante et adaptée à l'âge de l'enfant",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2", "Étape 3"],
  "materials": ["Matériel 1", "Matériel 2"],
  "material_tags": ["tag1", "tag2"],
  "intelligences": ["creative"],
  "trait_subform": "..." (voir liste par intelligence ci-dessus) ou null,
  "difficulty": "moyen",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null),
  "academic_secret": "Explication stimulante du secret scientifique/académique avec niveau d'avance..."
}`;

    const rawJson = await callClaude(prompt, true, undefined, 2500, 2);
    let parsed: any;
    try {
      parsed = safeJsonParse(rawJson);
    } catch (err) {
      console.error("Error parsing discriminant challenge LLM response:", err, "Raw:", rawJson);
      throw new Error("Erreur de génération du défi discriminant.");
    }

    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
    void verifyAndLog({
      kind: "discriminant",
      output: parsed,
      context: { childAge: child.age, childName: child.name, domain: subject },
      sourceFunction: "generateDiscriminantChallenge",
      childId: data.childId,
      model: "deepseek-v4-flash",
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pedagogicalContext = JSON.stringify({
      cycle_id: cycle.id,
      target_cause: topHypothesis.cause,
      is_discriminant: true,
      subject,
    });

    // Correctif (2026-07-20, décision #34) : cette insertion contournait entièrement
    // finalizeChallenge (filet de sécurité + difficulté + material_tags) — un défi
    // discriminant généré par IA pouvait donc partir sans requires_supervision même
    // s'il impliquait feu/objets tranchants/etc. Même point de passage obligé que
    // tous les autres générateurs de défis de l'app (cf. assignTemplateChallenge).
    const safeTitle = (parsed.title || `Mission spéciale Naya : ${subject}`) as string;
    const safeDescription = (parsed.description || "") as string;
    const safeSteps = (parsed.steps || []) as string[];
    const safeMaterials = (parsed.materials || []) as string[];

    const { data: challenge, error: insertErr } = await supabaseAdmin
      .from("challenges")
      .insert({
        child_id: data.childId,
        user_id: userId,
        domain: parsed.domain || "Exploration",
        description: safeDescription,
        duration: parsed.duration || "15 min",
        steps: safeSteps,
        materials: safeMaterials,
        status: "todo",
        progress: 0,
        pedagogical_context: pedagogicalContext,
        // Même trou que generateChallenges/assignTemplateChallenge à l'origine (avant
        // correctif) : demandé au prompt (ACADEMIC_SECRET_INSTRUCTION) mais ce chemin
        // insère directement sans jamais recopier le champ — la carte "Avantage Secret
        // de Naya" retombait donc sur son texte générique pour tout défi discriminant.
        academic_secret: parsed.academic_secret ?? null,
        ...finalizeChallenge(
          {
            title: safeTitle,
            description: safeDescription,
            steps: safeSteps,
            materials: safeMaterials,
            material_tags: parsed.material_tags,
            intelligences: parsed.intelligences,
            trait_subform: parsed.trait_subform,
            difficulty: parsed.difficulty,
            proof_mode: parsed.proof_mode,
            proof_target: parsed.proof_target,
            declarative_award: parsed.declarative_award,
            academic_domain: parsed.academic_domain,
            academic_level_age: parsed.academic_level_age,
            academic_reference_note: parsed.academic_reference_note,
          },
          child.age,
        ),
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return { ok: true as const, challenge, targetCause: topHypothesis.cause };
  });

// ── Fonction interne de mise à jour bayésienne lors du résultat d'un défi discriminant ──

export async function processDiscriminantResult(
  challengeId: string,
  action: "COMPLETED" | "ABANDONED",
  aiValidated: boolean = true,
): Promise<{ processed: boolean; resolved?: boolean; finalDiagnosis?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Récupère le défi et son contexte pédagogique
  const { data: challenge } = await supabaseAdmin
    .from("challenges")
    .select("id, pedagogical_context")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge?.pedagogical_context) return { processed: false };

  let context: any;
  try {
    context = JSON.parse(challenge.pedagogical_context);
  } catch (err) {
    console.error("processDiscriminantResult: Failed to parse pedagogical_context JSON:", err);
    return { processed: false };
  }

  if (!context?.is_discriminant || !context?.cycle_id || !context?.target_cause) {
    return { processed: false };
  }

  // 2. Récupère le cycle d'hypothèses
  const { data: cycle } = await supabaseAdmin
    .from("hypothesis_cycles")
    .select("id, hypotheses, status")
    .eq("id", context.cycle_id)
    .maybeSingle();

  if (!cycle || cycle.status !== "open") return { processed: false };

  const hypotheses =
    (cycle.hypotheses as {
      cause: string;
      current_probability: number;
      prior_probability: number;
    }[]) || [];
  if (hypotheses.length === 0) return { processed: false };

  const targetCause = context.target_cause;

  // 3. Mise à jour bayésienne des probabilités
  const updated = hypotheses.map((h) => {
    let mult = 1.0;
    if (h.cause === targetCause) {
      if (action === "COMPLETED" && aiValidated) {
        mult = 1.8; // Succès au défi discriminant -> fort renforcement de la piste
      } else if (action === "ABANDONED") {
        mult = h.cause === "PERFORMANCE_ANXIETY" || h.cause === "LACK_OF_ENGAGEMENT" ? 1.5 : 0.6;
      }
    } else if (
      targetCause === "METHOD_MISMATCH" &&
      h.cause === "CONCEPTUAL_GAP" &&
      action === "COMPLETED"
    ) {
      mult = 0.4; // Réussite sur méthode alternative dément un manque de capacités réelles
    }
    return { ...h, current_probability: h.current_probability * mult };
  });

  // Renormalisation somme = 1.0
  const total = updated.reduce((s, h) => s + h.current_probability, 0);
  const normalized = updated
    .map((h) => ({
      ...h,
      current_probability: Number((h.current_probability / (total || 1)).toFixed(4)),
    }))
    .sort((a, b) => b.current_probability - a.current_probability);

  const topHypothesis = normalized[0];

  // Seuil de convergence : probabilité >= 0.65
  const isResolved = topHypothesis.current_probability >= 0.65;

  const updatePayload: any = {
    hypotheses: normalized,
    updated_at: new Date().toISOString(),
  };

  if (isResolved) {
    updatePayload.status = "resolved";
    updatePayload.final_diagnosis = topHypothesis.cause;
    // Manquait dans la version d'origine : resolved_at existe dans le schéma
    // (Phase 3a) précisément pour marquer ce moment, jamais renseigné jusqu'ici.
    updatePayload.resolved_at = new Date().toISOString();

    // Étape 4 : une cause confirmée qui justifie un accompagnement ne doit pas retomber
    // instantanément à zéro (cf. brainstorm) — le soutien reste actif, recommendChallengesForChild
    // continue de proposer des défis "Stabilisation" ciblés sur ce domaine jusqu'à ce qu'un
    // défi de retest (sans accommodation) confirme que ce n'est plus nécessaire.
    if ((ACCOMMODATION_CAUSES as readonly string[]).includes(topHypothesis.cause)) {
      updatePayload.support_active = true;
      updatePayload.support_checkpoint_at = new Date().toISOString();
    }
  }

  // Correctif (2026-07-20, décision #34) : cet update échouait silencieusement sur
  // TOUTE mise à jour bayésienne — updated_at n'existait pas encore sur
  // hypothesis_cycles (PGRST204, confirmé en direct avant correctif) et l'erreur
  // n'était jamais vérifiée. La colonne a été ajoutée (migration
  // 20260720170000) ; on vérifie maintenant explicitement l'erreur en plus, pour
  // qu'un futur problème similaire ne redevienne pas silencieux.
  const { error: updateErr } = await supabaseAdmin
    .from("hypothesis_cycles")
    .update(updatePayload)
    .eq("id", cycle.id);

  if (updateErr) {
    console.error("processDiscriminantResult: échec de la mise à jour bayésienne:", updateErr);
    return { processed: false };
  }

  return { processed: true, resolved: isResolved, finalDiagnosis: topHypothesis.cause };
}

// ── Étape 4 — Défi de retest & sortie du soutien renforcé (brainstorm produit, 2026-08-02) ──

const SupportRetestInput = z.object({
  childId: z.string().uuid(),
  cycleId: z.string().uuid(),
});

// Contrairement à generateDiscriminantChallenge, qui applique délibérément l'accommodation
// de la cause pour la CONFIRMER, ce défi teste l'inverse : un défi standard (ni facilité, ni
// durci), pour vérifier si l'enfant réussit encore sans le soutien renforcé. Voir
// processSupportRetestResult pour ce que son résultat déclenche.
export const generateSupportRetestChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireRateLimit])
  .validator((input: unknown) => SupportRetestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, interests")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .is("access_locked_at", null)
      .eq("is_active", true)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable.");

    // Décision 2026-08-05 : les intérêts déclarés sont des HYPOTHÈSES de travail — leur
    // confiance est dérivée à la lecture (complétions vs abandons, par groupe de talents).
    const interestHypotheses = await getInterestHypothesesSnapshot(
      supabase as any,
      data.childId,
    ).catch(() => null);

    const { data: cycle, error: cycleErr } = await supabase
      .from("hypothesis_cycles")
      .select("id, trigger_domain, final_diagnosis")
      .eq("id", data.cycleId)
      .eq("child_id", data.childId)
      .maybeSingle();
    if (cycleErr || !cycle || !cycle.trigger_domain) {
      return { ok: false as const, reason: "NO_CYCLE" as const };
    }

    const subject = ACADEMIC_DOMAIN_LABELS[cycle.trigger_domain] ?? cycle.trigger_domain;
    const formattedInterests = formatChildInterestsPayload(child.interests, interestHypotheses);

    const prompt = `Tu es Naya, la mentore IA. Conçois un défi NORMAL et STANDARD pour ${child.name}, ${child.age} ans, en ${subject}.

Contexte interne (ne JAMAIS le transposer dans le défi visible par l'enfant/le parent) : cet enfant a bénéficié récemment d'un accompagnement renforcé dans ce domaine ; ce défi sert à vérifier discrètement s'il en a encore besoin. Le défi doit donc être un défi NORMAL de ce domaine — ni délibérément facilité/rassurant, ni délibérément durci — présenté exactement comme n'importe quel autre défi, sans aucune indication qu'il s'agit d'un test.

Modes d'engagement et leviers comportementaux observés par le parent :
${formattedInterests}

${STEPS_INSTRUCTION}

${INTELLIGENCES_FIELD_INSTRUCTION}

${TRAIT_SUBFORM_INSTRUCTION}

${PROOF_MODE_INSTRUCTION}

${ACADEMIC_REFERENTIAL_INSTRUCTION}

${ACADEMIC_SECRET_INSTRUCTION}

Réponds EXCLUSIVEMENT avec un objet JSON strict au format suivant :
{
  "title": "Titre stimulant",
  "domain": "Domaine (ex: Logique, Créativité, Sciences, etc.)",
  "description": "Consigne claire, adaptée à l'âge de l'enfant",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2", "Étape 3"],
  "materials": ["Matériel 1", "Matériel 2"],
  "material_tags": ["tag1", "tag2"],
  "intelligences": ["creative"],
  "trait_subform": "..." (voir liste par intelligence ci-dessus) ou null,
  "difficulty": "moyen",
  "proof_mode": "photo" ou "declarative",
  "proof_target": {"metric": "...", "value": 20} (uniquement si declarative),
  "declarative_award": {"corporelle": 2} (uniquement si declarative),
  "academic_domain": "mathematiques" | "langage" | "sciences" | "corporelle" | "sociale" | "emotionnelle" | "entrepreneuriale" | "artisanale" | "spatiale" | null,
  "academic_level_age": 14 (uniquement si academic_domain non null),
  "academic_reference_note": "..." (uniquement si academic_domain non null),
  "academic_secret": "Explication stimulante du secret scientifique/académique avec niveau d'avance..."
}`;

    const rawJson = await callClaude(prompt, true, undefined, 2500, 2);
    let parsed: any;
    try {
      parsed = safeJsonParse(rawJson);
    } catch (err) {
      console.error("Error parsing support retest challenge LLM response:", err, "Raw:", rawJson);
      throw new Error("Erreur de génération du défi de retest.");
    }

    // Le Loup (chantier 2, Naya 3.0) : audit shadow non-bloquant de la sortie brute.
    void verifyAndLog({
      kind: "support_retest",
      output: parsed,
      context: { childAge: child.age, childName: child.name, domain: subject },
      sourceFunction: "generateSupportRetestChallenge",
      childId: data.childId,
      model: "deepseek-v4-flash",
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pedagogicalContext = JSON.stringify({
      is_support_retest: true,
      cycle_id: cycle.id,
      target_cause: cycle.final_diagnosis,
    });

    const safeTitle = (parsed.title || `Mission Naya : ${subject}`) as string;
    const safeDescription = (parsed.description || "") as string;
    const safeSteps = (parsed.steps || []) as string[];
    const safeMaterials = (parsed.materials || []) as string[];

    const { data: challenge, error: insertErr } = await supabaseAdmin
      .from("challenges")
      .insert({
        child_id: data.childId,
        user_id: userId,
        domain: parsed.domain || "Exploration",
        description: safeDescription,
        duration: parsed.duration || "15 min",
        steps: safeSteps,
        materials: safeMaterials,
        status: "todo",
        progress: 0,
        pedagogical_context: pedagogicalContext,
        // Même trou que generateDiscriminantChallenge — voir le commentaire équivalent
        // là-bas, cause racine identique (insertion directe qui ne recopiait jamais le
        // champ demandé au prompt).
        academic_secret: parsed.academic_secret ?? null,
        ...finalizeChallenge(
          {
            title: safeTitle,
            description: safeDescription,
            steps: safeSteps,
            materials: safeMaterials,
            material_tags: parsed.material_tags,
            intelligences: parsed.intelligences,
            trait_subform: parsed.trait_subform,
            difficulty: parsed.difficulty,
            proof_mode: parsed.proof_mode,
            proof_target: parsed.proof_target,
            declarative_award: parsed.declarative_award,
            academic_domain: parsed.academic_domain,
            academic_level_age: parsed.academic_level_age,
            academic_reference_note: parsed.academic_reference_note,
          },
          child.age,
        ),
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return { ok: true as const, challenge };
  });

// Symétrique de processDiscriminantResult, mais inversé : ici, RÉUSSIR sans accommodation
// est un signal CONTRE le maintien du soutien renforcé (pas une confirmation de la cause).
export async function processSupportRetestResult(
  challengeId: string,
  action: "COMPLETED" | "ABANDONED",
): Promise<{ processed: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: challenge } = await supabaseAdmin
    .from("challenges")
    .select("id, pedagogical_context")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge?.pedagogical_context) return { processed: false };

  let context: any;
  try {
    context = JSON.parse(challenge.pedagogical_context);
  } catch {
    return { processed: false };
  }

  if (!context?.is_support_retest || !context?.cycle_id) return { processed: false };

  const updatePayload =
    action === "COMPLETED"
      ? { support_active: false }
      : // Encore besoin de soutien : on redémarre le compteur de 5 défis depuis maintenant,
        // plutôt que de retenter un retest à chaque prochaine génération.
        { support_checkpoint_at: new Date().toISOString() };

  const { error } = await supabaseAdmin
    .from("hypothesis_cycles")
    .update(updatePayload)
    .eq("id", context.cycle_id);

  if (error) {
    console.error("processSupportRetestResult: échec de la mise à jour:", error);
    return { processed: false };
  }

  return { processed: true };
}
