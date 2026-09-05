import { describe, it, expect, vi } from "vitest";
import { loadLocalMaterialsForCountry } from "@/lib/country-materials";
import { GENERIC_LOCAL_MATERIALS, localMaterialsForCountry } from "@/lib/contextualization";

// La source de vérité des matériaux locaux est la table `country_materials`
// (éditable via l'Admin OS). Le loader ne doit JAMAIS faire échouer la génération :
// toute absence ou erreur retombe sur les constantes de repli.

function mockDb(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

describe("loadLocalMaterialsForCountry — table éditable + repli constantes", () => {
  it("lit les matériaux de la table pour le pays demandé (clé normalisée)", async () => {
    const db = mockDb({ data: { materials: ["chaux artisanale", "pédales récupérées"] }, error: null });
    const materials = await loadLocalMaterialsForCountry(db, "Côte d'Ivoire");
    expect(materials).toEqual(["chaux artisanale", "pédales récupérées"]);
    expect(db.from).toHaveBeenCalledWith("country_materials");
  });

  it("pays absent de la table → repli sur les constantes (pas de vide)", async () => {
    const db = mockDb({ data: null, error: null });
    expect(await loadLocalMaterialsForCountry(db, "Mauritanie")).toEqual(
      localMaterialsForCountry("Mauritanie"),
    );
  });

  it("erreur DB → repli constantes, jamais de levée", async () => {
    const db = mockDb({ data: null, error: { message: "connection refused" } });
    expect(await loadLocalMaterialsForCountry(db, "Sénégal")).toEqual(
      localMaterialsForCountry("Sénégal"),
    );
  });

  it("exception du client → repli constantes, jamais de levée", async () => {
    const db = {
      from: vi.fn().mockImplementation(() => {
        throw new Error("network down");
      }),
    } as any;
    expect(await loadLocalMaterialsForCountry(db, "Mali")).toEqual(
      localMaterialsForCountry("Mali"),
    );
  });

  it("pays non renseigné → repli générique immédiat (sans requête)", async () => {
    const db = mockDb({ data: null, error: null });
    expect(await loadLocalMaterialsForCountry(db, null)).toEqual(GENERIC_LOCAL_MATERIALS);
    expect(await loadLocalMaterialsForCountry(db, undefined)).toEqual(GENERIC_LOCAL_MATERIALS);
    expect(db.from).not.toHaveBeenCalled();
  });
});
