// Acteur enfant (décision #81) — « le mentor est le remplaçant du parent ».
//
// Qui peut AGIR sur un enfant (générer des défis, démarrer, progression, notes,
// non réussi, synthèse Naya, recommandations…) :
//   1. le parent propriétaire (child_profiles.user_id) ;
//   2. le mentor assigné ACTIF (mentors, removed_at IS NULL) et non banni/suspendu.
//
// Ce n'est PAS l'autorisation « opérateur » de /mentor (assertMentorOperator,
// décision #74, réservée aux enfants accompagnés et sans exigence d'accompagnement
// ici : le mentor agit sur TOUS ses enfants assignés). Les actes destructeurs
// (suppression de défi/profil) et les paiements/achats restent OWNER uniquement —
// les fns concernées ne passent jamais par ce helper.
//
// canActAsChildActor est PURE (testable) ; resolveChildActor fait les lectures via
// le db passé (supabaseAdmin en pratique — les tables mentor sont service-role).

export type ChildActorRole = "owner" | "mentor";
export type MentorAccountStatus = "active" | "warning" | "suspended" | "banned";

export function canActAsChildActor(params: {
  isOwner: boolean;
  hasActiveAssignment: boolean;
  mentorStatus: MentorAccountStatus | null | undefined;
}): ChildActorRole | null {
  if (params.isOwner) return "owner";
  if (!params.hasActiveAssignment) return null;
  const status = params.mentorStatus ?? "active";
  if (status === "suspended" || status === "banned") return null;
  return "mentor";
}

export const CHILD_ACTOR_DENIED_MESSAGE =
  "Cet enfant ne vous appartient pas et ne vous est pas assigné.";

export async function resolveChildActor(
  db: { from: (table: string) => any },
  userId: string,
  childId: string,
): Promise<ChildActorRole | null> {
  const { data: child } = await db
    .from("child_profiles")
    .select("user_id")
    .eq("id", childId)
    .maybeSingle();
  if (child?.user_id === userId) return "owner";

  const { data: assignment } = await db
    .from("mentors")
    .select("id")
    .eq("child_profile_id", childId)
    .eq("mentor_user_id", userId)
    .is("removed_at", null)
    .maybeSingle();
  if (!assignment) return null;

  const { data: profile } = await db
    .from("mentor_profiles")
    .select("status")
    .eq("mentor_user_id", userId)
    .maybeSingle();

  return canActAsChildActor({
    isOwner: false,
    hasActiveAssignment: true,
    mentorStatus: (profile?.status as MentorAccountStatus | undefined) ?? "active",
  });
}

/** Lève une erreur explicite si userId ne peut pas agir sur childId. */
export async function assertChildActor(
  db: { from: (table: string) => any },
  userId: string,
  childId: string,
): Promise<ChildActorRole> {
  const role = await resolveChildActor(db, userId, childId);
  if (!role) throw new Error(CHILD_ACTOR_DENIED_MESSAGE);
  return role;
}
