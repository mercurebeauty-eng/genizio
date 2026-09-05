import { GARDNER_LABELS, type GardnerKey } from "@/lib/gardner";
import { TALENT_SUBFORM_LABELS } from "@/lib/challenges.functions";

const GARDNER_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  logico_mathematique: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  creative: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  corporelle: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  linguistique: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  spatial: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
  sociale: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  emotionnelle: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  artisanale: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  entrepreneuriale: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-300" },
};

export interface ChallengeGardnerPillsProps {
  intelligences?: string[] | null;
  traitSubform?: string | null;
  domain?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  showSubform?: boolean;
}

export function ChallengeGardnerPills({
  intelligences,
  traitSubform,
  domain,
  size = "sm",
  className = "",
  showSubform = true,
}: ChallengeGardnerPillsProps) {
  const keys = Array.isArray(intelligences)
    ? intelligences.filter((k) => typeof k === "string" && k.trim().length > 0)
    : [];

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[10px] gap-1",
    sm: "px-2.5 py-1 text-[11px] gap-1.5",
    md: "px-3.5 py-1.5 text-[13px] gap-2",
  }[size];

  const subformLabel = traitSubform
    ? (TALENT_SUBFORM_LABELS[traitSubform] ?? traitSubform.replace(/_/g, " "))
    : null;

  if (keys.length === 0) {
    if (!domain) return null;
    return (
      <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
        <span
          className={`inline-flex items-center rounded-full border border-ink/10 bg-surface font-bold text-ink/80 shadow-xs ${sizeClasses}`}
        >
          <span>🎯</span>
          <span>{domain}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {keys.map((key) => {
        const canonicalKey = key.trim().toLowerCase() as GardnerKey;
        const label = GARDNER_LABELS[canonicalKey] ?? key;
        const color = GARDNER_COLOR_MAP[canonicalKey] ?? {
          bg: "bg-surface",
          text: "text-ink/80",
          border: "border-ink/10",
        };

        return (
          <span
            key={key}
            className={`inline-flex items-center rounded-full border font-extrabold shadow-xs transition-colors ${color.bg} ${color.text} ${color.border} ${sizeClasses}`}
          >
            <span>{label}</span>
          </span>
        );
      })}

      {showSubform && subformLabel && (
        <span
          className={`inline-flex items-center rounded-full border border-dashed border-ink/20 bg-white/80 font-bold text-ink/75 shadow-2xs ${sizeClasses}`}
        >
          <span className="opacity-60">↳</span>
          <span>{subformLabel}</span>
        </span>
      )}
    </div>
  );
}
