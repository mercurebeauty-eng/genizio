import { describe, it, expect } from "vitest";
import { isMentorMode } from "./mentor-mode";

// isMentorMode (mode Parent/Mentor, décision #80-81) : pur commutateur lu dans
// user_metadata.mode. Tout le reste de l'app (données, actions, thème) dépend de
// ce prédicat — d'où sa couverture seule.

function sessionWithMode(mode: unknown) {
  return {
    user: { user_metadata: { mode } },
  } as any;
}

describe("isMentorMode (pur, mode Parent/Mentor)", () => {
  it("aucune session → parent (faux)", () => {
    expect(isMentorMode(null)).toBe(false);
  });

  it("mode 'mentor' → vrai", () => {
    expect(isMentorMode(sessionWithMode("mentor"))).toBe(true);
  });

  it("mode 'parent' → faux", () => {
    expect(isMentorMode(sessionWithMode("parent"))).toBe(false);
  });

  it("user_metadata absent → parent (faux)", () => {
    expect(isMentorMode({ user: {} } as any)).toBe(false);
  });

  it("mode inattendu → parent (faux, jamais de surprise)", () => {
    expect(isMentorMode(sessionWithMode("admin"))).toBe(false);
  });
});
