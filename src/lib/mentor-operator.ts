// Mentor Copilote (décision #74, 2026-08-15) — autorisation « opérateur ».
//
// Un mentor peut opérer (start/progress/notes/abandon/preuve/génération) les défis
// d'un enfant si TOUTES les conditions tiennent :
//   1. assignation ACTIVE (mentors, removed_at IS NULL) sur cet enfant ;
//   2. statut de compte non suspendu/banni (mentor_profiles.status) ;
//   3. l'enfant est ACCOMPAGNÉ (pack ou campagne — resolveChildAccompaniment).
//
// Le parent, lui, reste l'opérateur par défaut sur les enfants non accompagnés (voie
// existante challenges.functions.ts). Jamais de suppression ni de publication pour le
// mentor, quel que soit ce prédicat.
//
// canOperateMentor est PURE (testable) ; assertMentorOperator fait les lectures
// via le db passé (toujours supabaseAdmin — les tables mentor sont service-role).

import { resolveChildAccompaniment } from "@/lib/child-accompaniment";

export type MentorOperatorStatus = "active" | "warning" | "suspended" | "banned";

export function canOperateMentor(params: {
  hasActiveAssignment: boolean;
  /** Statut du compte mentor ; absent = 'active' (profil jamais créé). */
  status: MentorOperatorStatus | null | undefined;
  accompaniment: "pack" | "campaign" | "none";
  /** Bornes temporelles pour supervision éphémère (Fab Lab / Atelier / Stage). */
  validFrom?: string | null;
  validUntil?: string | null;
  now?: Date;
}): boolean {
  if (!params.hasActiveAssignment) return false;
  const status = params.status ?? "active";
  if (status === "suspended" || status === "banned") return false;
  if (params.accompaniment === "none") return false;

  const current = params.now ?? new Date();
  if (params.validFrom && new Date(params.validFrom) > current) {
    return false; // Événement pas encore commencé
  }
  if (params.validUntil && new Date(params.validUntil) < current) {
    return false; // Session de supervision terminée
  }

  return true;
}

export const MENTOR_OPERATOR_DENIED_MESSAGE =
  "Les actions opérateur ne sont disponibles que pour les enfants accompagnés (pack ou programme partenaire).";

/**
 * Condition de paiement (décision #74, sous-décision 5) : la DERNIÈRE séance du mois d'un
 * enfant accompagné n'est payable que si le bilan de fin de la période est rendu ET validé
 * par le parent (« bilan inclus » = livrable obligatoire du pack, pas une promesse).
 * Conservateur : n'agit que si la séance est financée (pack/campagne) et que le budget
 * mensuel est positif — le flux legacy (funding 'none') n'est jamais bloqué.
 * Pure et testée — les server functions chargent les compteurs puis appellent ce prédicat.
 */
export function isLastPayableSession(params: {
  /** Budget mensuel de séances de la période (PACK_SESSIONS = 12 pour le pack). */
  monthlyBudget: number;
  /** Séances déjà approuvées ou payées ce mois (HORS celle en cours d'approbation). */
  alreadyApprovedOrPaidInMonth: number;
  funded: "pack" | "campaign" | "none";
  /** Un bilan VALIDÉ couvre-t-il la période courante ? */
  hasValidatedReportForPeriod: boolean;
}): boolean {
  if (params.funded === "none") return false;
  if (params.monthlyBudget <= 0) return false;
  const completingBudget = params.alreadyApprovedOrPaidInMonth + 1 >= params.monthlyBudget;
  return completingBudget && !params.hasValidatedReportForPeriod;
}

/**
 * Vérifie que userId peut opérer les défis de childId. Lève une erreur explicite sinon.
 * Doit être appelé AVANT toute écriture (les fns mentor écrivent via supabaseAdmin,
 * qui by-passe la RLS — cette vérification EST la sécurité).
 */
export async function assertMentorOperator(
  db: { from: (table: string) => any },
  userId: string,
  childId: string,
): Promise<void> {
  const { data: profile } = await db
    .from("mentor_profiles")
    .select("status")
    .eq("mentor_user_id", userId)
    .maybeSingle();
  const status = (profile?.status as MentorOperatorStatus | undefined) ?? "active";
  if (status === "suspended" || status === "banned") {
    throw new Error(
      status === "banned"
        ? "Votre compte mentor est banni — contactez l'équipe Génizio."
        : "Votre compte mentor est suspendu — contactez l'équipe Génizio.",
    );
  }

  const { data: assignment } = await db
    .from("mentors")
    .select("id, valid_from, valid_until, context_name")
    .eq("mentor_user_id", userId)
    .eq("child_profile_id", childId)
    .is("removed_at", null)
    .maybeSingle();
  if (!assignment) {
    throw new Error("Cet enfant n'est pas (plus) assigné à votre suivi.");
  }

  const now = new Date();
  if (assignment.valid_until && new Date(assignment.valid_until) < now) {
    throw new Error(
      `La période de supervision pour cet événement (${assignment.context_name || "FabLab / Atelier"}) est terminée. Les données restent accessibles en lecture seule.`,
    );
  }
  if (assignment.valid_from && new Date(assignment.valid_from) > now) {
    throw new Error(
      `La période de supervision pour cet événement (${assignment.context_name || "FabLab / Atelier"}) n'a pas encore débuté.`,
    );
  }

  const accompaniment = await resolveChildAccompaniment(db, childId);
  if (accompaniment.funding === "none") {
    throw new Error(MENTOR_OPERATOR_DENIED_MESSAGE);
  }
}
