const SIZES = {
  sm: 44,
  md: 88,
  lg: 128,
} as const;

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
          <span className="genizio-loader__wave genizio-loader__wave--back" />
          <span className="genizio-loader__wave genizio-loader__wave--front" />
        </div>
        <img
          src="/favicon-96x96.png"
          alt=""
          className="relative z-10 h-full w-full -translate-y-px object-contain p-2 drop-shadow-sm"
          draggable={false}
        />
      </div>
      {label && <p className="text-xs font-bold text-ink/60 animate-pulse">{label}</p>}
    </div>
  );
}
