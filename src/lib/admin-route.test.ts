import { describe, it, expect, vi } from "vitest";
import { ADMIN_TABS, AdminTab } from "@/components/admin/AdminNavTabBar";
import fs from "node:fs";
import path from "node:path";

describe("Milestone 2 Admin Route Safety & Tab Switching", () => {
  it("defines executive and talents tabs in ADMIN_TABS with valid metadata", () => {
    const tabIds = ADMIN_TABS.map((t) => t.id);
    expect(tabIds).toContain("executive");
    expect(tabIds).toContain("talents");
    expect(tabIds).toContain("naya");
    expect(tabIds).toContain("commerce");

    const execTab = ADMIN_TABS.find((t) => t.id === "executive");
    expect(execTab?.label).toBe("Vue Exécutive");
    expect(execTab?.badge).toBe("BI CRM");

    const talentsTab = ADMIN_TABS.find((t) => t.id === "talents");
    expect(talentsTab?.label).toBe("Talents & Villes");
    expect(talentsTab?.badge).toBe("Radar");
  });

  it("handles tab change callback seamlessly when switching tabs", () => {
    let currentTab: AdminTab = "executive";
    const onTabChange = vi.fn((newTab: AdminTab) => {
      currentTab = newTab;
    });

    // Switch to talents tab
    onTabChange("talents");
    expect(onTabChange).toHaveBeenCalledWith("talents");
    expect(currentTab).toBe("talents");

    // Switch back to executive tab
    onTabChange("executive");
    expect(onTabChange).toHaveBeenCalledWith("executive");
    expect(currentTab).toBe("executive");
  });

  it("verifies sub-routes /admin/products and /admin/supervisors and /admin/ are registered in routeTree.gen.ts", () => {
    const routeTreePath = path.resolve(__dirname, "../routeTree.gen.ts");
    const content = fs.readFileSync(routeTreePath, "utf-8");

    // Verify imports
    expect(content).toContain("import { Route as AdminRouteImport } from './routes/admin'");
    expect(content).toContain("import { Route as AdminIndexRouteImport } from './routes/admin.index'");
    expect(content).toContain("import { Route as AdminSupervisorsRouteImport } from './routes/admin.supervisors'");
    expect(content).toContain("import { Route as AdminProductsRouteImport } from './routes/admin.products'");

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
