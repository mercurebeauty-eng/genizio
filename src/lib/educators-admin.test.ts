import { describe, it, expect } from "vitest";

// Logique pure d'agrégation et de calcul des métriques éducateurs pour l'Admin OS
export function aggregateEducatorsMetrics(
  delegations: Array<{
    beneficiary_email: string;
    beneficiary_name?: string | null;
    organization_name?: string | null;
    status: string;
    valid_until: string;
  }>,
) {
  const map = new Map<string, { email: string; activeCount: number; totalCount: number; organization?: string }>();

  for (const d of delegations) {
    const email = d.beneficiary_email.toLowerCase();
    const isActive = d.status === "active" && new Date(d.valid_until).getTime() > Date.now();

    if (!map.has(email)) {
      map.set(email, {
        email,
        activeCount: isActive ? 1 : 0,
        totalCount: 1,
        organization: d.organization_name || undefined,
      });
    } else {
      const item = map.get(email)!;
      item.totalCount += 1;
      if (isActive) item.activeCount += 1;
      if (d.organization_name && !item.organization) item.organization = d.organization_name;
    }
  }

  const educators = Array.from(map.values());
  const totalSchools = new Set(educators.map((e) => e.organization).filter(Boolean)).size;
  const totalActiveStudents = educators.reduce((acc, curr) => acc + curr.activeCount, 0);

  return {
    educatorsCount: educators.length,
    totalSchools,
    totalActiveStudents,
    educators,
  };
}

describe("Admin OS — Métriques Éducateurs & Écoles (Sprint A)", () => {
  it("agrège correctement plusieurs délégations pour un même enseignant", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();

    const sampleDelegations = [
      {
        beneficiary_email: "kone@lycee.ci",
        beneficiary_name: "M. Koné",
        organization_name: "Lycée Classique",
        status: "active",
        valid_until: futureDate,
      },
      {
        beneficiary_email: "kone@lycee.ci",
        beneficiary_name: "M. Koné",
        organization_name: "Lycée Classique",
        status: "active",
        valid_until: pastDate, // Expiré
      },
      {
        beneficiary_email: "diallo@orientation.sn",
        beneficiary_name: "Mme Diallo",
        organization_name: "Cabinet Avenir",
        status: "active",
        valid_until: futureDate,
      },
    ];

    const result = aggregateEducatorsMetrics(sampleDelegations);
    expect(result.educatorsCount).toBe(2);
    expect(result.totalSchools).toBe(2);
    expect(result.totalActiveStudents).toBe(2); // 1 pour Koné, 1 pour Diallo

    const kone = result.educators.find((e) => e.email === "kone@lycee.ci");
    expect(kone?.totalCount).toBe(2);
    expect(kone?.activeCount).toBe(1);
  });
});
