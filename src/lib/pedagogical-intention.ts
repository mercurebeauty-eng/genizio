// `pedagogical_context` sert deux usages depuis les défis discriminants (décision #34,
// hypotheses.functions.ts) et les recommandations ESSAIMAGE/STABILISATION
// (recommendations.functions.ts) : un JSON interne pour le moteur bayésien, au lieu du
// texte pédagogique lisible que les défis "normaux" y stockent. L'UI affichait ce JSON
// brut au parent ("Intention Pédagogique" : {"cycle_id":"...","target_cause":"..."}).
// Cette fonction traduit ce JSON en phrase lisible ; le texte humain existant continue
// de passer tel quel.
//
// Chantier 3 (modalités, §22-26) : les reformulations portent aussi un JSON interne
// { is_reformulation, presentation_mode, ... } — traduit ici en phrase qualitative
// pour le parent (jamais de chiffres, jamais de mention de l'échec précédent).

import { PRESENTATION_MODE_LABELS, type PresentationMode } from "@/lib/modalities.functions";

const DISCRIMINANT_CAUSE_LABELS: Record<string, string> = {
  METHOD_MISMATCH:
    "Naya teste si le blocage vient de la manière d'enseigner plutôt que d'un manque de capacité — ce défi contourne volontairement l'approche scolaire habituelle.",
  PERFORMANCE_ANXIETY:
    "Naya vérifie si la pression de l'évaluation freine l'enfant — ce défi est pensé sans chrono ni jugement, juste pour le plaisir d'essayer.",
  LACK_OF_ENGAGEMENT:
    "Naya s'appuie sur les centres d'intérêt de l'enfant pour raviver sa curiosité sur ce sujet précis.",
  CONCEPTUAL_GAP: "Naya vérifie les bases de manière simple et amusante avant d'aller plus loin.",
  READY_FOR_MORE:
    "Naya teste si l'enfant est prêt·e pour un niveau au-dessus — une mission bonus, pas un piège.",
};

const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  ESSAIMAGE:
    "Naya s'appuie sur une force de l'enfant pour l'aider en douceur sur une compétence en progression.",
  STABILISATION:
    'Défi "doudou" pensé par Naya pour un succès quasi garanti — renforcer la confiance avant d\'aller plus loin.',
};

/**
 * Renvoie un texte affichable au parent pour `pedagogical_context`, qu'il s'agisse de
 * texte humain (renvoyé tel quel) ou du JSON interne discriminant/recommandation
 * (traduit). Renvoie null si rien d'affichable n'en ressort (jamais de JSON brut).
 */
export function formatPedagogicalIntention(rawContext: string | null | undefined): string | null {
  if (!rawContext) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(rawContext);
  } catch {
    return rawContext;
  }

  if (parsed?.is_discriminant && typeof parsed.target_cause === "string") {
    return DISCRIMINANT_CAUSE_LABELS[parsed.target_cause] ?? null;
  }

  if (parsed?.is_recommendation && typeof parsed.type === "string") {
    return RECOMMENDATION_TYPE_LABELS[parsed.type] ?? null;
  }

  // Étape 4 — défi de retest de soutien renforcé (brainstorm produit, 2026-08-02) : un défi
  // volontairement standard, présenté comme n'importe quel autre — l'intention réelle reste
  // interne à Naya, jamais montrée comme un "test" à l'enfant/au parent.
  if (parsed?.is_support_retest) {
    return "Naya vérifie discrètement si un accompagnement renforcé récent est encore nécessaire ici.";
  }

  // Chantier 3 — reformulation de modalité (§22-26) : la même compétence, présentée
  // autrement. L'enfant, lui, ne voit qu'un défi frais (le prompt l'exige) ; le parent
  // voit que Naya a changé de manière d'enseigner — jamais de mention de l'échec,
  // jamais de chiffres ni de verdict.
  if (parsed?.is_reformulation && typeof parsed.presentation_mode === "string") {
    const label = PRESENTATION_MODE_LABELS[parsed.presentation_mode as PresentationMode];
    return label
      ? `Naya présente cette compétence autrement — par ${label} cette fois — pour trouver la manière qui lui parle.`
      : "Naya présente cette compétence autrement, avec une nouvelle manière d'enseigner.";
  }

  return null;
}
