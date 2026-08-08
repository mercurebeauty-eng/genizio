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
      <div className="relative shrink-0" style={{ width: px, height: px }}>
        <div className="absolute inset-0 rounded-full border-[3px] border-ink/10 border-r-brand border-b-brand animate-[spin_3s_linear_infinite] motion-reduce:animate-none" />
        <div className="absolute inset-0 rounded-full border-[3px] border-ink/10 border-t-sky animate-[spin_2s_linear_infinite_reverse] motion-reduce:animate-none" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand/10 via-transparent to-sky/10 blur-sm animate-pulse motion-reduce:animate-none" />
        <img
          src="/favicon-96x96.png"
          alt="Logo Génizio"
          className="absolute inset-0 z-10 h-full w-full object-contain p-2 drop-shadow-sm"
          draggable={false}
        />
      </div>
      {label && <p className="text-xs font-bold text-ink/60 animate-pulse">{label}</p>}
    </div>
  );
}
