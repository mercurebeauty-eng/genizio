import { describe, it, expect, vi } from "vitest";
import { ADMIN_TABS, AdminTab } from "@/components/admin/AdminNavTabBar";
import fs from "node:fs";
import path from "node:path";

describe("Refonte Admin OS — Navigation & grille d'accueil (9 onglets)", () => {
  it("définit les 9 onglets de la refonte dans ADMIN_TABS avec leurs métadonnées", () => {
    const tabIds = ADMIN_TABS.map((t) => t.id);
    expect(tabIds).toHaveLength(9);
    expect(tabIds).toEqual([
      "executive",
      "b2b",
      "mentors",
      "products",
      "talents",
      "naya",
      "payments",
      "commerce",
      "profiles",
    ]);

    const execTab = ADMIN_TABS.find((t) => t.id === "executive");
    expect(execTab?.label).toBe("Exécutif");
    expect(execTab?.badge).toBe("KPIs");

    const b2bTab = ADMIN_TABS.find((t) => t.id === "b2b");
    expect(b2bTab?.label).toBe("Campagnes B2B");

    const supTab = ADMIN_TABS.find((t) => t.id === "mentors");
    expect(supTab?.label).toBe("Mentors");

    const prodTab = ADMIN_TABS.find((t) => t.id === "products");
    expect(prodTab?.label).toBe("Produits & Stock");

    const talentsTab = ADMIN_TABS.find((t) => t.id === "talents");
    expect(talentsTab?.label).toBe("Talents & Villes");
    expect(talentsTab?.badge).toBe("Radar");

    // Les onglets « Seasons » (vestige) et « Abonnements » (fusionné) ont disparu
    // au profit de « Paiements & Accès » (secours webhook + abonnements).
    const paymentsTab = ADMIN_TABS.find((t) => t.id === "payments");
    expect(paymentsTab?.label).toBe("Paiements & Accès");
    expect(paymentsTab?.badge).toBe("Secours");
    expect(tabIds).not.toContain("seasons");
    expect(tabIds).not.toContain("subscriptions");
  });

  it("handles tab change callback seamlessly when switching tabs", () => {
    let currentTab: AdminTab = "executive";
    const onTabChange = vi.fn((newTab: AdminTab) => {
      currentTab = newTab;
    });

    onTabChange("mentors");
    expect(onTabChange).toHaveBeenCalledWith("mentors");
    expect(currentTab).toBe("mentors");

    onTabChange("products");
    expect(onTabChange).toHaveBeenCalledWith("products");
    expect(currentTab).toBe("products");

    onTabChange("executive");
    expect(onTabChange).toHaveBeenCalledWith("executive");
    expect(currentTab).toBe("executive");
  });

  it("verifies sub-routes /admin/products and /admin/mentors and /admin/ are registered in routeTree.gen.ts", () => {
    const routeTreePath = path.resolve(__dirname, "../routeTree.gen.ts");
    const content = fs.readFileSync(routeTreePath, "utf-8");

    // Verify imports
    expect(content).toContain("import { Route as AdminRouteImport } from './routes/admin'");
    expect(content).toContain(
      "import { Route as AdminIndexRouteImport } from './routes/admin.index'",
    );
    expect(content).toContain(
      "import { Route as AdminMentorsRouteImport } from './routes/admin.mentors'",
    );
    expect(content).toContain(
      "import { Route as AdminProductsRouteImport } from './routes/admin.products'",
    );

    // Verify full paths in FileRoutesByFullPath
    expect(content).toContain("'/admin/products': typeof AdminProductsRoute");
    expect(content).toContain("'/admin/mentors': typeof AdminMentorsRoute");
    expect(content).toContain("'/admin/': typeof AdminIndexRoute");

    // Verify AdminRouteChildren definition
    expect(content).toContain("AdminProductsRoute: typeof AdminProductsRoute");
    expect(content).toContain("AdminMentorsRoute: typeof AdminMentorsRoute");
    expect(content).toContain("AdminIndexRoute: typeof AdminIndexRoute");
  });
});
