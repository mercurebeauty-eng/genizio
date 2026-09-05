// `pedagogical_context` porte la prose pédagogique lisible que les défis "normaux"
// y stockent ; les intentions machine (discriminant, recommandation, retest de
// soutien, reformulation) sont des COLONNES TYPUÉES de `challenges`
// (challenge_role, target_cause, recommendation_type, reformulation_of +
// presentation_mode). Historiquement ce tout était un JSON sérialisé à la main
// dans la même colonne TEXT et l'UI affichait ce JSON brut au parent — cette
// fonction traduit chaque intention en phrase lisible ; le texte humain passe
// tel quel.
//
// Chantier 3 (modalités, §22-26) : les reformulations sont traduites en phrase
// qualitative pour le parent (jamais de chiffres, jamais de mention de l'échec
// précédent).

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

/** Champs de l'intention pédagogique : les flags machine (colonnes typées) et la
 *  prose humaine (pedagogical_context). Un défi complet ou une projection de ces
 *  champs conviennent. */
export interface PedagogicalIntentionSource {
  pedagogical_context?: string | null;
  challenge_role?: string | null;
  target_cause?: string | null;
  recommendation_type?: string | null;
  reformulation_of?: string | null;
  presentation_mode?: string | null;
}

/**
 * Renvoie un texte affichable au parent pour l'intention pédagogique d'un défi :
 * texte humain (renvoyé tel quel) ou intention machine (colonnes typées, traduite).
 * Renvoie null si rien d'affichable n'en ressort — jamais de JSON brut.
 */
export function formatPedagogicalIntention(
  challenge: PedagogicalIntentionSource | null | undefined,
): string | null {
  if (!challenge) return null;

  if (challenge.challenge_role === "discriminant" && typeof challenge.target_cause === "string") {
    return DISCRIMINANT_CAUSE_LABELS[challenge.target_cause] ?? null;
  }

  if (typeof challenge.recommendation_type === "string") {
    return RECOMMENDATION_TYPE_LABELS[challenge.recommendation_type] ?? null;
  }

  // Étape 4 — défi de retest de soutien renforcé (brainstorm produit, 2026-08-02) : un défi
  // volontairement standard, présenté comme n'importe quel autre — l'intention réelle reste
  // interne à Naya, jamais montrée comme un "test" à l'enfant/au parent.
  if (challenge.challenge_role === "support_retest") {
    return "Naya vérifie discrètement si un accompagnement renforcé récent est encore nécessaire ici.";
  }

  // Chantier 3 — reformulation de modalité (§22-26) : la même compétence, présentée
  // autrement. L'enfant, lui, ne voit qu'un défi frais (le prompt l'exige) ; le parent
  // voit que Naya a changé de manière d'enseigner — jamais de mention de l'échec,
  // jamais de chiffres ni de verdict.
  if (challenge.reformulation_of && typeof challenge.presentation_mode === "string") {
    const label = PRESENTATION_MODE_LABELS[challenge.presentation_mode as PresentationMode];
    return label
      ? `Naya présente cette compétence autrement — par ${label} cette fois — pour trouver la manière qui lui parle.`
      : "Naya présente cette compétence autrement, avec une nouvelle manière d'enseigner.";
  }

  const rawContext = challenge.pedagogical_context;
  if (!rawContext) return null;
  // Résidu JSON d'avant la migration (forme non reconnue) : masqué, jamais affiché.
  if (rawContext.trimStart().startsWith("{")) return null;
  return rawContext;
}
