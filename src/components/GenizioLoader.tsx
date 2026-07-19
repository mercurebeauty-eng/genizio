const SIZES = {
  sm: 44,
  md: 88,
  lg: 128,
} as const;

// Two Q/T segments = one full wave period across a 200-wide viewBox, so
// translating by -50% (one period) loops seamlessly.
const WAVE_PATH = "M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V20 H0 Z";

type GenizioLoaderProps = {
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
};

export function GenizioLoader({ size = "md", label, className = "" }: GenizioLoaderProps) {
  const px = SIZES[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="genizio-loader relative shrink-0 rounded-full border-[3px] border-ink bg-white shadow-brutal-sm"
        style={{ width: px, height: px }}
      >
        <div className="genizio-loader__liquid absolute inset-0 overflow-hidden rounded-full">
          <div className="genizio-loader__level absolute inset-0">
            <svg
              className="genizio-loader__wave genizio-loader__wave--back"
              viewBox="0 0 200 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={WAVE_PATH} />
            </svg>
            <svg
              className="genizio-loader__wave genizio-loader__wave--front"
              viewBox="0 0 200 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={WAVE_PATH} />
            </svg>
          </div>
        </div>
        <img
          src="/favicon-96x96.png"
          alt=""
          className="relative z-10 h-full w-full object-contain p-2 drop-shadow-sm"
          draggable={false}
        />
      </div>
      {label && <p className="text-xs font-bold text-ink/60 animate-pulse">{label}</p>}
    </div>
  );
}
