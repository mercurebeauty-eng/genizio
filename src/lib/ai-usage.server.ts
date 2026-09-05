// Quotas journaliers persistants pour les features IA coûteuses (Copilote
// Professeur). L'état vit dans ai_feature_usage via la fonction SQL
// consume_ai_feature_quota — incrément ATOMIQUE avec contrôle de limite, pas un
// read-then-write rattrapable par deux requêtes concurrentes (double-clic sur
// « Générer »). Module serveur uniquement : service role, jamais côté client.

const DEFAULT_DAILY_LIMIT_VERIFIED = 8;
const DEFAULT_DAILY_LIMIT_UNVERIFIED = 2;

export type AiFeatureKey = "educator_copilot";

export interface AiQuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/** Limite journalière pour un utilisateur (env surchargeable, défauts produit). */
export function resolveAiDailyLimit(feature: AiFeatureKey, verified: boolean): number {
  const key =
    feature === "educator_copilot"
      ? verified
        ? "AI_COPILOT_DAILY_LIMIT_VERIFIED"
        : "AI_COPILOT_DAILY_LIMIT_UNVERIFIED"
      : null;
  if (key) {
    const raw = Number.parseInt(process.env[key] ?? "", 10);
    if (Number.isFinite(raw) && raw > 0) return raw;
  }
  return verified ? DEFAULT_DAILY_LIMIT_VERIFIED : DEFAULT_DAILY_LIMIT_UNVERIFIED;
}

/**
 * Consomme une unité de quota pour (user, feature) aujourd'hui (UTC) et dit si
 * l'appel est autorisé. L'incrément est effectué MÊME quand la limite est
 * dépassée (les tentatives comptent — sinon un utilisateur en rafale ne
 * sature jamais clairement) ; `allowed` reste la seule décision qui compte.
 * Panne de la table quota → on laisse passer (fail-open) : un incident
 * d'infrastructure ne doit pas couper une salle de classe.
 */
export async function consumeAiFeatureQuota(
  db: any,
  userId: string,
  feature: AiFeatureKey,
  limitPerDay: number,
): Promise<AiQuotaResult> {
  try {
    const { data, error } = await db.rpc("consume_ai_feature_quota", {
      p_user_id: userId,
      p_feature: feature,
      p_limit: limitPerDay,
    });
    if (error || !Array.isArray(data) || data.length === 0) {
      console.error("consume_ai_feature_quota rpc error:", error);
      return { allowed: true, remaining: -1, limit: limitPerDay }; // fail-open tracé
    }
    const row = data[0];
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      limit: limitPerDay,
    };
  } catch (err) {
    console.error("consumeAiFeatureQuota unexpected error:", err);
    return { allowed: true, remaining: -1, limit: limitPerDay }; // fail-open tracé
  }
}
