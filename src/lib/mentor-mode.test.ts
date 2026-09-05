import { describe, it, expect } from "vitest";
import { isMentorMode, isEducatorMode, getAppMode } from "./mentor-mode";

// isMentorMode / isEducatorMode / getAppMode : commutateurs lus dans
// user_metadata.mode. Tout le reste de l'app (données, actions, onglets) dépend de
// ces prédicats.

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

describe("isEducatorMode (pur, mode Éducateur/Orientation)", () => {
  it("aucune session → faux", () => {
    expect(isEducatorMode(null)).toBe(false);
  });

  it("mode 'educator' → vrai", () => {
    expect(isEducatorMode(sessionWithMode("educator"))).toBe(true);
  });

  it("mode 'parent' → faux", () => {
    expect(isEducatorMode(sessionWithMode("parent"))).toBe(false);
  });

  it("mode 'mentor' → faux", () => {
    expect(isEducatorMode(sessionWithMode("mentor"))).toBe(false);
  });
});

describe("getAppMode (pur, mode Parent/Mentor/Éducateur)", () => {
  it("aucune session → 'parent'", () => {
    expect(getAppMode(null)).toBe("parent");
  });

  it("mode 'mentor' → 'mentor'", () => {
    expect(getAppMode(sessionWithMode("mentor"))).toBe("mentor");
  });

  it("mode 'educator' → 'educator'", () => {
    expect(getAppMode(sessionWithMode("educator"))).toBe("educator");
  });

  it("autre mode ou absent → 'parent'", () => {
    expect(getAppMode(sessionWithMode("autre"))).toBe("parent");
    expect(getAppMode({ user: {} } as any)).toBe("parent");
  });
});
