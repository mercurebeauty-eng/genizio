import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClaude } from "@/lib/challenges.functions";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { z } from "zod";

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
  "OTHER",
] as const;

// Correspondance douce matière scolaire → clé de compétence Gardner (celles réellement
// suivies dans le Jumeau via les défis validés). Sert au débruitage performance≠compétence
// (§2 du plan) : une compétence forte + une note effondrée dans la matière liée = signal
// fort de METHOD_MISMATCH plutôt que de lacune réelle. Volontairement partielle : une
// matière sans correspondance (ou "Autre") laisse le modèle raisonner sans ce signal.
const SUBJECT_TO_TALENT: Record<string, string> = {
  "Mathématiques": "logico_mathematique",
  "Sciences (SVT/Physique-Chimie)": "logico_mathematique",
  "Informatique": "logico_mathematique",
  "Français": "linguistique",
  "Anglais": "linguistique",
  "Histoire-Géographie": "linguistique",
  "Philosophie": "linguistique",
  "Éducation Civique": "sociale",
  "EPS": "corporelle",
  "Arts Plastiques": "creative",
  "Musique": "creative",
};

function relatedTalentKey(subject: string): string | null {
  if (SUBJECT_TO_TALENT[subject]) return SUBJECT_TO_TALENT[subject];
  // Correspondance floue pour les matières libres ("Autre") : mots-clés courants.
  const s = subject.toLowerCase();
  if (/math|calcul|physique|chimie|scienc|logi|info|program/.test(s)) return "logico_mathematique";
  if (/franç|langue|anglais|littér|lecture|écrit|histoire|philo/.test(s)) return "linguistique";
  if (/art|dessin|musiqu|peintur/.test(s)) return "creative";
  if (/sport|eps|gym|danse/.test(s)) return "corporelle";
  return null;
}

const EnsureInput = z.object({ childId: z.string().uuid() });

export const ensureHypothesesForChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => EnsureInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Ownership du profil (le context.supabase est déjà RLS-scopé, vérif explicite en
    //    défense en profondeur, cohérent avec le reste de l'app).
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable ou accès refusé.");

    // 2. Anomalies non résolues de cet enfant + cycles déjà existants → la plus récente
    //    anomalie SANS cycle. RLS restreint déjà aux lignes de cet utilisateur.
    const [{ data: anomalies }, { data: existingCycles }] = await Promise.all([
      supabase
        .from("anomaly_triggers")
        .select("id, school_grade_id, z_score, created_at")
        .eq("child_id", data.childId)
        .eq("resolved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("hypothesis_cycles")
        .select("anomaly_trigger_id")
        .eq("child_id", data.childId),
    ]);

    const cycledIds = new Set((existingCycles ?? []).map((c) => c.anomaly_trigger_id));
    const pending = (anomalies ?? []).find((a) => !cycledIds.has(a.id));
    if (!pending) return { generated: false as const };

    // 3. La note déclencheuse + son historique dans la même matière (contexte de tendance).
    const { data: grade, error: gradeErr } = await supabase
      .from("school_grades")
      .select("subject, grade, max_grade, evaluation_type, context, graded_at")
      .eq("id", pending.school_grade_id)
      .maybeSingle();
    if (gradeErr || !grade) throw new Error("Note déclencheuse introuvable.");

    const { data: subjectHistory } = await supabase
      .from("school_grades")
      .select("grade, max_grade, evaluation_type, graded_at")
      .eq("child_id", data.childId)
      .eq("subject", grade.subject)
      .order("graded_at", { ascending: true });

    // 4. Snapshot du Jumeau Pédagogique (peut être null si aucun défi validé encore).
    const { data: twin } = await supabase
      .from("pedagogical_twins")
      .select("drivers, competencies, interests")
      .eq("child_id", data.childId)
      .maybeSingle();

    // Signal-clé de débruitage : la compétence Gardner liée à la matière, telle que le
    // Jumeau la connaît (issue UNIQUEMENT de défis validés, pas auto-déclarée).
    const talentKey = relatedTalentKey(grade.subject);
    const competencies = (twin?.competencies as Record<string, any> | null) ?? {};
    const relatedCompetency = talentKey
      ? {
          key: talentKey,
          label: TALENT_KEY_LABELS[talentKey] ?? talentKey,
          value: competencies[talentKey]?.value ?? null,
          category: competencies[talentKey]?.category ?? null,
          observations_count: competencies[talentKey]?.n ?? 0,
        }
      : null;

    const snapshot = {
      enfant: { prenom: child.name, age: child.age },
      note_anormale: {
        matiere: grade.subject,
        note: grade.grade,
        bareme: grade.max_grade,
        ratio: Number((grade.grade / grade.max_grade).toFixed(3)),
        type_evaluation: grade.evaluation_type,
        contexte_declare_par_le_parent: grade.context,
        date: grade.graded_at,
        z_score: pending.z_score,
      },
      historique_notes_meme_matiere: (subjectHistory ?? []).map((g) => ({
        note: g.grade,
        bareme: g.max_grade,
        ratio: Number((g.grade / g.max_grade).toFixed(3)),
        type: g.evaluation_type,
        date: g.graded_at,
      })),
      competence_liee_a_la_matiere: relatedCompetency,
      jumeau_pedagogique: {
        moteurs: twin?.drivers ?? {},
        competences_gardner: competencies,
        interets: twin?.interests ?? {},
      },
    };

    const systemReminders = `Tu es le moteur de diagnostic de Naya, l'IA mentore de Génizio. Tu opères selon le PARADIGME D'INVESTIGATION : une note basse n'est JAMAIS un verdict ("mauvais en maths"), c'est un signal dont tu dois rechercher la cause profonde. Tu génères un arbre d'hypothèses causales pondérées, jamais une conclusion définitive.

RÈGLE ABSOLUE : raisonne UNIQUEMENT à partir des données fournies dans le snapshot. Si un signal est absent, ne l'invente pas — n'en tiens pas compte. Le Jumeau Pédagogique de cette plateforme ne contient PAS de mesure de tempérament, d'anxiété innée ni de style d'apprentissage explicite : tu ne peux donc PAS supposer un trait d'anxiété ou un mode d'apprentissage sans indice concret dans les données.

SIGNAUX DISPONIBLES et comment les lire :
- "competence_liee_a_la_matiere" : la compétence Gardner que cette matière sollicite, telle que Naya l'a mesurée via les DÉFIS RÉELLEMENT VALIDÉS de l'enfant (preuve concrète, jamais auto-déclarée). C'est ton signal le plus fiable. Si "value" est élevée (proche de 1) ou "category" = FORCE alors que la note scolaire s'effondre : la capacité EXISTE mais ne s'exprime pas dans le format scolaire → cela renforce fortement METHOD_MISMATCH et affaiblit CONCEPTUAL_GAP. Si "observations_count" est faible (0-1), ce signal est peu fiable, reste prudent.
- "contexte_declare_par_le_parent" et "type_evaluation" : seule source pour PERFORMANCE_ANXIETY. Si le contexte mentionne stress, chronométrage, pression, fatigue, ou si le type est un examen à fort enjeu, renforce PERFORMANCE_ANXIETY. SANS un tel indice, ne surpondère PAS cette hypothèse (tu n'as aucun trait d'anxiété mesuré).
- "interets" (declared = déclarés par le parent, domains_engaged = domaines réellement engagés via les défis) : si la matière ne correspond à aucun intérêt/domaine engagé ET que l'enfant montre de l'engagement ailleurs (persévérance correcte, défis complétés dans d'autres domaines), renforce LACK_OF_ENGAGEMENT.
- "moteurs.perseverance" : une persévérance basse/en chute peut moduler toutes les hypothèses.
- "historique_notes_meme_matiere" : distingue une chute ponctuelle (une seule mauvaise note dans une série correcte) d'une tendance lourde.

LES CAUSES POSSIBLES (utilise ces libellés exacts) :
- METHOD_MISMATCH : la méthode/le format d'évaluation ne convient pas ; la connaissance existe mais ne s'exprime pas dans ce format.
- PERFORMANCE_ANXIETY : stress/pression au moment de l'évaluation (uniquement si indice contextuel).
- LACK_OF_ENGAGEMENT : désintérêt pour la matière ou déconnexion de ses centres d'intérêt.
- CONCEPTUAL_GAP : lacune conceptuelle réelle sur des prérequis. ATTENTION : c'est l'hypothèse la plus proche d'un verdict — ne l'attribue une probabilité élevée QUE si aucun signal de compétence liée forte n'existe. Ne jamais en faire l'hypothèse par défaut par facilité.
- OTHER : uniquement si aucune des causes ci-dessus ne colle ; explique alors précisément.

DIRECTIVES DE SORTIE STRICTES :
- Génère 2 à 4 hypothèses, classées de la plus probable à la moins probable.
- La somme des "prior_probability" DOIT valoir 1.0.
- Si le Jumeau est pauvre en données (peu de compétences mesurées, contexte absent), exprime cette incertitude par des probabilités plus proches les unes des autres, et dis-le dans le rationale.
- Chaque hypothèse cite dans "evidence_log" les nœuds réels du snapshot qui la justifient (chemin comme "competence_liee_a_la_matiere" ou "jumeau_pedagogique.moteurs.perseverance").
- "rationale" : explique en français clair le mécanisme psychopédagogique suspecté, en 1-2 phrases, comme pour un futur lecteur humain (éducateur).
- Réponds EXCLUSIVEMENT en JSON brut valide selon ce schéma, sans texte autour, sans bloc Markdown :
{"hypotheses":[{"cause":"METHOD_MISMATCH","prior_probability":0.45,"rationale":"...","evidence_log":[{"source_node":"competence_liee_a_la_matiere","fact":"...","weight_impact":"POSITIVE_HIGH"}]}]}
"weight_impact" ∈ {"POSITIVE_HIGH","POSITIVE_LOW","NEGATIVE"}.`;

    const userContent = `Voici le cas à diagnostiquer :\n${JSON.stringify(snapshot, null, 2)}`;

    const NAYA_REASONING_MODEL = "claude-sonnet-5";
    // 4000 tokens : Sonnet 5 produit un bloc de raisonnement (thinking) AVANT le JSON, et
    // ces tokens comptent dans le budget max — 1500 était entièrement consommé par le
    // thinking, laissant le JSON tronqué/vide (stop_reason=max_tokens vérifié en direct).
    // Le déterminisme vient du system prompt strict + JSON mode (callClaude n'expose pas
    // encore la température).
    const raw = await callClaude(
      `${systemReminders}\n\n${userContent}`,
      true,
      undefined,
      4000,
      3,
      undefined,
      NAYA_REASONING_MODEL
    );

    let parsed: { hypotheses?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Réponse IA invalide (JSON non parsable).");
    }

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
          })
        )
        .default([]),
    });

    let list: z.infer<typeof HypothesisSchema>[];
    try {
      list = z.array(HypothesisSchema).parse(parsed.hypotheses ?? []);
    } catch {
      throw new Error("Réponse IA invalide (schéma d'hypothèses).");
    }

    // Garde les causes connues uniquement (une cause hallucinée polluerait le cycle).
    list = list.filter((h) => (ALLOWED_CAUSES as readonly string[]).includes(h.cause) && h.prior_probability > 0);
    if (list.length === 0) throw new Error("Aucune hypothèse valide générée.");

    // Renormalise les priors à 1.0 (une petite dérive du modèle ne doit pas casser
    // l'invariant somme=1) ; current_probability = prior au diagnostic initial.
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

    // Écriture via service role : hypothesis_cycles n'a aucune policy d'écriture cliente
    // (résultat calculé, pas une saisie). L'ownership de l'anomalie est déjà garanti par
    // les requêtes RLS-scopées ci-dessus.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cycle, error: insertErr } = await supabaseAdmin
      .from("hypothesis_cycles")
      .insert({
        child_id: data.childId,
        user_id: userId,
        anomaly_trigger_id: pending.id,
        hypotheses,
        model: NAYA_REASONING_MODEL,
        status: "open",
      })
      .select("*")
      .single();

    if (insertErr) {
      // Course entre deux chargements de Portfolio : l'index unique sur anomaly_trigger_id
      // a rejeté ce doublon — l'autre appel a déjà écrit le cycle, on le renvoie.
      if (insertErr.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("hypothesis_cycles")
          .select("*")
          .eq("anomaly_trigger_id", pending.id)
          .single();
        return { generated: false as const, cycle: existing };
      }
      throw new Error(insertErr.message);
    }

    return { generated: true as const, cycle };
  });
