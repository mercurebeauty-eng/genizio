import { Award } from "lucide-react";

type BadgeUnlockedCelebrationProps = {
  title: string;
  description: string;
  onContinue: () => void;
};

// Écran plein écran déclenché quand checkAndAwardBadge (challenges.functions.ts)
// débloque un nouveau badge — cf. écran 8 du prototype (Génizio Learning
// Experience Design).
export function BadgeUnlockedCelebration({
  title,
  description,
  onContinue,
}: BadgeUnlockedCelebrationProps) {
  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-y-auto px-8 py-10 text-center animate-in fade-in duration-300"
      style={{
        background: "radial-gradient(110% 60% at 50% 20%, var(--glow-100), var(--surface))",
      }}
    >
      <div className="my-auto flex flex-col items-center">
        <p className="text-xs font-black uppercase tracking-[0.1em] text-brand">Nouveau badge</p>

        <div className="animate-gz-bounce-in relative my-6 flex size-[150px] items-center justify-center rounded-[38%_38%_42%_42%/40%] bg-gradient-to-br from-brand to-brand-dark shadow-glow-brand border-4 border-white">
          <Award className="size-16 text-white" strokeWidth={1.7} />
        </div>

        <h2 className="font-display text-3xl font-bold text-ink">{title}</h2>
        <p className="mt-2 max-w-[290px] text-sm leading-relaxed text-ink/60">{description}</p>

        <button
          onClick={onContinue}
          className="press-brand mt-8 w-full max-w-xs rounded-2xl bg-brand py-4 text-sm font-bold text-white cursor-pointer"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
