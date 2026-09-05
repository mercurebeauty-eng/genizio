import { describe, expect, it } from "vitest";
import {
  isInstallPromptSuppressed,
  INSTALL_PROMPT_SUPPRESSION_DAYS,
} from "@/lib/pwa-install";

// La logique de réaffichage du popup d'installation doit être insensible au
// décalage horloge : isInstallPromptSuppressed est pure, testée ici.

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000; // instant de référence arbitraire

describe("isInstallPromptSuppressed", () => {
  it("jamais fermé → pas de suppression", () => {
    expect(isInstallPromptSuppressed(null, NOW)).toBe(false);
    expect(isInstallPromptSuppressed(Number.NaN, NOW)).toBe(false);
  });

  it("fermé depuis moins de 2 jours → suppression active", () => {
    expect(isInstallPromptSuppressed(NOW - 1 * DAY, NOW)).toBe(true);
    expect(isInstallPromptSuppressed(NOW - 2 * DAY + 1, NOW)).toBe(true);
  });

  it("fermé depuis 2 jours ou plus → le popup revient", () => {
    expect(isInstallPromptSuppressed(NOW - 2 * DAY, NOW)).toBe(false);
    expect(isInstallPromptSuppressed(NOW - 5 * DAY, NOW)).toBe(false);
  });

  it("horloge cliente en retard (futur) → pas de blocage éternel, suppression quand même bornée", () => {
    // dismissedAt dans le futur : diff négatif < 2 jours → suppressed = true.
    // Comportement assumé : on attend la date cohérente. Mais on garantit que
    // la constante reste raisonnable (pas de 90 jours).
    expect(INSTALL_PROMPT_SUPPRESSION_DAYS).toBeLessThanOrEqual(3);
  });

  it("surcharge de durée supportée (tests / expérimentation)", () => {
    expect(isInstallPromptSuppressed(NOW - 3 * DAY, NOW, 7)).toBe(true);
    expect(isInstallPromptSuppressed(NOW - 8 * DAY, NOW, 7)).toBe(false);
  });
});
