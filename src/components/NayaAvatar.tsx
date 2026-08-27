import { useEffect, useState } from "react";
import { Sparkles, Star, Heart } from "lucide-react";
import nayaAvatar from "@/assets/naya-avatar.webp";

const SIZES = {
  sm: 72,
  md: 112,
  lg: 160,
} as const;

type NayaAvatarProps = {
  size?: keyof typeof SIZES;
  thoughts?: string[];
  className?: string;
};

const DEFAULT_THOUGHTS = [
  "Je regarde tes défis...",
  "Chaque essai compte !",
  "Prêt pour une nouvelle aventure ?",
  "Ton talent grandit, je le vois.",
];

export function NayaAvatar({ size = "md", thoughts, className = "" }: NayaAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [showThought, setShowThought] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; kind: number }>
  >([]);
  const px = SIZES[size];

  const activeThoughts = thoughts !== undefined ? thoughts : DEFAULT_THOUGHTS;

  useEffect(() => {
    if (activeThoughts.length === 0) {
      setShowThought(false);
      return;
    }
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % activeThoughts.length);
      setShowThought(true);
      const hide = setTimeout(() => setShowThought(false), 3200);
      return () => clearTimeout(hide);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeThoughts.length]);

  const handleClick = () => {
    setIsClicked(true);
    const burst = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 120 - 60,
      y: Math.random() * 120 - 60,
      kind: Math.floor(Math.random() * 3),
    }));
    setParticles(burst);
    if (activeThoughts.length > 0) {
      setThoughtIndex((prev) => (prev + 1) % activeThoughts.length);
      setShowThought(true);
    }
    setTimeout(() => {
      setIsClicked(false);
      setParticles([]);
    }, 1000);
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
    >
      {/* Particules légères au clic */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 transition-all duration-700 ease-out animate-in fade-in zoom-in"
          style={{
            transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) scale(${isClicked ? 1.2 : 0})`,
            opacity: isClicked ? 1 : 0,
          }}
        >
          {p.kind === 0 ? (
            <Star className="size-4 text-brand fill-current" />
          ) : p.kind === 1 ? (
            <Sparkles className="size-4 text-sky" />
          ) : (
            <Heart className="size-4 text-leaf fill-current" />
          )}
        </div>
      ))}

      {/* Bulle de pensée de Naya */}
      {(showThought || isHovered) && activeThoughts.length > 0 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 w-max max-w-[10rem] cursor-default rounded-2xl border border-ink/10 bg-white px-3 py-2 shadow-md text-center animate-in fade-in zoom-in-90 duration-200">
          <p className="text-xs font-semibold leading-snug text-ink">
            {activeThoughts[thoughtIndex]}
          </p>
          <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 size-3 rotate-45 border-r-[3px] border-b-[3px] border-ink bg-white" />
        </div>
      )}

      {/* Corps interactif de l'avatar avec flottement CSS pur */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className={`relative z-10 cursor-pointer select-none transition-transform duration-300 ease-out active:scale-95 ${
          isHovered ? "scale-105 rotate-1" : isClicked ? "scale-110" : "hover:scale-105"
        }`}
        style={{
          width: px,
          height: px,
          animation: "nayaFloat 3s ease-in-out infinite",
        }}
      >
        {/* Halo de lueur */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 via-leaf/20 to-sky/30 blur-lg transition-opacity duration-300 ${
            isHovered ? "opacity-90 scale-110" : "opacity-40"
          }`}
        />
        <img
          src={nayaAvatar}
          alt="Naya, le mentor IA de Génizio"
          width="128"
          height="128"
          decoding="async"
          className="relative h-full w-full object-contain drop-shadow-lg"
          draggable={false}
        />

        {/* Clignement des yeux en CSS pur (sans JavaScript d'animation) */}
        {[
          { left: "38.2%", top: "56%" },
          { left: "48%", top: "56%" },
        ].map((eye, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full bg-[#8a4a30]"
            style={{
              left: eye.left,
              top: eye.top,
              width: "7.5%",
              height: "7.5%",
              transform: "translate(-50%, -50%)",
              transformOrigin: "center",
              animation: "nayaBlink 4.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes nayaFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes nayaBlink {
          0%, 92%, 100% { transform: translate(-50%, -50%) scaleY(0); }
          95%, 97% { transform: translate(-50%, -50%) scaleY(1); }
        }
      `}</style>
    </div>
  );
}
