import { useMemo } from "react";

type LevelUpCelebrationProps = {
  newLevel: number;
  xpGained: number;
  newStreak: number;
  onContinue: () => void;
};

const CONFETTI_COLORS = ["var(--brand)", "var(--leaf)", "var(--sky-dark)", "var(--brand-glow)", "#fff"];

// Écran plein écran déclenché quand awardCompletionXP (challenges.functions.ts)
// détecte un passage de niveau — cf. écran 6 du prototype (Génizio Learning
// Experience Design). Le nombre de badges du prototype est volontairement
// omis : le système de badges n'existe pas encore (item séparé), pas question
// d'afficher un chiffre inventé.
export function LevelUpCelebration({ newLevel, xpGained, newStreak, onContinue }: LevelUpCelebrationProps) {
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-6 py-10 text-center animate-in fade-in duration-300"
      style={{ background: "linear-gradient(175deg, var(--brand), var(--brand-glow))" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiPieces.map((c, i) => (
          <span
            key={i}
            className="absolute top-0 rounded-sm"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size,
              background: c.color,
              animation: `gz-confetti-fall ${c.duration}s ease-in ${c.delay}s forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/80">Niveau supérieur</p>

        <div className="animate-gz-bounce-in relative my-6 flex size-[150px] items-center justify-center rounded-full bg-white/15">
          <div className="flex size-[118px] flex-col items-center justify-center rounded-full bg-white shadow-lg">
            <span className="text-xs font-bold text-brand">Niveau</span>
            <span className="font-display text-5xl font-bold leading-none text-brand">{newLevel}</span>
          </div>
        </div>

        <p className="max-w-[260px] text-sm text-white/90">Continue comme ça — chaque défi compte !</p>

        <div className="my-6 flex gap-3">
          <div className="rounded-2xl bg-white/15 px-5 py-3">
            <div className="font-display text-2xl font-bold text-white">+{xpGained}</div>
            <div className="text-[11px] font-semibold text-white/80">XP gagnés</div>
          </div>
          <div className="rounded-2xl bg-white/15 px-5 py-3">
            <div className="font-display text-2xl font-bold text-white">{newStreak}</div>
            <div className="text-[11px] font-semibold text-white/80">{newStreak > 1 ? "jours de suite" : "jour de suite"}</div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="press-white w-full max-w-xs rounded-2xl bg-white py-4 text-sm font-bold text-ink cursor-pointer"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
