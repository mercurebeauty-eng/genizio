export type SupervisionPermission = "observe" | "assign_role" | "validate_participation";
export type SupervisionStatus = "pending" | "active" | "expired" | "revoked";

export interface SupervisionRelation {
  id: string;
  supervisorId: string;
  childId: string;
  organizationId?: string | null;
  contextName: string; // ex: "Fab Lab Abidjan", "Marathon Robotique #04"
  status: SupervisionStatus;
  permissions: SupervisionPermission[];
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

/**
 * Vérifie si la relation de supervision est actuellement valide et active.
 */
export function isSupervisionValid(relation: SupervisionRelation, atDate: Date = new Date()): boolean {
  if (relation.status !== "active") return false;

  const now = atDate.getTime();
  const from = new Date(relation.validFrom).getTime();
  const until = new Date(relation.validUntil).getTime();

  return now >= from && now <= until;
}

/**
 * Vérifie si le superviseur a une permission spécifique pour cette relation.
 */
export function hasSupervisionPermission(
  relation: SupervisionRelation,
  permission: SupervisionPermission,
  atDate: Date = new Date()
): boolean {
  if (!isSupervisionValid(relation, atDate)) return false;
  return relation.permissions.includes(permission);
}

/**
 * Met à jour le statut d'une relation (ex: auto-expiration).
 */
export function refreshSupervisionStatus(relation: SupervisionRelation, atDate: Date = new Date()): SupervisionRelation {
  if (relation.status === "active" && !isSupervisionValid(relation, atDate)) {
    return { ...relation, status: "expired" };
  }
  return relation;
}

/**
 * Fabrique de création d'une demande de supervision.
 */
export function requestSupervision(
  supervisorId: string,
  childId: string,
  contextName: string,
  validDays: number = 7,
  permissions: SupervisionPermission[] = ["observe", "assign_role"],
  organizationId?: string
): SupervisionRelation {
  const from = new Date();
  const until = new Date(from.getTime() + validDays * 24 * 60 * 60 * 1000);
  
  return {
    id: `sup_${Math.random().toString(36).substr(2, 9)}`,
    supervisorId,
    childId,
    organizationId: organizationId ?? null,
    contextName,
    status: "pending",
    permissions,
    validFrom: from.toISOString(),
    validUntil: until.toISOString(),
    createdAt: from.toISOString()
  };
}

/**
 * Le parent ou l'organisation accepte la demande.
 */
export function acceptSupervision(relation: SupervisionRelation): SupervisionRelation {
  if (relation.status !== "pending") {
    throw new Error("Seule une demande 'pending' peut être acceptée.");
  }
  return { ...relation, status: "active" };
}

/**
 * Le parent ou l'organisation révoque prématurément l'accès.
 */
export function revokeSupervision(relation: SupervisionRelation): SupervisionRelation {
  return { ...relation, status: "revoked" };
}
