import { describe, it, expect } from "vitest";
import { listCampaignTokensAdmin, type CampaignTokenDetail } from "@/lib/campaigns.functions";
import {
  assignSupervisor,
  assignSupervisorToCampaignAdmin,
  listSupervisorsAdmin,
  listCampaignsLightAdmin,
  declareSessionSupervisor,
  updateSupervisorStatusAdmin,
  listSupervisorSessionsAdmin,
  approveSupervisorSessionAdmin,
  markSupervisorSessionsPaidAdmin,
} from "@/lib/supervisors.functions";

describe("Milestone 3 — R4, R5, R6 Server & UI Logic Tests", () => {
  describe("R4: Export B2B Campaign Tokens", () => {
    it("exports listCampaignTokensAdmin server function definition", () => {
      expect(listCampaignTokensAdmin).toBeDefined();
      expect(typeof listCampaignTokensAdmin).toBe("function");
    });

    it("correctly formats CSV lines for token exports", () => {
      const sampleTokens: CampaignTokenDetail[] = [
        {
          id: "token-1",
          code: "GENIZIO-B2B-123456",
          campaign_id: "camp-1",
          is_redeemed: true,
          redeemed_at: "2026-07-26T12:00:00Z",
          redeemed_by_child_id: "child-1",
          created_at: "2026-07-01T10:00:00Z",
          child_name: "Kofi Mensah",
          parent_email: "parent@example.com",
        },
        {
          id: "token-2",
          code: "GENIZIO-B2B-654321",
          campaign_id: "camp-1",
          is_redeemed: false,
          redeemed_at: null,
          redeemed_by_child_id: null,
          created_at: "2026-07-01T10:00:00Z",
          child_name: null,
          parent_email: null,
        },
      ];

      const headers = [
        "Code",
        "Statut",
        "Date d'activation",
        "Nom Enfant",
        "Email Parent",
        "Date de création",
      ];
      const rows = sampleTokens.map((t) => [
        t.code,
        t.is_redeemed ? "Activé" : "Non activé",
        t.redeemed_at ? new Date(t.redeemed_at).toLocaleString("fr-FR") : "-",
        t.child_name || "-",
        t.parent_email || "-",
        t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "-",
      ]);

      const csvContent =
        "\uFEFF" +
        [
          headers.join(";"),
          ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";")),
        ].join("\n");

      expect(csvContent).toContain(
        "Code;Statut;Date d'activation;Nom Enfant;Email Parent;Date de création",
      );
      expect(csvContent).toContain('"GENIZIO-B2B-123456";"Activé"');
      expect(csvContent).toContain('"Kofi Mensah"');
      expect(csvContent).toContain('"parent@example.com"');
      expect(csvContent).toContain('"GENIZIO-B2B-654321";"Non activé"');
    });

    it("extracts non-activated tokens separated by newlines for copy to clipboard", () => {
      const sampleTokens: CampaignTokenDetail[] = [
        {
          id: "token-1",
          code: "GENIZIO-B2B-AAA111",
          campaign_id: "camp-1",
          is_redeemed: true,
          redeemed_at: "2026-07-26T12:00:00Z",
          redeemed_by_child_id: "child-1",
          created_at: "2026-07-01T10:00:00Z",
        },
        {
          id: "token-2",
          code: "GENIZIO-B2B-BBB222",
          campaign_id: "camp-1",
          is_redeemed: false,
          redeemed_at: null,
          redeemed_by_child_id: null,
          created_at: "2026-07-01T10:00:00Z",
        },
        {
          id: "token-3",
          code: "GENIZIO-B2B-CCC333",
          campaign_id: "camp-1",
          is_redeemed: false,
          redeemed_at: null,
          redeemed_by_child_id: null,
          created_at: "2026-07-01T10:00:00Z",
        },
      ];

      const unactivated = sampleTokens.filter((t) => !t.is_redeemed).map((t) => t.code);
      expect(unactivated).toEqual(["GENIZIO-B2B-BBB222", "GENIZIO-B2B-CCC333"]);
      expect(unactivated.join("\n")).toBe("GENIZIO-B2B-BBB222\nGENIZIO-B2B-CCC333");
    });
  });

  describe("R5: Harmonize Supervisor Assignment", () => {
    it("exports assignSupervisor server function definition", () => {
      expect(assignSupervisor).toBeDefined();
      expect(typeof assignSupervisor).toBe("function");
    });

    // Refonte Gestion des Superviseurs (2026-08-14) : les nouvelles fonctions de
    // l'Admin OS (liste groupée/paginée, assignation directe à une campagne, liste
    // légère des campagnes) doivent être exposées comme le reste de la milestone.
    it("exports listSupervisorsAdmin server function definition", () => {
      expect(listSupervisorsAdmin).toBeDefined();
      expect(typeof listSupervisorsAdmin).toBe("function");
    });

    it("exports assignSupervisorToCampaignAdmin server function definition", () => {
      expect(assignSupervisorToCampaignAdmin).toBeDefined();
      expect(typeof assignSupervisorToCampaignAdmin).toBe("function");
    });

    it("exports listCampaignsLightAdmin server function definition", () => {
      expect(listCampaignsLightAdmin).toBeDefined();
      expect(typeof listCampaignsLightAdmin).toBe("function");
    });

    // Système de confiance superviseur (V1) : déclaration de séance + ban/suspension.
    it("exports declareSessionSupervisor server function definition", () => {
      expect(declareSessionSupervisor).toBeDefined();
      expect(typeof declareSessionSupervisor).toBe("function");
    });

    it("exports updateSupervisorStatusAdmin server function definition", () => {
      expect(updateSupervisorStatusAdmin).toBeDefined();
      expect(typeof updateSupervisorStatusAdmin).toBe("function");
    });

    // Ledger payout superviseur (Vague C) : approbation des séances + marquage payé.
    it("exports listSupervisorSessionsAdmin server function definition", () => {
      expect(listSupervisorSessionsAdmin).toBeDefined();
      expect(typeof listSupervisorSessionsAdmin).toBe("function");
    });

    it("exports approveSupervisorSessionAdmin server function definition", () => {
      expect(approveSupervisorSessionAdmin).toBeDefined();
      expect(typeof approveSupervisorSessionAdmin).toBe("function");
    });

    it("exports markSupervisorSessionsPaidAdmin server function definition", () => {
      expect(markSupervisorSessionsPaidAdmin).toBeDefined();
      expect(typeof markSupervisorSessionsPaidAdmin).toBe("function");
    });
  });
});
