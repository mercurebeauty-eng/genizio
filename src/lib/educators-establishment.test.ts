import { describe, it, expect } from "vitest";

// Fonction pure testable pour le regroupement d'établissement
export function formatEstablishmentOverview(
  rawOrg: string | null | undefined,
  rows: Array<{
    id: string;
    full_name: string;
    handle: string | null;
    class_code: string | null;
    professional_role: string;
    is_verified?: boolean;
    whatsapp_phone?: string | null;
    created_at: string;
  }>,
) {
  const trimmed = rawOrg?.trim();
  if (!trimmed) {
    return {
      hasEstablishment: false,
      organizationName: null,
      totalColleagues: 0,
      totalClasses: 0,
      colleagues: [],
    };
  }

  const uniqueClasses = new Set<string>();
  const colleagues = rows.map((r) => {
    if (r.class_code) uniqueClasses.add(r.class_code.toUpperCase().trim());
    return {
      id: r.id,
      fullName: r.full_name,
      handle: r.handle ? (r.handle.startsWith("@") ? r.handle : `@${r.handle}`) : null,
      classCode: r.class_code
        ? r.class_code.startsWith("#")
          ? r.class_code
          : `#${r.class_code}`
        : null,
      professionalRole: r.professional_role,
      isVerified: Boolean(r.is_verified),
      whatsappPhone: r.whatsapp_phone || null,
      createdAt: r.created_at,
    };
  });

  return {
    hasEstablishment: true,
    organizationName: trimmed,
    totalColleagues: colleagues.length,
    totalClasses: uniqueClasses.size,
    colleagues,
  };
}

describe("Vue Établissement Scolaire & Équipe Pédagogique", () => {
  it("retourne un état vide si l'utilisateur n'a pas configuré d'établissement", () => {
    const res = formatEstablishmentOverview(null, []);
    expect(res.hasEstablishment).toBe(false);
    expect(res.totalColleagues).toBe(0);
    expect(res.totalClasses).toBe(0);
    expect(res.colleagues).toHaveLength(0);
  });

  it("regroupe correctement les collègues et calcule les codes classe uniques", () => {
    const mockRows = [
      {
        id: "1",
        full_name: "Professeur Tournesol",
        handle: "tournesol",
        class_code: "6A",
        professional_role: "teacher",
        is_verified: true,
        whatsapp_phone: "+22670000001",
        created_at: "2026-09-01T08:00:00Z",
      },
      {
        id: "2",
        full_name: "Mme Castafiore",
        handle: "@castafiore",
        class_code: "6A",
        professional_role: "teacher",
        is_verified: false,
        whatsapp_phone: null,
        created_at: "2026-09-02T08:00:00Z",
      },
      {
        id: "3",
        full_name: "Dr Haddock",
        handle: "haddock",
        class_code: "5B",
        professional_role: "counselor",
        is_verified: true,
        whatsapp_phone: "+22670000002",
        created_at: "2026-09-03T08:00:00Z",
      },
    ];

    const res = formatEstablishmentOverview("  Collège Saint-Viateur  ", mockRows);

    expect(res.hasEstablishment).toBe(true);
    expect(res.organizationName).toBe("Collège Saint-Viateur");
    expect(res.totalColleagues).toBe(3);
    expect(res.totalClasses).toBe(2);

    expect(res.colleagues[0].handle).toBe("@tournesol");
    expect(res.colleagues[0].classCode).toBe("#6A");
    expect(res.colleagues[1].handle).toBe("@castafiore");
    expect(res.colleagues[2].classCode).toBe("#5B");
  });
});
