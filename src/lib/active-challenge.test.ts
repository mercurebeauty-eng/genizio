import { describe, it, expect } from "vitest";
import { getActiveChallenge, type ChallengeLike } from "./active-challenge";

describe("getActiveChallenge", () => {
  it("returns null for an empty list", () => {
    expect(getActiveChallenge([])).toBeNull();
  });

  it("prefers an in_progress challenge over a todo one", () => {
    const challenges: ChallengeLike[] = [
      { id: "todo-1", status: "todo", created_at: "2026-01-01" },
      { id: "in-progress-1", status: "in_progress", updated_at: "2026-01-02" },
    ];
    expect(getActiveChallenge(challenges)?.id).toBe("in-progress-1");
  });

  it("picks the most recently updated in_progress challenge when several exist", () => {
    const challenges: ChallengeLike[] = [
      { id: "older", status: "in_progress", updated_at: "2026-01-01T10:00:00Z" },
      { id: "newer", status: "in_progress", updated_at: "2026-01-03T10:00:00Z" },
      { id: "middle", status: "in_progress", updated_at: "2026-01-02T10:00:00Z" },
    ];
    expect(getActiveChallenge(challenges)?.id).toBe("newer");
  });

  it("falls back to the oldest todo challenge when nothing is in_progress", () => {
    const challenges: ChallengeLike[] = [
      { id: "newer-todo", status: "todo", created_at: "2026-01-03T10:00:00Z" },
      { id: "older-todo", status: "todo", created_at: "2026-01-01T10:00:00Z" },
      { id: "done", status: "completed", created_at: "2026-01-01T00:00:00Z" },
    ];
    expect(getActiveChallenge(challenges)?.id).toBe("older-todo");
  });

  it("returns null when every challenge is completed", () => {
    const challenges: ChallengeLike[] = [
      { id: "done-1", status: "completed" },
      { id: "done-2", status: "completed" },
    ];
    expect(getActiveChallenge(challenges)).toBeNull();
  });

  it("treats a missing updated_at as sorting behind any timestamped entry", () => {
    const challenges: ChallengeLike[] = [
      { id: "no-timestamp", status: "in_progress" },
      { id: "timestamped", status: "in_progress", updated_at: "2026-01-01T00:00:00Z" },
    ];
    expect(getActiveChallenge(challenges)?.id).toBe("timestamped");
  });
});
