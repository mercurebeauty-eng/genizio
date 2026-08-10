// Reframe de l'abandon (2026-08-09, demande utilisateur) : le défi non réussi
// n'est plus un bouton gris honteux mais un moment où Naya apprend — dialog à
// chips de raison en 1 tap (même vocabulaire que la suppression, Décision #58)
// + option "Sans raison". La note de journal éventuelle du parent part comme
// reason ; le chip devient not_completed_reason_chip (signal structuré pour le
// Loup et la classification).
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HeartHandshake } from "lucide-react";

export type NotCompletedPayload = { reasonChip?: string };

/** Labels partagés : dialog + bannière "Défi non réussi" de la carte. */
export const NOT_COMPLETED_CHIP_LABELS: Record<string, string> = {
  pas_le_bon_moment: "Pas le bon moment",
  deja_fait_autrement: "Déjà fait autrement",
  pas_interesse: "Pas intéressé·e",
  doublon: "Doublon",
};

const CHIPS = Object.entries(NOT_COMPLETED_CHIP_LABELS);

export function ChallengeNotCompletedDialog({
  challenge,
  open,
  submitting,
  onClose,
  onConfirm,
}: {
  challenge: { id: string; title: string } | null;
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: NotCompletedPayload) => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting) onClose();
      }}
    >
      <AlertDialogContent className="rounded-3xl max-w-sm border border-ink/10 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-ink">
            <HeartHandshake className="size-5 text-rose-500" />
            Ce défi n'a pas abouti — c'est très bien ainsi
          </AlertDialogTitle>
          <AlertDialogDescription className="text-ink/70">
            Naya en apprend autant d'un défi non terminé que d'un défi réussi. Dis-lui simplement
            pourquoi, pour qu'elle propose la suite la plus adaptée.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-2">
          <p className="text-sm font-bold text-ink">
            {challenge ? <>Pourquoi « {challenge.title} » n'a pas pu être fait ?</> : null}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CHIPS.map(([code, label]) => (
              <button
                key={code}
                onClick={() => onConfirm({ reasonChip: code })}
                disabled={submitting}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] font-bold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => onConfirm({})}
            disabled={submitting}
            className="w-full rounded-xl border border-ink/10 bg-transparent px-3 py-2.5 text-[12px] font-bold text-ink/50 hover:text-ink/80 hover:bg-surface transition-all cursor-pointer disabled:opacity-60"
          >
            Sans raison particulière
          </button>
        </div>

        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel className="flex-1 mt-0 rounded-xl border border-ink/10 shadow-sm">
            Annuler
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
