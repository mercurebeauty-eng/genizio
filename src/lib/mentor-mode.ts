import type { Session } from "@supabase/supabase-js";

export type AppMode = "parent" | "mentor" | "educator";

// Mode Parent/Mentor/Éducateur (décisions #80, #81 et Sprint C) — pur commutateur de contexte stocké
// dans auth.users.user_metadata.mode, jamais un statut de compte rigide.
// Source unique de lecture côté client : les pages (accueil, défis, portfolio, profil…)
// et la barre d'onglets branchent cette valeur pour s'adapter à la casquette active.
export function isMentorMode(session: Session | null): boolean {
  return session?.user.user_metadata?.mode === "mentor";
}

export function isEducatorMode(session: Session | null): boolean {
  return session?.user.user_metadata?.mode === "educator";
}

export function getAppMode(session: Session | null): AppMode {
  const mode = session?.user.user_metadata?.mode;
  if (mode === "mentor" || mode === "educator") return mode;
  return "parent";
}
