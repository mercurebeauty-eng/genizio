import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, Heart } from "lucide-react";
import nayaAvatar from "@/assets/naya-avatar.png";

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
  const [isDragging, setIsDragging] = useState(false);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [showThought, setShowThought] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; kind: number }>>([]);
  const px = SIZES[size];

  // Allow all avatars to have thoughts, but position them above the head to avoid colliding with text on the right
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
      x: Math.random() * 140 - 70,
      y: Math.random() * 140 - 70,
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
    }, 1200);
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: px, height: px }}>
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20"
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [1, 1, 0], scale: [0, 1.3, 0.6], x: p.x, y: p.y, rotate: [0, 360] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          >
            {p.kind === 0 ? (
              <Star className="size-4 text-brand" fill="currentColor" />
            ) : p.kind === 1 ? (
              <Sparkles className="size-4 text-sky" />
            ) : (
              <Heart className="size-4 text-leaf" fill="currentColor" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {(showThought || isHovered) && activeThoughts.length > 0 && (
          <motion.div
            className="absolute -top-3.5 left-1/2 z-30 w-max max-w-[10rem] cursor-default rounded-2xl border border-ink/10 bg-white px-3 py-2 shadow-md text-center"
            initial={{ opacity: 0, scale: 0.6, y: 15, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.6, y: 15, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <p className="text-xs font-semibold leading-snug text-ink">{activeThoughts[thoughtIndex]}</p>
            <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 size-3 rotate-45 border-r-[3px] border-b-[3px] border-ink bg-white" />
          </motion.div>
        )}
      </AnimatePresence>



      <motion.div
        drag
        dragConstraints={{ left: -24, right: 24, top: -24, bottom: 24 }}
        dragElastic={0.15}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className="relative z-10 cursor-grab select-none active:cursor-grabbing"
        style={{ width: px, height: px }}
        animate={{
          y: isDragging ? 0 : [0, -6, 0],
          rotate: isDragging ? [-3, 3] : isHovered ? [-2, 2, -2] : 0,
          scale: isClicked ? 1.12 : isHovered ? 1.05 : 1,
        }}
        transition={{
          y: { duration: 2.6, repeat: isDragging ? 0 : Infinity, ease: "easeInOut" },
          rotate: { duration: 0.6, repeat: isHovered && !isDragging ? Infinity : 0, repeatType: "mirror" },
          scale: { duration: 0.25 },
        }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 via-leaf/20 to-sky/30 blur-lg"
          animate={{ opacity: isHovered || isDragging ? 0.9 : 0.4, scale: isHovered ? 1.15 : 1 }}
          transition={{ duration: 0.3 }}
        />
        <img
          src={nayaAvatar}
          alt="Naya, le mentor IA de Génizio"
          className="relative h-full w-full object-contain drop-shadow-lg"
          draggable={false}
        />

        {/* Blink overlay: two eyelid pills, invisible until the periodic blink */}
        {[
          { left: "38.2%", top: "56%" },
          { left: "48%", top: "56%" },
        ].map((eye, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute rounded-full bg-[#8a4a30]"
            style={{
              left: eye.left,
              top: eye.top,
              width: "7.5%",
              height: "7.5%",
              x: "-50%",
              y: "-50%",
              transformOrigin: "center",
            }}
            animate={{ scaleY: [0, 0, 1, 0, 0] }}
            transition={{
              duration: 4.6,
              repeat: Infinity,
              repeatDelay: 0,
              ease: "easeInOut",
              times: [0, 0.93, 0.965, 0.99, 1],
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
