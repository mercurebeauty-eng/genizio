import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// richColors (2026-08-09) : avant, success et error étaient visuellement
// indistinguables (fond blanc forcé par les classes ci-dessous, seul l'icône
// changeait). richColors rend les toasts sémantiquement lisibles d'un coup
// d'œil — fond vert pour success, rouge pour error, ambre pour warning.
// Les classes couleur sont donc retirées ; on ne garde que l'ombre.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
