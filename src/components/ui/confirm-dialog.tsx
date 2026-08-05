// ConfirmDialogHost — remplace window.confirm() par une modale stylée et accessible.
// Montée une fois dans __root.tsx ; appelée n'importe où via confirmDialog(options),
// qui retourne une Promise<boolean> (comme window.confirm, mais sans bloquer le thread
// ni rompre le style neo-brutaliste de l'app).

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./alert-dialog";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" pour une action destructive (rouge), "default" sinon */
  variant?: "danger" | "default";
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

let setPending: ((p: PendingConfirm | null) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!setPending) {
      console.error("ConfirmDialogHost n'est pas monté — fallback: annulation.");
      resolve(false);
      return;
    }
    setPending({ ...options, resolve });
  });
}

export function ConfirmDialogHost() {
  const [pending, setPendingState] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    setPending = setPendingState;
    return () => {
      setPending = null;
    };
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPendingState(null);
  };

  const danger = pending?.variant === "danger";

  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <AlertDialogContent className="rounded-3xl max-w-sm border border-ink/10 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle
            className={`flex items-center gap-2 ${danger ? "text-red-600" : "text-ink"}`}
          >
            <AlertTriangle className="size-5" />
            {pending?.title}
          </AlertDialogTitle>
          {pending?.description && (
            <AlertDialogDescription className="text-ink/70">
              {pending.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel
            onClick={() => close(false)}
            className="flex-1 mt-0 rounded-xl border border-ink/10 shadow-sm"
          >
            {pending?.cancelLabel ?? "Annuler"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              close(true);
            }}
            className={`flex-1 rounded-xl border border-ink/10 shadow-sm ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-brand text-white hover:bg-brand-dark"
            }`}
          >
            {pending?.confirmLabel ?? "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
