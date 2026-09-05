import { describe, it, expect } from "vitest";

// Logique pure de qualification des alertes et priorité d'intervention
export function computeSafetyAlertPriority(report: {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
}): { requiresImmediateKillSwitch: boolean; priorityLevel: number } {
  if (report.severity === "critical" || report.category === "harassment") {
    return { requiresImmediateKillSwitch: true, priorityLevel: 1 };
  }
  if (report.severity === "high" || report.category === "verbal_abuse") {
    return { requiresImmediateKillSwitch: false, priorityLevel: 2 };
  }
  return { requiresImmediateKillSwitch: false, priorityLevel: 3 };
}

export function shouldTriggerQuarterlyAudit(lastAuditAt: string | null | undefined): boolean {
  if (!lastAuditAt) return true;
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(lastAuditAt).getTime() >= ninetyDaysMs;
}

describe("Bouclier de Protection & Safeguarding (Règles métier)", () => {
  it("les signalements de harcèlement ou de sévérité critique déclenchent la priorité absolue", () => {
    const alert = computeSafetyAlertPriority({ category: "harassment", severity: "high" });
    expect(alert.requiresImmediateKillSwitch).toBe(true);
    expect(alert.priorityLevel).toBe(1);

    const alert2 = computeSafetyAlertPriority({
      category: "unauthorized_contact",
      severity: "critical",
    });
    expect(alert2.requiresImmediateKillSwitch).toBe(true);
    expect(alert2.priorityLevel).toBe(1);
  });

  it("les signalements de sévérité modérée ne déclenchent pas le kill-switch automatique", () => {
    const alert = computeSafetyAlertPriority({
      category: "unpunctuality_fraud",
      severity: "medium",
    });
    expect(alert.requiresImmediateKillSwitch).toBe(false);
    expect(alert.priorityLevel).toBe(3);
  });

  it("un enfant sans audit depuis plus de 90 jours doit être audité", () => {
    expect(shouldTriggerQuarterlyAudit(null)).toBe(true);
    expect(shouldTriggerQuarterlyAudit(undefined)).toBe(true);

    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(shouldTriggerQuarterlyAudit(hundredDaysAgo)).toBe(true);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(shouldTriggerQuarterlyAudit(thirtyDaysAgo)).toBe(false);
  });
});
