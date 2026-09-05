import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * État vide / d'erreur standardisé (audit UI V2.2) — remplace les 30+
 * variantes ad hoc (`rounded-3xl border-dashed p-12 text-center` réinventées
 * par fichier). Le contenu (boutons, liens) passe en enfants/action.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icône lucide (rendue dans la pastille ronde, comme l'existant). */
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  /** Ton : neutre (état vide) ou erreur (chargement impossible). */
  tone?: "neutral" | "error";
  /** CTA(s) : boutons passés tels quels sous la description. */
  children?: React.ReactNode;
}

const TONES = {
  neutral: "border-dashed border-ink/20 bg-white/60",
  error: "border-solid border-red-200 bg-red-50/70",
} as const;

const ICON_TONES = {
  neutral: "bg-brand/10 text-brand",
  error: "bg-red-100 text-red-600",
} as const;

const TITLE_TONES = {
  neutral: "text-ink",
  error: "text-red-800",
} as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = "neutral",
  children,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-10 sm:p-12 text-center shadow-xs space-y-4",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {Icon && (
        <div
          className={cn(
            "mx-auto grid size-14 place-items-center rounded-2xl",
            ICON_TONES[tone],
          )}
        >
          <Icon className="size-7" />
        </div>
      )}
      <h3 className={cn("font-display font-black text-xl", TITLE_TONES[tone])}>{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-ink/60 max-w-lg mx-auto leading-relaxed">{description}</p>
      )}
      {children && <div className="pt-1 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
