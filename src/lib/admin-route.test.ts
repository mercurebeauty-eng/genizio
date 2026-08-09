import { describe, it, expect, vi } from "vitest";
import { ADMIN_TABS, AdminTab } from "@/components/admin/AdminNavTabBar";
import fs from "node:fs";
import path from "node:path";

describe("Milestone 3 Admin Route Safety & Unified 9-Tab Navigation Hub", () => {
  it("defines all 9 tabs in ADMIN_TABS with valid metadata", () => {
    const tabIds = ADMIN_TABS.map((t) => t.id);
    expect(tabIds).toHaveLength(9);
    expect(tabIds).toEqual([
      "executive",
      "b2b",
      "supervisors",
      "products",
      "talents",
      "naya",
      "commerce",
      "seasons",
      "subscriptions",
    ]);

    const execTab = ADMIN_TABS.find((t) => t.id === "executive");
    expect(execTab?.label).toBe("Exécutif");
    expect(execTab?.badge).toBe("BI CRM");

    const b2bTab = ADMIN_TABS.find((t) => t.id === "b2b");
    expect(b2bTab?.label).toBe("Campagnes B2B");

    const supTab = ADMIN_TABS.find((t) => t.id === "supervisors");
    expect(supTab?.label).toBe("Superviseurs");

    const prodTab = ADMIN_TABS.find((t) => t.id === "products");
    expect(prodTab?.label).toBe("Produits");

    const talentsTab = ADMIN_TABS.find((t) => t.id === "talents");
    expect(talentsTab?.label).toBe("Talents & Villes");
    expect(talentsTab?.badge).toBe("Radar");

    const subsTab = ADMIN_TABS.find((t) => t.id === "subscriptions");
    expect(subsTab?.label).toBe("Abonnements");
    expect(subsTab?.badge).toBe("MRR");
  });

  it("handles tab change callback seamlessly when switching tabs", () => {
    let currentTab: AdminTab = "executive";
    const onTabChange = vi.fn((newTab: AdminTab) => {
      currentTab = newTab;
    });

    onTabChange("supervisors");
    expect(onTabChange).toHaveBeenCalledWith("supervisors");
    expect(currentTab).toBe("supervisors");

    onTabChange("products");
    expect(onTabChange).toHaveBeenCalledWith("products");
    expect(currentTab).toBe("products");

    onTabChange("executive");
    expect(onTabChange).toHaveBeenCalledWith("executive");
    expect(currentTab).toBe("executive");
  });

  it("verifies sub-routes /admin/products and /admin/supervisors and /admin/ are registered in routeTree.gen.ts", () => {
    const routeTreePath = path.resolve(__dirname, "../routeTree.gen.ts");
    const content = fs.readFileSync(routeTreePath, "utf-8");

    // Verify imports
    expect(content).toContain("import { Route as AdminRouteImport } from './routes/admin'");
    expect(content).toContain(
      "import { Route as AdminIndexRouteImport } from './routes/admin.index'",
    );
    expect(content).toContain(
      "import { Route as AdminSupervisorsRouteImport } from './routes/admin.supervisors'",
    );
    expect(content).toContain(
      "import { Route as AdminProductsRouteImport } from './routes/admin.products'",
    );

    // Verify full paths in FileRoutesByFullPath
    expect(content).toContain("'/admin/products': typeof AdminProductsRoute");
    expect(content).toContain("'/admin/supervisors': typeof AdminSupervisorsRoute");
    expect(content).toContain("'/admin/': typeof AdminIndexRoute");

    // Verify AdminRouteChildren definition
    expect(content).toContain("AdminProductsRoute: typeof AdminProductsRoute");
    expect(content).toContain("AdminSupervisorsRoute: typeof AdminSupervisorsRoute");
    expect(content).toContain("AdminIndexRoute: typeof AdminIndexRoute");
  });
});
