// Badge de format et de nature de défi (Taxonomie Tripartite Génizio) :
// - Grand Projet (projet d'envergure, aboutissement, multi-sessions ou 1h30+)
// - Investigation (observation concrète, recueil de données, Pratique vers Théorie)
// - L'Étincelle (micro-défi 10-20m, étonnement, amorce directe)

export interface ChallengeKindBadgeProps {
  kind?: string | null;
  format?: string | null;
  domain?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md";
}

function getProjectDomainInfo(domain?: string | null): { emoji: string; label: string } {
  const d = domain?.toLowerCase() ?? "";
  if (d.includes("art") && !d.includes("artisanat")) {
    return { emoji: "🎨", label: "Projet Créatif" };
  }
  if (d.includes("langue") || d.includes("littérature")) {
    return { emoji: "📖", label: "Projet d'Auteur" };
  }
  if (d.includes("science") || d.includes("math")) {
    return { emoji: "🔬", label: "Projet Scientifique" };
  }
  if (d.includes("agri") || d.includes("nature")) {
    return { emoji: "🌿", label: "Projet Naturaliste" };
  }
  if (d.includes("artisanat")) {
    return { emoji: "🪵", label: "Projet d'Atelier" };
  }
  if (d.includes("sport") || d.includes("corps")) {
    return { emoji: "🏃", label: "Défi d'Action" };
  }
  if (d.includes("commerce") || d.includes("entrepreneuriat")) {
    return { emoji: "💡", label: "Projet d'Initiative" };
  }
  return { emoji: "🏗️", label: "Grand Projet" };
}

export function ChallengeKindBadge({
  kind,
  format,
  domain,
  className = "",
  size = "sm",
}: ChallengeKindBadgeProps) {
  const normalized = (format || kind || "").trim().toLowerCase();

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[9px]",
    sm: "px-2.5 py-1 text-[10px]",
    md: "px-3 py-1.5 text-[11px]",
  }[size];

  // 1. Grand Projet (constructive_project / projet)
  if (normalized === "projet" || normalized === "constructive_project") {
    const { emoji, label } = getProjectDomainInfo(domain);
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-purple-300/80 bg-purple-100/90 ${sizeClasses} font-black uppercase tracking-wider text-purple-900 shadow-xs ring-1 ring-purple-400/30 ${className}`}
      >
        <span aria-hidden>{emoji}</span>
        <span>{label}</span>
      </span>
    );
  }

  // 2. Investigation (investigation)
  if (normalized === "investigation") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100/90 ${sizeClasses} font-extrabold uppercase tracking-wider text-emerald-900 shadow-xs ${className}`}
      >
        <span aria-hidden>🔍</span>
        <span>Investigation</span>
      </span>
    );
  }

  // 3. L'Étincelle (spark_micro / micro)
  if (normalized === "spark_micro" || normalized === "spark" || normalized === "micro") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/90 ${sizeClasses} font-extrabold uppercase tracking-wider text-amber-900 shadow-xs ${className}`}
      >
        <span aria-hidden>⚡</span>
        <span>L'Étincelle</span>
      </span>
    );
  }

  return null;
}
