import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AdminNayaTab } from "./AdminNayaTab";
import { calculateNayaTelemetry } from "@/lib/naya-telemetry";
import type { LiveOpenRouterPricing } from "@/lib/openrouter-pricing.types";

// Mock des fonctions TanStack server et Supabase channel
vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();
  return {
    ...actual,
    useServerFn: (fn: any) => fn,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => ({
      send: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("AdminNayaTab UI Certification", () => {
  const mockLivePricing: LiveOpenRouterPricing = {
    deepseekChat: {
      inputPerM: 0.0808,
      outputPerM: 0.1616,
      modelId: "deepseek/deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
    },
    deepseekReasoner: {
      inputPerM: 0.6876,
      outputPerM: 1.3753,
      modelId: "deepseek/deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
    },
    glmFlash: {
      inputPerM: 0.075,
      outputPerM: 0.25,
      modelId: "z-ai/glm-5.3-flash",
      name: "GLM 5.3 Flash",
    },
    qwenFlash: {
      inputPerM: 0.0481,
      outputPerM: 0.193,
      modelId: "qwen/qwen3.8-flash",
      name: "Qwen 3.8 Flash",
    },
    visionSonnet: {
      inputPerM: 2.0,
      outputPerM: 10.0,
      modelId: "anthropic/claude-sonnet-5",
      name: "Claude Sonnet 5",
    },
    isLive: true,
    source: "openrouter_api",
    fetchedAt: "2026-09-06T12:00:00.000Z",
  };

  const sampleTelemetry = calculateNayaTelemetry(
    {
      challengesGenerated: 120,
      challengesStarted: 90,
      challengesCompleted: 60,
      photoProofCompleted: 25,
      hypothesesCycles: 15,
      recommendationsCount: 30,
      activeChallengeModel: "deepseek-v4-flash",
      glmFlashTokens: { input: 12000, output: 6000, calls: 4 },
    },
    mockLivePricing,
  );

  const sampleAiStatus = {
    deepseekConfigured: true,
    anthropicConfigured: true,
    geminiConfigured: true,
    glmConfigured: true,
    qwenConfigured: true,
  };

  const sampleRouting = {
    challengeModel: "deepseek-v4-flash" as const,
    fallbackEnabled: true,
    updatedAt: "2026-09-06T11:00:00.000Z",
    updatedBy: "superadmin@genizio.com",
  };

  it("affiche les 5 cartes de modèles sans aucune valeur NaN ou undefined", () => {
    const html = renderToString(
      <AdminNayaTab
        telemetry={sampleTelemetry}
        aiProviderStatus={sampleAiStatus}
        nayaRoutingSettings={sampleRouting}
      />,
    );

    // Vérification de l'absence totale de NaN et undefined
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");

    // Présence des 5 cartes de spécialisation
    expect(html).toContain("Tâche 1 · Défis Naya");
    expect(html).toContain("Tâche 2 · Copilote Prof");
    expect(html).toContain("Tâche 1 · Moteur Qwen");
    expect(html).toContain("Raisonnement Pro");
    expect(html).toContain("Vision Photos");

    // Noms des modèles exacts
    expect(html).toContain("DeepSeek V4 Flash");
    expect(html).toContain("GLM 5.3 Flash (GMICLoud)");
    expect(html).toContain("Qwen 3.8 Flash (Alibaba)");
    expect(html).toContain("DeepSeek V4 Pro");
    expect(html).toContain("Claude Sonnet 5");
  });

  it("différencie explicitement les deux tâches de GLM (Défis apprenants vs Copilote Professeur didactique)", () => {
    const html = renderToString(
      <AdminNayaTab
        telemetry={sampleTelemetry}
        aiProviderStatus={sampleAiStatus}
        nayaRoutingSettings={sampleRouting}
      />,
    );

    // Badge dédié enseignants
    expect(html).toContain("Dédié Enseignants");
    expect(html).toContain("Déconstruction didactique, fiches de préparation de cours multimodales");
    expect(html).toContain("Double tâche : Copilote Enseignants &amp; Option Défis Naya");
    expect(html).toContain("Tâche 2 (Copilote Enseignants)");
    expect(html).toContain("Tâche 1 (Défis Naya)");
  });

  it("affiche le badge de synchronisation temps réel OpenRouter avec horodatage et bouton de refresh", () => {
    const html = renderToString(
      <AdminNayaTab
        telemetry={sampleTelemetry}
        aiProviderStatus={sampleAiStatus}
        nayaRoutingSettings={sampleRouting}
      />,
    );

    expect(html).toContain("Tarifs OpenRouter :");
    expect(html).toContain("API Live");
    expect(html).toContain("Rafraîchir");
    expect(html).toContain("Calculé d&#x27;après les tarifs réels OpenRouter");
  });

  it("affiche la barre d'état des 5 clés API et la mention de la passerelle partagée", () => {
    const html = renderToString(
      <AdminNayaTab
        telemetry={sampleTelemetry}
        aiProviderStatus={sampleAiStatus}
        nayaRoutingSettings={sampleRouting}
      />,
    );

    expect(html).toContain("DeepSeek (Défis &amp; Raisonnement)");
    expect(html).toContain("GLM 5.3 Flash (Copilote Prof &amp; Défis)");
    expect(html).toContain("Qwen 3.8 Flash (Défis Naya)");
    expect(html).toContain("Claude Sonnet (Vision photos)");
    expect(html).toContain("Gemini (Réserve multimodale)");
    expect(html).toContain("Passerelle partagée :");
    expect(html).toContain("La clé GLM (GMICLoud / api.b.ai) alimente à la fois");
  });

  it("reflète fidèlement le switch de modèle sur GLM 5.3 Flash ou Qwen 3.8 Flash", () => {
    const glmTelemetry = calculateNayaTelemetry(
      {
        challengesGenerated: 100,
        challengesStarted: 80,
        challengesCompleted: 50,
        photoProofCompleted: 0,
        hypothesesCycles: 10,
        recommendationsCount: 15,
        activeChallengeModel: "glm-5.3-flash",
      },
      mockLivePricing,
    );

    const glmHtml = renderToString(
      <AdminNayaTab
        telemetry={glmTelemetry}
        aiProviderStatus={sampleAiStatus}
        nayaRoutingSettings={{ ...sampleRouting, challengeModel: "glm-5.3-flash" }}
      />,
    );

    expect(glmHtml).not.toContain("NaN");
    expect(glmHtml).not.toContain("undefined");
    expect(glmHtml).toContain("Moteur actif :");
    expect(glmHtml).toContain("GLM 5.3 Flash");
  });

  it("affiche un état de chargement propre si telemetry est temporairement indisponible", () => {
    const html = renderToString(
      <AdminNayaTab
        telemetry={null as any}
        aiProviderStatus={sampleAiStatus}
      />,
    );

    expect(html).toContain("Chargement de la télémétrie IA Naya...");
  });
});
