import { isGrandfatheredAccount, MAX_CHILDREN_PER_ACCOUNT } from "./child-profile-quota";
import type { MentorCategory } from "./mentor-safeguards";
import { MENTOR_CATEGORY_QUOTAS } from "./mentor-safeguards";

// Nombre d'enfants qu'un mentor peut suivre :
//  • Mentor Pro (Superviseur Clinique) : Quota strict ≤ 5 (historique "5 par 5").
//  • Mentor de Soutien (Clubs Périscolaires) : Quota élargi jusqu'à 16 enfants (2 escouades de 8).
export const GRANDFATHERED_MENTOR_FLOOR = 5;
export const NEW_MENTOR_FLOOR = 1;
export const SUPPORT_MENTOR_MAX_QUOTA = MENTOR_CATEGORY_QUOTAS.support.maxChildren; // 16

export function computeMentorQuota(params: {
  referenceCreatedAt: string | null | undefined;
  extraQuota: number | null | undefined;
  category?: MentorCategory;
}): number {
  if (params.category === "support") {
    const base = 8; // 1 escouade de base
    return Math.min(base + (params.extraQuota ?? 0), SUPPORT_MENTOR_MAX_QUOTA);
  }

  const base = isGrandfatheredAccount(params.referenceCreatedAt)
    ? GRANDFATHERED_MENTOR_FLOOR
    : NEW_MENTOR_FLOOR;
  return Math.min(base + (params.extraQuota ?? 0), MAX_CHILDREN_PER_ACCOUNT);
}

