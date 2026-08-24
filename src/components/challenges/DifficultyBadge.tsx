export type Difficulty = "facile" | "moyen" | "difficile";

const DIFFICULTY_META: Record<Difficulty, { emoji: string; label: string; className: string }> = {
  facile: {
    emoji: "🟢",
    label: "Facile",
    className: "bg-emerald-50 text-emerald-700 border-emerald-300",
  },
  moyen: { emoji: "🟡", label: "Moyen", className: "bg-amber-50 text-amber-700 border-amber-300" },
  difficile: {
    emoji: "🔴",
    label: "Difficile",
    className: "bg-red-50 text-red-700 border-red-300",
  },
};

export function DifficultyBadge({
  difficulty,
  className = "",
}: {
  difficulty?: string | null;
  className?: string;
}) {
  const meta = DIFFICULTY_META[difficulty as Difficulty];
  if (!meta) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${meta.className} ${className}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
