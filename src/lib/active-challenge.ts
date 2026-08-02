export type ChallengeStatus = "todo" | "in_progress" | "completed" | "not_completed";

export type ChallengeLike = {
  id: string;
  status: ChallengeStatus;
  created_at?: string;
  updated_at?: string;
};

/**
 * Picks the one challenge to surface as "this week's" active/next challenge:
 * the most recently updated in-progress one, else the oldest still-todo one,
 * else null (nothing to work on right now).
 */
export function getActiveChallenge<T extends ChallengeLike>(challenges: T[]): T | null {
  const inProgress = challenges
    .filter((c) => c.status === "in_progress")
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  if (inProgress.length > 0) return inProgress[0];

  const todo = challenges
    .filter((c) => c.status === "todo")
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  if (todo.length > 0) return todo[0];

  return null;
}
