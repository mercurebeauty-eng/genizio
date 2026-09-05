// Missions de substitution (décision 2026-09-05) : un matériau de défi s'est révélé
// introuvable — l'absence devient le défi. L'enfant cherche des remplaçants, les
// teste, en compare un critère mesurable : la démarche expérimentale complète
// déguisée en débrouillardise. Même architecture que la boucle de reformulation
// (modalities.functions) : génération IA + filets déterministes + insertion via
// finalizeChallenge, rôle machine dans les colonnes typées (challenge_role =
// 'substitution').
//
// Vérification back-office (V2, « l'enfant capteur de terrain » — prémices V4) :
// quand une mission de substitution elle-même n'aboutit pas, Naya vérifie en SHADOW
// (échantillonnée, non bloquante, jamais montrée à l'enfant — même discipline que
// Le Loup) si des substituts réalistes existaient. Deux verdicts, tous deux
// nourriciers : substituts_probables → signal d'investigation vers le Jumeau (la
// recherche n'a pas eu lieu ou a buté sur autre chose) ; rare_confirme → le modèle
// de disponibilité de Naya était faux pour ce terrain (correction du registre en
// backlog V4). Aucun des deux n'est un verdict sur l'enfant.

import { callClaude, safeJsonParse, finalizeChallenge, formatChildInterestsPayload } from "@/lib/challenges.functions";
import { buildSubstitutionPrompt } from "@/lib/naya-prompts";
import { verifyAndLog } from "@/lib/naya-verifier.functions";
import { formatTimePressureNote } from "@/lib/time-limit";
import { normalizeCountryKey } from "@/lib/contextualization";
import { loadLocalMaterialsForCountry } from "@/lib/country-materials";

export interface SubstitutionOutcome {
  ok: boolean;
  reason?: "NOT_FOUND" | "NO_CHILD" | "WRONG_STATUS" | "GENERATION_FAILED" | "INSERT_FAILED";
  challenge?: any;
}

/**
 * Génère la mission de substitution pour un défi marqué non réussi avec le chip
 * « materiel_introuvable ». Crée l'événement de gap matériel (prémices V4 : la
 * donnée terrain qui corrigera un jour le registre country_materials) et le relie
 * à la mission générée. L'appelant a déjà vérifié l'acteur (assertChildActor) —
 * cette fonction relit via service role sans re-filtrer par user_id, comme la
 * chaîne post-échec de submitChallengeNotCompleted.
 */
export async function processSubstitutionChallenge(
  sup: any,
  challengeId: string,
  missingMaterial: string | null,
): Promise<SubstitutionOutcome> {
  // 1. Défi d'origine + enfant (le statut not_completed vient d'être posé par
  //    submitChallengeNotCompleted ; on re-vérifie pour tout appel direct).
  const { data: challenge } = await sup
    .from("challenges")
    .select("*, child_profiles(*)")
    .eq("id", challengeId)
    .maybeSingle();
  if (!challenge) return { ok: false, reason: "NOT_FOUND" };
  const child = challenge.child_profiles as any;
  if (!child) return { ok: false, reason: "NO_CHILD" };
  if (challenge.status !== "not_completed") return { ok: false, reason: "WRONG_STATUS" };

  // 2. Événement de gap matériel (prémices V4 — l'enfant capteur de terrain).
  const countryKey = normalizeCountryKey(child.country || "") || "inconnu";
  const originalMaterials = [
    ...new Set(
      [ ...(challenge.material_tags ?? []), ...(challenge.materials ?? []) ]
        .filter((m: unknown): m is string => typeof m === "string" && m.trim().length > 0)
        .map((m: string) => m.trim()),
    ),
  ];
  const gapMaterial =
    missingMaterial?.trim() ||
    (challenge.material_tags as string[] | null)?.[0] ||
    (challenge.materials as string[] | null)?.[0] ||
    "non précisé";

  const { data: gapEvent, error: gapErr } = await sup
    .from("material_gap_events")
    .insert({
      child_id: challenge.child_id,
      challenge_id: challenge.id,
      country_key: countryKey,
      material: gapMaterial,
      status: "signaled",
    })
    .select("id")
    .single();
  if (gapErr) {
    console.error("Non-fatal: material_gap_events insert failed", gapErr);
    // La mission part quand même : la donnée terrain ne doit jamais bloquer la
    // pédagogie (le gap est un capteur, pas une dépendance).
  }

  // 3. Génération IA — la chasse au substitut EST le défi.
  const location = [child.city, child.country].filter(Boolean).join(", ") || "non précisé";
  const prompt = buildSubstitutionPrompt({
    childName: child.name,
    childAge: child.age,
    location,
    originalTitle: challenge.title,
    originalDomain: challenge.domain,
    originalObjective: challenge.description,
    originalMaterials,
    missingMaterial: missingMaterial?.trim() || null,
    interestsPayload: formatChildInterestsPayload(child.interests),
    talentsJson: JSON.stringify(child.talents ?? {}),
    timePressureNote: formatTimePressureNote(child.time_pressure ?? "standard"),
    existingTitles: [challenge.title],
  });

  let parsed: any;
  try {
    const rawJson = await callClaude(prompt, true, undefined, 2500, 2);
    parsed = safeJsonParse(rawJson);
  } catch {
    // Non fatal : l'échec de génération ne fait jamais échouer la soumission
    // d'origine (l'appelant retombe sur la chaîne classique).
    return { ok: false, reason: "GENERATION_FAILED" };
  }

  // Le Loup : audit shadow de la mission de substitution — matériau de conquête,
  // jamais de mention de l'échec précédent, chasse au substitut présente.
  void verifyAndLog({
    kind: "substitution",
    output: parsed,
    context: {
      childAge: child.age,
      childName: child.name,
      domain: challenge.domain,
      originalTitle: challenge.title,
      missingMaterial: gapMaterial,
    },
    sourceFunction: "processSubstitutionChallenge",
    childId: child.id,
    model: "deepseek-v4-flash",
  });

  // 4. Filets déterministes (même point de passage que tous les générateurs).
  const safeTitle = (parsed.title || `Mission d'ingénieur : ${challenge.domain}`) as string;
  const safeDescription = (parsed.description || "") as string;
  const safeSteps = (parsed.steps || []) as string[];
  const safeMaterials = (parsed.materials || []) as string[];

  const finalized = finalizeChallenge(
    {
      title: safeTitle,
      description: safeDescription,
      steps: safeSteps,
      materials: safeMaterials,
      material_tags: parsed.material_tags,
      intelligences: parsed.intelligences,
      trait_subform: parsed.trait_subform,
      requires_supervision: parsed.requires_supervision,
      supervision_warning: parsed.supervision_warning,
      difficulty: parsed.difficulty,
      proof_mode: parsed.proof_mode,
      proof_target: parsed.proof_target,
      declarative_award: parsed.declarative_award,
      academic_domain: parsed.academic_domain,
      academic_level_age: parsed.academic_level_age,
      academic_reference_note: parsed.academic_reference_note,
      academic_secret: parsed.academic_secret,
      kind: parsed.kind,
      guidance_level: parsed.guidance_level,
    },
    child.age,
  );

  const { data: created, error: insertErr } = await sup
    .from("challenges")
    .insert({
      child_id: child.id,
      user_id: challenge.user_id,
      domain: parsed.domain || challenge.domain,
      description: safeDescription,
      duration: parsed.duration || "30 min",
      steps: safeSteps,
      materials: safeMaterials,
      status: "todo",
      progress: 0,
      academic_secret: parsed.academic_secret ?? null,
      // Rôle machine typé (ex-JSON dans pedagogical_context) : l'affichage parent
      // passe par formatPedagogicalIntention.
      challenge_role: "substitution",
      time_limit_minutes: null,
      ...finalized,
      // kind forcé micro (chasse courte, succès rapide) et guidage relevé
      // (pas-à-pas : la méthode expérimentale doit être explicite) — APRÈS le
      // spread pour ne pas être écrasés par les valeurs résolues.
      kind: "micro",
      guidance_level: Math.max(finalized.guidance_level, 4),
    })
    .select("*")
    .single();
  if (insertErr) return { ok: false, reason: "INSERT_FAILED" };

  if (gapEvent?.id) {
    await sup
      .from("material_gap_events")
      .update({ substitution_challenge_id: created.id })
      .eq("id", gapEvent.id);
  }

  return { ok: true, challenge: created };
}

// ── Vérification back-office (V2, shadow) ───────────────────────────────────────

const verifyEnabled = () => (process.env.NAYA_SUBSTITUTION_VERIFY_ENABLED ?? "true") !== "false";
const verifyRate = () => {
  const raw = Number(process.env.NAYA_SUBSTITUTION_VERIFY_RATE ?? "1");
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
};

/**
 * Vérification SHADOW d'un gap « nothing_found » : des substituts réalistes
 * existaient-ils pour ce matériau dans ce pays ? Échantillonnée, non bloquante,
 * strictement interne (le verdict n'est JAMAIS montré à l'enfant ou au parent).
 * substituts_probables → signal d'investigation (Jumeau) ; rare_confirme → le
 * modèle de disponibilité de Naya était faux pour ce terrain (backlog V4).
 */
export async function verifyMaterialGap(sup: any, substitutionChallengeId: string): Promise<void> {
  if (!verifyEnabled() || Math.random() >= verifyRate()) return;

  try {
    const { data: gapEvent } = await sup
      .from("material_gap_events")
      .select("id, country_key, material, status, challenges!material_gap_events_challenge_id_fkey(domain, description)")
      .eq("substitution_challenge_id", substitutionChallengeId)
      .maybeSingle();
    if (!gapEvent || gapEvent.status !== "nothing_found") return;

    const originalChallenge = (gapEvent.challenges ?? {}) as {
      domain?: string | null;
      description?: string | null;
    };
    const baseline = await loadLocalMaterialsForCountry(sup, gapEvent.country_key);
    const prompt = `Pays concerné (matériaux couramment accessibles : ${baseline.join(", ")}). Un enfant cherchait le matériau « ${gapEvent.material} » pour un défi pédagogique de type « ${originalChallenge.domain ?? "exploration"} » — il devait remplir une fonction physique concrète (être rigide, étanche, souple, servir de levier, de contenant…).
Liste 2 à 4 substituts réalistes, GRATUITS et réellement accessibles dans ce pays (maison, quartier, nature, récupération) qui rempliraient une fonction similaire. Des objets du quotidien suffisent — pense simple et universel.
Si aucun substitut réaliste n'existe, réponds avec un tableau vide.
Réponds EXCLUSIVEMENT en JSON brut : {"substituts": ["...", "..."]}`;

    const rawJson = await callClaude(prompt, true, undefined, 800, 2);
    const parsed = safeJsonParse(rawJson);
    const substitutes = ((parsed?.substituts ?? []) as unknown[])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 4);
    const verdict = substitutes.length > 0 ? "substituts_probables" : "rare_confirme";

    await sup
      .from("material_gap_events")
      .update({ verdict, verified_substitutes: substitutes, verified_at: new Date().toISOString() })
      .eq("id", gapEvent.id);
  } catch (err) {
    // Non-fatal par conception : la vérification est un capteur, jamais une dépendance.
    console.error("Non-fatal: verifyMaterialGap failed", err);
  }
}
