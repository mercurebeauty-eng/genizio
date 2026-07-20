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

// NAYA 2.0 Phase 4 — restitution parent (cf. genizio-decisions #33). Rôle *narration*,
// délibérément séparé du rôle *raisonnement* ci-dessus (décision #27 : rôles swappables
// indépendamment) — et sur Haiku, pas Sonnet : traduire une structure déjà raisonnée en
// prose chaleureuse est le même type de tâche que getChildAISynthesis (Haiku, déjà
// éprouvé dans ce fichier), pas un problème de jugement causal qui justifierait le
// premium. Découverte concrète en construisant cette phase : le "rationale"/"evidence_log"
// généré par le rôle raisonnement contient des chiffres bruts ("0.85", "z=-10",
// "6 observations") — sûrs en interne, mais leur exposition directe violerait "jamais de
// probabilité brute" (§1 du plan). Cette fonction est donc réellement nécessaire, pas un
// simple confort : reformuler le rationale tel quel serait montrer un chiffre au parent.
async function narrateForParent(
  childName: string,
  childAge: number,
  subject: string,
  hypotheses: { cause: string; evidence_log: { fact: string }[] }[]
): Promise<string | null> {
  // Pré-nettoyage des faits bruts (retire les scores/z-scores/chiffres de l'entrée)
  // pour éviter d'inciter Haiku à les répéter.
  const sanitizeFact = (fact: string) => {
    return fact
      .replace(/z\s*=\s*-?\d+(\.\d+)?/gi, "écart significatif")
      .replace(/\b\d+(\.\d+)?\s*\/\s*\d+\b/g, "évaluation récente")
      .replace(/\b0\.\d+\b/g, "niveau très élevé")
      .replace(/\b\d+\s*observations?\b/gi, "plusieurs observations");
  };

  // Seules les 2 pistes les plus probables (déjà triées) nourrissent la narration.
  const top = hypotheses.slice(0, 2).map((h) => ({
    piste: h.cause,
    elements_observes: h.evidence_log.map((e) => sanitizeFact(e.fact)),
  }));

  const prompt = `Tu es Naya, la mentore IA bienveillante de Génizio. Tu écris directement pour le PARENT de ${childName}, ${childAge} ans, à propos d'une observation récente en ${subject}.

RÈGLES ABSOLUES, sans exception :
- INTERDICTION TOTALE de tout nombre, pourcentage, score ou statistique dans ta réponse — même si les données ci-dessous en contiennent (ex: ne jamais écrire "0.85", "75%", "z=-10", "6 observations"). Traduis TOUJOURS en tendances qualitatives, en langage courant ("elle réussit habituellement très bien dans ce domaine", "un écart net par rapport à d'habitude").
- INTERDICTION d'utiliser les étiquettes techniques ("METHOD_MISMATCH", "CONCEPTUAL_GAP", etc.) ou tout mot à consonance clinique/diagnostique ("trouble", "déficit", "anomalie", "cause", "diagnostic").
- Ne présente JAMAIS ceci comme une conclusion, un verdict ou un jugement définitif. C'est une observation provisoire que Naya continue d'explorer — le temps et le ton doivent le montrer ("Naya se demande si...", "elle a remarqué que...", "elle va continuer à observer...").
- Reste chaleureux, concret, tourné vers l'enfant comme une personne pleine de ressources — jamais alarmiste, jamais culpabilisant pour le parent ou l'enfant.
- Commence par la piste la plus probable ; n'évoque la seconde que si elle semble vraiment plausible aussi.
- 2 à 3 phrases courtes maximum, en français naturel, comme si tu parlais directement au parent.

Ce que Naya a observé (données internes à traduire fidèlement en langage humain, ne JAMAIS citer telles quelles) :
${JSON.stringify(top, null, 2)}

Réponds uniquement avec le texte final, sans guillemets, sans préambule, sans Markdown.`;

  try {
    const text = (await callClaude(prompt, false, undefined, 400, 2)).trim();
    if (!text) return null;

    // Nettoyage des puces numérotées éventuelles ("1. ", "2. ")
    let cleaned = text.replace(/^[\d\s.#-]+/gm, "").trim();

    // Remplacement doux des chiffres isolés par leur nom en lettres si besoin
    const digitWords: Record<string, string> = {
      "0": "zéro", "1": "un", "2": "deux", "3": "trois", "4": "quatre",
      "5": "cinq", "6": "six", "7": "sept", "8": "huit", "9": "neuf"
    };
    cleaned = cleaned.replace(/\b([0-9])\b/g, (m) => digitWords[m] || m);

    // Backstop déterministe derrière la consigne du modèle
    if (/\d/.test(cleaned)) {
      console.warn("narrateForParent: chiffre détecté malgré la consigne, narration rejetée:", cleaned);
      return null;
    }
    return cleaned;
  } catch (err) {
    console.error("narrateForParent failed (non-fatal, cycle stocké sans narration):", err);
    return null;
  }
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
        .select("id, anomaly_trigger_id, hypotheses, parent_narrative")
        .eq("child_id", data.childId),
    ]);

    // Résilience : un cycle déjà raisonné (Sonnet) mais dont la narration (Haiku) a
    // échoué précédemment n'a pas besoin de repasser par le raisonnement — seule la
    // narration, moins coûteuse, est retentée. Évite de gaspiller un appel Sonnet sur
    // une simple panne transitoire du second appel.
    const unnarrated = (existingCycles ?? []).find((c) => !c.parent_narrative);
    if (unnarrated) {
      const anomaly = (anomalies ?? []).find((a) => a.id === unnarrated.anomaly_trigger_id);
      if (anomaly) {
        const { data: g } = await supabase
          .from("school_grades")
          .select("subject")
          .eq("id", anomaly.school_grade_id)
          .maybeSingle();
        if (g) {
          const narrative = await narrateForParent(
            child.name,
            child.age,
            g.subject,
            unnarrated.hypotheses as { cause: string; evidence_log: { fact: string }[] }[]
          );
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
        }
      }
      return { generated: false as const };
    }

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

    // Rôle narration (Haiku) : traduit les hypothèses en langage parent AVANT l'insert,
    // pour qu'un cycle nouvellement visible n'ait jamais de fenêtre "raisonné mais pas
    // encore raconté" — un échec ici laisse simplement parent_narrative à null (voir la
    // résilience de backfill au début du handler), la génération d'hypothèses reste
    // acquise dans tous les cas.
    const parentNarrative = await narrateForParent(child.name, child.age, grade.subject, hypotheses);

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
        parent_narrative: parentNarrative,
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

// ── NAYA 2.0 Phase 3b — Génération de Défi Discriminant & Boucle Bayésienne ──

const DiscriminantInput = z.object({
  childId: z.string().uuid(),
});

export const generateDiscriminantChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => DiscriminantInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Ownership & profil enfant
    const { data: child, error: childErr } = await supabase
      .from("child_profiles")
      .select("id, name, age, interests, talents")
      .eq("id", data.childId)
      .eq("user_id", userId)
      .maybeSingle();
    if (childErr || !child) throw new Error("Profil enfant introuvable.");

    // 2. Récupère le cycle ouvert le plus récent
    const { data: cycle, error: cycleErr } = await supabase
      .from("hypothesis_cycles")
      .select("id, hypotheses, anomaly_trigger_id")
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

    // Récupération de la matière concernée via l'anomalie
    let subject = "apprentissage";
    if (cycle.anomaly_trigger_id) {
      const { data: anomaly } = await supabase
        .from("anomaly_triggers")
        .select("school_grade_id")
        .eq("id", cycle.anomaly_trigger_id)
        .maybeSingle();
      if (anomaly?.school_grade_id) {
        const { data: grade } = await supabase
          .from("school_grades")
          .select("subject")
          .eq("id", anomaly.school_grade_id)
          .maybeSingle();
        if (grade?.subject) subject = grade.subject;
      }
    }

    // 3. Prompt d'IA pour concevoir le défi discriminant
    const interestsStr = (child.interests || []).join(", ") || "expérimentation, création";
    const prompt = `Tu es Naya, la mentore IA. Tu dois concevoir un DÉFI DISCRIMINANT sur mesure pour ${child.name}, ${child.age} ans.
Objectif pédagogique : tester l'hypothèse causale "${topHypothesis.cause}" concernant des difficultés récentes en ${subject}.

Centres d'intérêt de l'enfant : ${interestsStr}

Règles de conception selon l'hypothèse à tester :
- Si METHOD_MISMATCH : Propose un défi hautement pratique, visuel ou manipulatoire en ${subject} qui contourne la présentation scolaire théorique habituelle.
- Si PERFORMANCE_ANXIETY : Propose un défi ludique, décontracté et sans pression de temps ni d'évaluation, axé uniquement sur le plaisir d'essayer.
- Si LACK_OF_ENGAGEMENT : Ancre le défi à 100% sur un des centres d'intérêt de l'enfant (${interestsStr}) pour raviver la curiosité.
- Si CONCEPTUAL_GAP : Propose une micro-activité fondamentale pas-à-pas très accessible pour vérifier les bases de manière amusante.

Réponds EXCLUSIVEMENT avec un objet JSON strict au format suivant :
{
  "title": "Titre stimulant et captivant",
  "domain": "Domaine (ex: Logique, Créativité, Sciences, etc.)",
  "description": "Consigne claire, encourageante et adaptée à l'âge de l'enfant",
  "duration": "15 min",
  "steps": ["Étape 1", "Étape 2", "Étape 3"],
  "materials": ["Matériel 1", "Matériel 2"],
  "material_tags": ["tag1", "tag2"],
  "difficulty": "moyen"
}`;

    const rawJson = await callClaude(prompt, true, undefined, 1000, 2);
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error("Erreur de génération du défi discriminant.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pedagogicalContext = JSON.stringify({
      cycle_id: cycle.id,
      target_cause: topHypothesis.cause,
      is_discriminant: true,
      subject,
    });

    const { data: challenge, error: insertErr } = await supabaseAdmin
      .from("challenges")
      .insert({
        child_id: data.childId,
        user_id: userId,
        title: parsed.title || `Mission spéciale Naya : ${subject}`,
        domain: parsed.domain || "Exploration",
        description: parsed.description,
        duration: parsed.duration || "15 min",
        steps: parsed.steps || [],
        materials: parsed.materials || [],
        material_tags: parsed.material_tags || [],
        difficulty: parsed.difficulty || "moyen",
        status: "todo",
        pedagogical_context: pedagogicalContext,
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
  aiValidated: boolean = true
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
  } catch {
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

  const hypotheses = (cycle.hypotheses as { cause: string; current_probability: number; prior_probability: number }[]) || [];
  if (hypotheses.length === 0) return { processed: false };

  const targetCause = context.target_cause;

  // 3. Mise à jour bayésienne des probabilités
  const updated = hypotheses.map((h) => {
    let mult = 1.0;
    if (h.cause === targetCause) {
      if (action === "COMPLETED" && aiValidated) {
        mult = 1.8; // Succès au défi discriminant -> fort renforcement de la piste
      } else if (action === "ABANDONED") {
        mult = (h.cause === "PERFORMANCE_ANXIETY" || h.cause === "LACK_OF_ENGAGEMENT") ? 1.5 : 0.6;
      }
    } else if (targetCause === "METHOD_MISMATCH" && h.cause === "CONCEPTUAL_GAP" && action === "COMPLETED") {
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
  }

  await supabaseAdmin
    .from("hypothesis_cycles")
    .update(updatePayload)
    .eq("id", cycle.id);

  return { processed: true, resolved: isResolved, finalDiagnosis: topHypothesis.cause };
}

