import type { Session } from "@supabase/supabase-js";

// Mode Parent/Mentor (décisions #80 et #81) — pur commutateur de contexte stocké
// dans auth.users.user_metadata.mode, jamais un statut de compte (mentor_profiles).
// Source unique de lecture côté client : les pages (accueil, défis, portfolio…)
// et la barre d'onglets branchaient cette valeur inline chacune de leur côté.
export function isMentorMode(session: Session | null): boolean {
  return session?.user.user_metadata?.mode === "mentor";
}
