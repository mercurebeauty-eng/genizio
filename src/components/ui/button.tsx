import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Bouton Génizio — refondu à l'audit UI (2026-09-05).
 *
 * L'ancienne version était le shadcn stock (rounded-md, h-9, tokens
 * primary/*) : 5 consommateurs seulement, le reste de l'app (~240 boutons)
 * re-stylait tout à la main. Cette version repart de l'idiom RÉEL du code :
 * néo-brutalisme avec ombre de pression (classes .press-* de styles.css),
 * rounded-2xl, font-bold, cibles tactiles ≥ 44 px (public mobile 3G).
 *
 * Migration : remplacer un <button> inline typique —
 *   className="press-brand rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white cursor-pointer"
 * par <Button>…</Button>. Les classes supplémentaires passent par className
 * (fusion cn), les cas exotiques restent en <button> natif sans honte.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        /** CTA principal : marque + ombre de pression. */
        brand: "press-brand bg-brand text-white",
        /** Secondaire sur fond coloré : blanc + ombre de pression claire. */
        white: "press-white bg-white text-ink border border-ink/10",
        /** Tertiaire : contour discret sans ombre. */
        outline: "border border-ink/10 bg-white text-ink/70 hover:bg-surface",
        /** Danger : rouge + ombre de pression destructive. */
        danger: "bg-red-600 text-white press-destructive",
        /** Fantôme : texte seul, hover surface. */
        ghost: "text-ink/70 hover:bg-surface",
      },
      size: {
        /** Compact : actions secondaires, badges cliquables (≥ 38px). */
        sm: "min-h-[38px] px-3.5 text-xs",
        /** Standard : ≥ 44px (cible tactile Apple/Google). */
        md: "min-h-[44px] px-5 text-sm",
        /** Hero : CTA de landing / écrans de décision. */
        lg: "min-h-[52px] px-7 text-base",
        /** Icône seule (fermer…) : ≥ 44px, carré. */
        icon: "min-h-[44px] min-w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
