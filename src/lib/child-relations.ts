export type RelationStatus = "pending" | "accepted" | "mentor_verified" | "rejected";

export interface AuthorizedRelation {
  id: string;
  requester_child_id: string;
  addressee_child_id: string;
  status: RelationStatus;
  parent_consent_given: boolean;
  created_at: string;
}

export function isValidHandleFormat(handle: string): boolean {
  // Règle: 3 à 20 caractères, minuscules, chiffres, underscores uniquement.
  // Doit commencer par une lettre.
  const handleRegex = /^[a-z][a-z0-9_]{2,19}$/;
  return handleRegex.test(handle);
}

export function generateSuggestedHandle(
  firstName: string,
  lastName: string = "",
  suffixLength: number = 4,
): string {
  const base = `${firstName}${lastName ? "_" + lastName : ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9_]/g, ""); // Ne garder que l'autorisé

  const safeBase = base.substring(0, 20 - suffixLength - 1);
  const randomSuffix = Math.random()
    .toString(36)
    .substring(2, 2 + suffixLength);

  const handle = `${safeBase}_${randomSuffix}`;

  if (!isValidHandleFormat(handle)) {
    // Fallback de sécurité si le prénom contenait que des caractères spéciaux
    return `user_${Math.random().toString(36).substring(2, 8)}`;
  }

  return handle;
}

export function formatHandle(handle: string): string {
  if (!handle) return "";
  const cleaned = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return cleaned.startsWith("@") ? cleaned : `@${cleaned}`;
}

export function getCleanHandle(handleInput: string): string {
  return handleInput.replace(/^@/, "").toLowerCase().trim();
}

/**
 * State machine transition validation for relations.
 */
export function canTransitionRelation(
  currentStatus: RelationStatus | null,
  nextStatus: RelationStatus,
  isParent: boolean,
): boolean {
  if (!currentStatus) {
    // Création d'une nouvelle demande
    return nextStatus === "pending";
  }

  switch (currentStatus) {
    case "pending":
      // Un parent peut accepter ou refuser
      return nextStatus === "accepted" || nextStatus === "rejected";
    case "accepted":
      // Un mentor peut certifier une relation existante, ou un parent peut la révoquer (rejected)
      if (nextStatus === "mentor_verified") return true;
      if (nextStatus === "rejected" && isParent) return true;
      return false;
    case "mentor_verified":
      // Peut être révoqué
      return nextStatus === "rejected" && isParent;
    case "rejected":
      // On peut relancer une demande (re-pending)
      return nextStatus === "pending";
    default:
      return false;
  }
}
