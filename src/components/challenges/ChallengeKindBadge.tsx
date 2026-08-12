// Défis-projets (2026-08-12, analyse §27) : un défi peut être une micro-activité
// d'entraînement ou un véritable projet (construire, concevoir, planifier →
// résultat observable). Le badge rend le type visible sur les cartes — le niveau
// de guidage, lui, reste invisible à l'enfant (c'est un réglage de Naya).
export function ChallengeKindBadge({
  kind,
  className = "",
}: {
  kind?: string | null;
  className?: string;
}) {
  if (kind !== "projet") return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700 shadow-sm ${className}`}
    >
      <span aria-hidden>🏗️</span>
      Projet
    </span>
  );
}
